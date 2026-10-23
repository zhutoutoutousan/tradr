"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, equity, STARTING_BALANCE } from "@/lib/sim/engine";
import { Market, DEFAULT_MARKET } from "@/lib/sim/market";
import type { Candle, Side } from "@/lib/sim/types";
import type { DanmakuItem } from "@/components/DanmakuOverlay";
import { webrtcManager, type PeerMessage } from "@/lib/p2p/webrtc-manager";
import { ReplayRecorder } from "@/lib/replay/recorder";
import { saveReplay } from "@/lib/replay/storage";
import type { ReplayEvent } from "@/lib/replay/types";
import { saveAccountGame, type AccountGameResult } from "@/lib/game/accountHistory";
import { buildMultiplayerReview, mpRoundSetup } from "@/lib/game/multiplayerRound";
import type { ChatMessage, InstrumentOption, LeaderRow, MpPhase, MpSnapshot, SaveStatus, useMultiplayer } from "./useMultiplayer";

export type MpSession = ReturnType<typeof useMultiplayer>;

const MS_PER_TICK = 1000 / 9;
const COUNTDOWN_MS = 4000;
const ROUND_MS = 180_000;
const MAX_CATCHUP = 600;
const STATS_HZ = 3;
const ME_COLOR = "#34d399";
const PEER_COLOR = "#60a5fa";
const PEER_ID = "peer";
const NO_INSTRUMENTS: InstrumentOption[] = [];

// Messages exchanged over the WebRTC data channel (PeerMessage.payload).
type LocalMsg =
  | { kind: "hello"; name: string; reply?: boolean }
  | { kind: "ping"; t: number }
  | { kind: "pong"; t: number }
  | { kind: "start"; seed: number; round: number; delayMs: number }
  | { kind: "rematch"; round: number }
  | { kind: "stats"; eq: number; ret: number; side: Side | null }
  | { kind: "trade"; ev: ReplayEvent }
  | { kind: "chat"; msg: ChatMessage };

function send(msg: LocalMsg) {
  if (!webrtcManager.isConnected()) return;
  const type: PeerMessage["type"] = msg.kind === "chat" ? "chat" : msg.kind === "stats" ? "game-state" : "action";
  webrtcManager.sendMessage({ type, payload: msg });
}

function buildEngine(seed: number): GameEngine {
  return new GameEngine(new Market({ ...DEFAULT_MARKET, seed }));
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function randomId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Two-player race over a direct WebRTC data channel (no server). Both devices
 * run the same seeded engine; the host picks the seed and start time, and live
 * equity, trades and chat travel over the channel.
 */
export function useLocalMultiplayer(name: string, isHost: boolean, initialPeerName: string): MpSession {
  const seedRef = useRef(0);
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    seedRef.current = randomSeed();
    engineRef.current = buildEngine(seedRef.current);
  }
  const roundCandlesRef = useRef<Candle[]>([]);
  const roundNumberRef = useRef(0);
  const startEpochRef = useRef<number | null>(null);
  const rttRef = useRef(0);
  const peerStatsRef = useRef<{ eq: number; ret: number; side: Side | null } | null>(null);
  const peerNameRef = useRef(initialPeerName || "Mitspieler");
  const recorderRef = useRef<ReplayRecorder | null>(null);
  const savedRoundRef = useRef(false);
  const lastPushRef = useRef(0);

  const [phase, setPhase] = useState<MpPhase>("lobby");
  const [snapshot, setSnapshot] = useState<MpSnapshot | null>(null);
  const [secondsToStart, setSecondsToStart] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_MS);
  const [roundNumber, setRoundNumber] = useState(0);
  const [peerPresent, setPeerPresent] = useState(webrtcManager.isConnected());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [replayId, setReplayId] = useState<string | null>(null);
  const [accountResult, setAccountResult] = useState<AccountGameResult | null>(null);

  const resetRound = useCallback((seed: number, round: number) => {
    seedRef.current = seed;
    roundNumberRef.current = round;
    setRoundNumber(round);
    engineRef.current = buildEngine(seed);
    roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
    startEpochRef.current = null;
    recorderRef.current = null;
    savedRoundRef.current = false;
    peerStatsRef.current = null;
    setReplayId(null);
    setAccountResult(null);
    setSaveStatus("idle");
    setPhase("lobby");
  }, []);

  const addChat = useCallback((msg: ChatMessage, color: string) => {
    setChatMessages((prev) => [...prev.slice(-99), msg]);
    setDanmaku((prev) => [...prev, { id: msg.id, text: `${msg.name}: ${msg.text}`, top: 8 + Math.random() * 72, color }]);
    const rec = recorderRef.current;
    if (rec) rec.addEvent({ t: rec.tick, k: "chat", id: msg.userId === "me" ? "me" : PEER_ID, name: msg.name, text: msg.text });
  }, []);

  useEffect(() => {
    const offState = webrtcManager.onStateChange((s) => setPeerPresent(s === "connected"));
    const offMsg = webrtcManager.onMessage((m) => {
      const msg = m.payload as LocalMsg;
      if (!msg || typeof msg !== "object") return;
      switch (msg.kind) {
        case "hello":
          peerNameRef.current = msg.name || peerNameRef.current;
          if (!msg.reply) send({ kind: "hello", name, reply: true });
          if (isHost) {
            send({ kind: "ping", t: performance.now() });
            // The guest's game screen mounted after the race was scheduled: resend the start.
            const startAt = startEpochRef.current;
            if (startAt != null) {
              send({ kind: "start", seed: seedRef.current, round: roundNumberRef.current, delayMs: startAt - Date.now() - rttRef.current / 2 });
            }
          }
          break;
        case "ping":
          send({ kind: "pong", t: msg.t });
          break;
        case "pong":
          rttRef.current = Math.max(0, performance.now() - msg.t);
          break;
        case "start":
          if (isHost) break;
          if (startEpochRef.current != null && seedRef.current === msg.seed && roundNumberRef.current === msg.round) break;
          resetRound(msg.seed, msg.round);
          startEpochRef.current = Date.now() + msg.delayMs;
          break;
        case "rematch":
          if (!isHost) resetRound(seedRef.current, msg.round);
          break;
        case "stats":
          peerStatsRef.current = { eq: msg.eq, ret: msg.ret, side: msg.side };
          break;
        case "trade": {
          const rec = recorderRef.current;
          if (rec) rec.addEvent({ ...msg.ev, id: PEER_ID });
          break;
        }
        case "chat":
          addChat({ ...msg.msg, userId: PEER_ID }, PEER_COLOR);
          break;
      }
    });
    send({ kind: "hello", name });
    return () => {
      offState();
      offMsg();
    };
  }, [name, isHost, resetRound, addChat]);

  const publishTrades = useCallback((events: ReplayEvent[]) => {
    for (const ev of events) if (ev.id === "me") send({ kind: "trade", ev });
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const e = engineRef.current!;
      const start = startEpochRef.current;
      const now = Date.now();

      if (start != null) {
        if (now >= start) {
          const end = start + ROUND_MS;
          setTimeLeftMs(Math.max(0, end - now));
          setSecondsToStart(0);
          if (now >= end) {
            setPhase("finished");
          } else {
            setPhase("running");
            if (!recorderRef.current && !savedRoundRef.current) {
              const rec = new ReplayRecorder(e, {
                mode: "multiplayer",
                room: "LOCAL",
                roundNumber: roundNumberRef.current,
                marketId: "synthetic",
                marketLabel: e.market.label,
                msPerTick: MS_PER_TICK,
                me: { id: "me", name, color: ME_COLOR },
              });
              rec.addParticipant({ id: PEER_ID, name: peerNameRef.current, color: PEER_COLOR, kind: "human" });
              rec.remoteEquity = (): Record<string, number> =>
                peerStatsRef.current ? { [PEER_ID]: peerStatsRef.current.eq } : {};
              recorderRef.current = rec;
            }
            const rec = recorderRef.current;
            let steps = Math.floor((now - start) / MS_PER_TICK) - e.ticks;
            if (steps > MAX_CATCHUP) steps = MAX_CATCHUP;
            for (let i = 0; i < steps; i++) {
              const prevBar = e.market.bar;
              e.step();
              if (rec) publishTrades(rec.afterStep(e));
              if (e.market.bar > prevBar) {
                const closed = e.market.candles[e.market.candles.length - 1];
                const last = roundCandlesRef.current[roundCandlesRef.current.length - 1];
                if (closed && (!last || last.time !== closed.time)) roundCandlesRef.current.push({ ...closed });
              }
            }
          }
        } else {
          setPhase("countdown");
          setSecondsToStart(Math.ceil((start - now) / 1000));
          setTimeLeftMs(ROUND_MS);
        }
      }

      const price = e.market.currentPrice;
      const eqMe = equity(e.player, price);
      const retMe = ((eqMe - STARTING_BALANCE) / STARTING_BALANCE) * 100;
      const pos = e.player.account.position;
      if (now - lastPushRef.current > 1000 / STATS_HZ) {
        lastPushRef.current = now;
        send({ kind: "stats", eq: eqMe, ret: retMe, side: pos?.side ?? null });
      }

      const peer = peerStatsRef.current;
      const rows: LeaderRow[] = [
        { id: "me", name: `${name} (du)`, color: ME_COLOR, equity: eqMe, returnPct: retMe, side: pos?.side ?? null, isMe: true, isBot: false },
        {
          id: PEER_ID,
          name: webrtcManager.isConnected() ? peerNameRef.current : `${peerNameRef.current} (getrennt)`,
          color: PEER_COLOR,
          equity: peer && Number.isFinite(peer.eq) ? peer.eq : STARTING_BALANCE,
          returnPct: peer && Number.isFinite(peer.ret) ? peer.ret : 0,
          side: peer?.side ?? null,
          isMe: false,
          isBot: false,
        },
        ...e.bots.map((b) => {
          const eq = equity(b, price);
          return {
            id: b.id,
            name: b.name,
            color: b.color,
            equity: eq,
            returnPct: ((eq - STARTING_BALANCE) / STARTING_BALANCE) * 100,
            side: b.account.position?.side ?? null,
            isMe: false,
            isBot: true,
          };
        }),
      ];
      rows.sort((a, b) => b.equity - a.equity);

      setSnapshot({
        candles: e.market.view(),
        price,
        bar: e.market.bar,
        label: e.market.label,
        me: {
          equity: eqMe,
          balance: e.player.account.balance,
          returnPct: retMe,
          unrealized: eqMe - e.player.account.balance,
          position: pos ? { side: pos.side, entry: pos.entry } : null,
          trades: e.player.account.closed.length,
        },
        leaderboard: rows,
        botPositions: e.bots
          .filter((b) => b.account.position)
          .map((b) => ({ label: b.name.split(" ")[0], color: b.color, side: b.account.position!.side, entry: b.account.position!.entry })),
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [name, publishTrades]);

  // Results: replay + account history when online; local play works fully offline.
  useEffect(() => {
    if (phase !== "finished" || savedRoundRef.current) return;
    const e = engineRef.current!;
    savedRoundRef.current = true;
    const rec = recorderRef.current?.finish(e) ?? null;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const price = e.market.currentPrice;
    const eqMe = equity(e.player, price);
    const peerEq = peerStatsRef.current?.eq ?? STARTING_BALANCE;
    const others = [...e.bots.map((b) => ({ rating: b.rating, equity: equity(b, price) })), { equity: peerEq }];
    const rows: LeaderRow[] = [
      { id: "me", name, color: ME_COLOR, equity: eqMe, returnPct: 0, side: null, isMe: true, isBot: false },
      ...others.map((o, i) => ({ id: `o${i}`, name: "", color: "", equity: o.equity, returnPct: 0, side: null, isMe: false, isBot: true })),
    ].sort((a, b) => b.equity - a.equity);
    const review = buildMultiplayerReview(e, roundCandlesRef.current, rows, "LOCAL", roundNumberRef.current, e.market.label, "synthetic");
    const id = `lmp-${seedRef.current.toString(36)}-r${roundNumberRef.current}`;

    setSaveStatus("saving");
    const replaySaved = rec
      ? saveReplay(id, rec)
          .then(() => {
            setReplayId(id);
            return id;
          })
          .catch(() => null)
      : Promise.resolve(null);
    // A tether without internet can report onLine and then hang on fetch.
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000));
    const saved = replaySaved.then((rid) =>
      saveAccountGame({
        mode: "multiplayer",
        review,
        setup: mpRoundSetup("synthetic"),
        finalBalance: eqMe,
        opponents: others,
        myEquity: eqMe,
        replayId: rid,
      }),
    );
    Promise.race([saved, timeout])
      .then((res) => {
        if (res) setAccountResult(res);
        setSaveStatus("saved");
      })
      .catch(() => setSaveStatus("error"));
  }, [phase, name]);

  const start = useCallback(() => {
    if (!isHost || startEpochRef.current != null) return;
    const seed = randomSeed();
    resetRound(seed, roundNumberRef.current);
    // The guest receives this ~half a round trip later, so it starts that much less in the future.
    send({ kind: "start", seed, round: roundNumberRef.current, delayMs: Math.max(0, COUNTDOWN_MS - rttRef.current / 2) });
    startEpochRef.current = Date.now() + COUNTDOWN_MS;
  }, [isHost, resetRound]);

  const rematch = useCallback(() => {
    if (!isHost) return;
    const round = roundNumberRef.current + 1;
    resetRound(seedRef.current, round);
    send({ kind: "rematch", round });
  }, [isHost, resetRound]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const msg: ChatMessage = { id: randomId(), userId: "me", name, text: trimmed.slice(0, 120), at: Date.now() };
      send({ kind: "chat", msg });
      addChat(msg, ME_COLOR);
    },
    [name, addChat],
  );

  const tradeAction = (fn: (e: GameEngine) => void) => () => {
    if (phase !== "running") return;
    const e = engineRef.current!;
    fn(e);
    const rec = recorderRef.current;
    if (rec) publishTrades(rec.syncPositions(e));
  };

  const humans = peerPresent ? 2 : 1;
  return {
    phase,
    snapshot,
    secondsToStart,
    timeLeftMs,
    roundMs: ROUND_MS,
    roundNumber,
    playerCount: humans,
    traderCount: humans,
    spectatorCount: 0,
    isHost,
    role: "player",
    isSpectator: false,
    start,
    rematch,
    controls: {
      long: tradeAction((e) => e.playerLong()),
      short: tradeAction((e) => e.playerShort()),
      close: tradeAction((e) => e.playerClose()),
    },
    instruments: NO_INSTRUMENTS,
    selectedInstrument: "synthetic",
    setInstrument: () => {},
    instrumentLoading: false,
    chatMessages,
    danmaku,
    sendChat,
    saveStatus,
    replayId,
    accountResult,
  };
}
