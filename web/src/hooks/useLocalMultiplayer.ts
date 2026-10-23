"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, equity, STARTING_BALANCE } from "@/lib/sim/engine";
import type { Candle, Side } from "@/lib/sim/types";
import type { DanmakuItem } from "@/components/DanmakuOverlay";
import { HOST_PEER_ID, webrtcManager, type PeerMessage } from "@/lib/p2p/webrtc-manager";
import { ReplayRecorder } from "@/lib/replay/recorder";
import { saveReplay } from "@/lib/replay/storage";
import type { ReplayEvent } from "@/lib/replay/types";
import { saveAccountGame, type AccountGameResult } from "@/lib/game/accountHistory";
import { buildMultiplayerReview, mpRoundSetup } from "@/lib/game/multiplayerRound";
import {
  SYNTHETIC,
  buildEngine,
  cachedInstrumentIds,
  loadInstrumentIndex,
  loadMarketText,
  parseMarket,
  tallyVotes,
  weightedPick,
  type InstrumentOption,
  type MarketData,
  type PickMode,
} from "@/lib/sim/marketData";
import type { ChatMessage, LeaderRow, MpPhase, MpSnapshot, SaveStatus, useMultiplayer } from "./useMultiplayer";

export type MpSession = ReturnType<typeof useMultiplayer>;

const MS_PER_TICK = 1000 / 9;
const COUNTDOWN_MS = 4000;
const ROUND_MS = 180_000;
const MAX_CATCHUP = 600;
const STATS_HZ = 3;
const ME_COLOR = "#34d399";
const PEER_PALETTE = ["#60a5fa", "#fb923c", "#e879f9", "#fbbf24", "#fb7185", "#38bdf8", "#a3e635"];
// Guests that can't confirm the market within this time start anyway and catch up.
const READY_TIMEOUT_MS = 20_000;
// Data channels reliably carry messages up to 16 KiB on every browser.
const CHUNK_CHARS = 15_000;

interface Player {
  id: string;
  name: string;
}

interface PeerStats {
  eq: number;
  ret: number;
  side: Side | null;
}

// Messages exchanged over the WebRTC data channels (PeerMessage.payload).
// Guests only talk to the host; the host relays stats/trades/chat and stamps `from`.
type LocalMsg =
  | { kind: "hello"; name: string }
  | { kind: "roster"; players: Player[]; you: string }
  | { kind: "lobby"; options: InstrumentOption[]; votes: Record<string, string>; pickMode: PickMode }
  | { kind: "vote"; id: string | null }
  | { kind: "ping"; t: number }
  | { kind: "pong"; t: number }
  | { kind: "market"; id: string; seed: number; round: number }
  | { kind: "need-market"; id: string }
  | { kind: "chunk"; id: string; i: number; n: number; s: string }
  | { kind: "ready"; id: string; seed: number }
  | { kind: "start"; id: string; seed: number; round: number; delayMs: number }
  | { kind: "rematch"; round: number }
  | { kind: "stats"; eq: number; ret: number; side: Side | null; from?: string }
  | { kind: "trade"; ev: ReplayEvent; from?: string }
  | { kind: "chat"; msg: ChatMessage; from?: string };

function send(msg: LocalMsg, to?: string) {
  const type: PeerMessage["type"] = msg.kind === "chat" ? "chat" : msg.kind === "stats" ? "game-state" : "action";
  webrtcManager.sendMessage({ type, payload: msg }, to);
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function randomId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Race over direct WebRTC data channels (no server), star topology around the
 * host. Every device runs the same seeded engine on the same market; the host
 * draws the market from the lobby votes, ships its data to guests that don't
 * have it cached, and schedules the start once everyone is ready.
 */
export function useLocalMultiplayer(name: string, isHost: boolean, initialPeerName: string): MpSession {
  const seedRef = useRef(0);
  const marketIdRef = useRef(SYNTHETIC);
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    seedRef.current = randomSeed();
    engineRef.current = buildEngine(SYNTHETIC, null, seedRef.current);
  }
  const engineReadyRef = useRef(true);
  const roundCandlesRef = useRef<Candle[]>([]);
  const roundNumberRef = useRef(0);
  const startEpochRef = useRef<number | null>(null);
  const myIdRef = useRef(isHost ? HOST_PEER_ID : "");
  const playersRef = useRef<Player[]>(
    isHost ? [] : [{ id: HOST_PEER_ID, name: initialPeerName || "Host" }],
  );
  const statsRef = useRef<Record<string, PeerStats>>({});
  const rttRef = useRef<Record<string, number>>({});
  const recorderRef = useRef<ReplayRecorder | null>(null);
  const savedRoundRef = useRef(false);
  const lastPushRef = useRef(0);
  // Host: everyone's vote, the options all devices can play, market texts by id.
  const votesRef = useRef<Record<string, string>>({});
  const optionsRef = useRef<InstrumentOption[]>([]);
  const pickModeRef = useRef<PickMode>("vote");
  const marketTextRef = useRef<Map<string, string>>(new Map());
  const pendingReadyRef = useRef<{ id: string; seed: number; waiting: Set<string>; timer: number } | null>(null);
  // Guest: chunks of the market being received.
  const chunksRef = useRef<{ id: string; parts: string[]; got: number } | null>(null);
  const preparingRef = useRef<{ id: string; seed: number; round: number } | null>(null);

  const [phase, setPhase] = useState<MpPhase>("lobby");
  const [snapshot, setSnapshot] = useState<MpSnapshot | null>(null);
  const [secondsToStart, setSecondsToStart] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_MS);
  const [roundNumber, setRoundNumber] = useState(0);
  const [players, setPlayers] = useState<Player[]>(playersRef.current);
  const [myId, setMyId] = useState(isHost ? HOST_PEER_ID : "");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [replayId, setReplayId] = useState<string | null>(null);
  const [accountResult, setAccountResult] = useState<AccountGameResult | null>(null);
  const [instruments, setInstruments] = useState<InstrumentOption[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [pickMode, setPickModeState] = useState<PickMode>("vote");
  const [selectedInstrument, setSelectedInstrument] = useState(SYNTHETIC);
  const [loadingMarket, setLoadingMarket] = useState(false);

  const colorFor = useCallback((id: string) => {
    if (id === myIdRef.current) return ME_COLOR;
    const others = playersRef.current.filter((p) => p.id !== myIdRef.current);
    const i = Math.max(0, others.findIndex((p) => p.id === id));
    return PEER_PALETTE[i % PEER_PALETTE.length];
  }, []);

  const setRoster = useCallback((list: Player[]) => {
    playersRef.current = list;
    setPlayers(list);
  }, []);

  const resetRound = useCallback((round: number) => {
    roundNumberRef.current = round;
    setRoundNumber(round);
    startEpochRef.current = null;
    recorderRef.current = null;
    savedRoundRef.current = false;
    statsRef.current = {};
    setReplayId(null);
    setAccountResult(null);
    setSaveStatus("idle");
    setPhase("lobby");
  }, []);

  /** Swap in the engine for a drawn market. */
  const installMarket = useCallback((id: string, data: MarketData | null, seed: number) => {
    seedRef.current = seed;
    marketIdRef.current = data || id === SYNTHETIC ? id : SYNTHETIC;
    engineRef.current = buildEngine(marketIdRef.current, data, seed);
    roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
    engineReadyRef.current = true;
    setSelectedInstrument(marketIdRef.current);
  }, []);

  const addChat = useCallback(
    (msg: ChatMessage) => {
      const color = colorFor(msg.userId);
      setChatMessages((prev) => [...prev.slice(-99), msg]);
      setDanmaku((prev) => [...prev, { id: msg.id, text: `${msg.name}: ${msg.text}`, top: 8 + Math.random() * 72, color }]);
      const rec = recorderRef.current;
      if (rec) rec.addEvent({ t: rec.tick, k: "chat", id: msg.userId, name: msg.name, text: msg.text });
    },
    [colorFor],
  );

  // ---- host-side state broadcasting ----
  const broadcastRoster = useCallback(() => {
    for (const p of playersRef.current) {
      if (p.id !== HOST_PEER_ID) send({ kind: "roster", players: playersRef.current, you: p.id }, p.id);
    }
  }, []);

  const broadcastLobby = useCallback((to?: string) => {
    send({ kind: "lobby", options: optionsRef.current, votes: votesRef.current, pickMode: pickModeRef.current }, to);
  }, []);

  const sendStart = useCallback((id: string, seed: number) => {
    const startAt = Date.now() + COUNTDOWN_MS;
    startEpochRef.current = startAt;
    for (const p of playersRef.current) {
      if (p.id === HOST_PEER_ID) continue;
      const rtt = rttRef.current[p.id] ?? 0;
      send({ kind: "start", id, seed, round: roundNumberRef.current, delayMs: Math.max(0, COUNTDOWN_MS - rtt / 2) }, p.id);
    }
    setLoadingMarket(false);
  }, []);

  const sendMarketChunks = useCallback((id: string, to: string) => {
    const text = marketTextRef.current.get(id);
    if (!text) return;
    const n = Math.ceil(text.length / CHUNK_CHARS);
    for (let i = 0; i < n; i++) send({ kind: "chunk", id, i, n, s: text.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS) }, to);
  }, []);

  // Host: work out which markets every device can play (index + cache when offline).
  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    (async () => {
      const list = await loadInstrumentIndex();
      const online = typeof navigator === "undefined" || navigator.onLine;
      const cached = await cachedInstrumentIds(list.map((o) => o.id));
      const playable = online && cached.size === 0 ? list : list.filter((o) => cached.has(o.id) || online);
      if (cancelled) return;
      optionsRef.current = playable;
      setInstruments(playable);
      broadcastLobby();
    })();
    return () => {
      cancelled = true;
    };
  }, [isHost, broadcastLobby]);

  // Host: keep the roster in sync with the connected links.
  useEffect(() => {
    if (!isHost) return;
    return webrtcManager.onPeersChange((peers) => {
      const prev = playersRef.current;
      const list: Player[] = [{ id: HOST_PEER_ID, name }];
      for (const p of peers) list.push({ id: p.id, name: prev.find((x) => x.id === p.id)?.name || p.username || "Spieler" });
      const gone = prev.filter((p) => !list.some((x) => x.id === p.id)).map((p) => p.id);
      for (const id of gone) {
        delete votesRef.current[id];
        pendingReadyRef.current?.waiting.delete(id);
      }
      setRoster(list);
      setVotes({ ...votesRef.current });
      broadcastRoster();
      if (gone.length) broadcastLobby();
      const pr = pendingReadyRef.current;
      if (pr && pr.waiting.size === 0) {
        window.clearTimeout(pr.timer);
        pendingReadyRef.current = null;
        sendStart(pr.id, pr.seed);
      }
    });
  }, [isHost, name, setRoster, broadcastRoster, broadcastLobby, sendStart]);

  // Guest: leaving the host link drops everyone else too.
  const [linkUp, setLinkUp] = useState(webrtcManager.isConnected());
  useEffect(() => webrtcManager.onPeersChange((peers) => setLinkUp(peers.length > 0)), []);

  // Guest: load a drawn market locally if cached, otherwise ask the host for it.
  const prepareMarket = useCallback(
    async (id: string, seed: number, round: number) => {
      preparingRef.current = { id, seed, round };
      engineReadyRef.current = false;
      setLoadingMarket(true);
      if (id === SYNTHETIC) {
        installMarket(id, null, seed);
        setLoadingMarket(false);
        send({ kind: "ready", id, seed });
        return;
      }
      const text = await loadMarketText(id, 3000);
      if (preparingRef.current?.id !== id || preparingRef.current.seed !== seed) return;
      const data = text ? parseMarket(text) : null;
      if (data) {
        installMarket(id, data, seed);
        setLoadingMarket(false);
        send({ kind: "ready", id, seed });
      } else {
        chunksRef.current = null;
        send({ kind: "need-market", id });
      }
    },
    [installMarket],
  );

  useEffect(() => {
    const offMsg = webrtcManager.onMessage((m, link) => {
      const msg = m.payload as LocalMsg;
      if (!msg || typeof msg !== "object") return;
      // Guests only hear the host; relayed messages carry the original sender.
      const from = isHost ? link : "from" in msg && msg.from ? msg.from : HOST_PEER_ID;
      switch (msg.kind) {
        case "hello":
          if (!isHost) break;
          setRoster(playersRef.current.map((p) => (p.id === link ? { ...p, name: msg.name || p.name } : p)));
          broadcastRoster();
          broadcastLobby(link);
          send({ kind: "ping", t: performance.now() }, link);
          break;
        case "roster":
          if (isHost) break;
          myIdRef.current = msg.you;
          setMyId(msg.you);
          setRoster(msg.players);
          break;
        case "lobby":
          if (isHost) break;
          optionsRef.current = msg.options;
          setInstruments(msg.options);
          votesRef.current = msg.votes;
          setVotes(msg.votes);
          pickModeRef.current = msg.pickMode;
          setPickModeState(msg.pickMode);
          break;
        case "vote":
          if (!isHost || startEpochRef.current != null) break;
          if (msg.id) votesRef.current[link] = msg.id;
          else delete votesRef.current[link];
          setVotes({ ...votesRef.current });
          broadcastLobby();
          break;
        case "ping":
          send({ kind: "pong", t: msg.t }, link);
          break;
        case "pong":
          rttRef.current[link] = Math.max(0, performance.now() - msg.t);
          break;
        case "market":
          if (isHost) break;
          resetRound(msg.round);
          void prepareMarket(msg.id, msg.seed, msg.round);
          break;
        case "need-market":
          if (isHost) sendMarketChunks(msg.id, link);
          break;
        case "chunk": {
          if (isHost) break;
          let c = chunksRef.current;
          if (!c || c.id !== msg.id || c.parts.length !== msg.n) c = chunksRef.current = { id: msg.id, parts: new Array(msg.n), got: 0 };
          if (c.parts[msg.i] == null) {
            c.parts[msg.i] = msg.s;
            c.got++;
          }
          const prep = preparingRef.current;
          if (c.got === msg.n && prep?.id === msg.id) {
            const data = parseMarket(c.parts.join(""));
            chunksRef.current = null;
            installMarket(msg.id, data, prep.seed);
            setLoadingMarket(false);
            send({ kind: "ready", id: msg.id, seed: prep.seed });
          }
          break;
        }
        case "ready": {
          const pr = pendingReadyRef.current;
          if (!isHost || !pr || pr.id !== msg.id || pr.seed !== msg.seed) break;
          pr.waiting.delete(link);
          if (pr.waiting.size === 0) {
            window.clearTimeout(pr.timer);
            pendingReadyRef.current = null;
            sendStart(pr.id, pr.seed);
          }
          break;
        }
        case "start":
          if (isHost) break;
          if (startEpochRef.current != null && seedRef.current === msg.seed && roundNumberRef.current === msg.round) break;
          const prep = preparingRef.current;
          if ((marketIdRef.current !== msg.id || seedRef.current !== msg.seed) && (prep?.id !== msg.id || prep.seed !== msg.seed)) {
            // Missed the market announcement: race on whatever loads, catching up on arrival.
            void prepareMarket(msg.id, msg.seed, msg.round);
          }
          roundNumberRef.current = msg.round;
          setRoundNumber(msg.round);
          startEpochRef.current = Date.now() + msg.delayMs;
          break;
        case "rematch":
          if (!isHost) resetRound(msg.round);
          break;
        case "stats":
          statsRef.current[from] = { eq: msg.eq, ret: msg.ret, side: msg.side };
          if (isHost) for (const p of playersRef.current) if (p.id !== link && p.id !== HOST_PEER_ID) send({ ...msg, from }, p.id);
          break;
        case "trade": {
          const rec = recorderRef.current;
          if (rec) rec.addEvent({ ...msg.ev, id: from });
          if (isHost) for (const p of playersRef.current) if (p.id !== link && p.id !== HOST_PEER_ID) send({ ...msg, from }, p.id);
          break;
        }
        case "chat":
          addChat({ ...msg.msg, userId: from });
          if (isHost) for (const p of playersRef.current) if (p.id !== link && p.id !== HOST_PEER_ID) send({ ...msg, from }, p.id);
          break;
      }
    });
    if (!isHost) send({ kind: "hello", name });
    return () => {
      offMsg();
    };
  }, [name, isHost, resetRound, addChat, setRoster, broadcastRoster, broadcastLobby, prepareMarket, sendMarketChunks, installMarket, sendStart]);

  const publishTrades = useCallback((events: ReplayEvent[]) => {
    for (const ev of events) if (ev.id === myIdRef.current) send({ kind: "trade", ev });
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const e = engineRef.current!;
      const start = startEpochRef.current;
      const now = Date.now();
      const ready = engineReadyRef.current;

      if (start != null) {
        if (now >= start) {
          const end = start + ROUND_MS;
          setTimeLeftMs(Math.max(0, end - now));
          setSecondsToStart(0);
          if (now >= end && ready) {
            setPhase("finished");
          } else if (ready) {
            setPhase("running");
            if (!recorderRef.current && !savedRoundRef.current) {
              const rec = new ReplayRecorder(e, {
                mode: "multiplayer",
                room: "LOCAL",
                roundNumber: roundNumberRef.current,
                marketId: marketIdRef.current,
                marketLabel: e.market.label,
                msPerTick: MS_PER_TICK,
                me: { id: myIdRef.current || "me", name, color: ME_COLOR },
              });
              const addPeers = () => {
                for (const p of playersRef.current) {
                  if (p.id !== myIdRef.current) rec.addParticipant({ id: p.id, name: p.name, color: colorFor(p.id), kind: "human" });
                }
              };
              addPeers();
              rec.remoteEquity = (): Record<string, number> => {
                addPeers();
                const out: Record<string, number> = {};
                for (const [id, st] of Object.entries(statsRef.current)) if (id !== myIdRef.current) out[id] = st.eq;
                return out;
              };
              recorderRef.current = rec;
            }
            const rec = recorderRef.current;
            let steps = Math.floor((Math.min(now, end) - start) / MS_PER_TICK) - e.ticks;
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

      const connected = isHost || webrtcManager.isConnected();
      const rows: LeaderRow[] = [
        { id: myIdRef.current || "me", name: `${name} (du)`, color: ME_COLOR, equity: eqMe, returnPct: retMe, side: pos?.side ?? null, isMe: true, isBot: false },
      ];
      for (const p of playersRef.current) {
        if (p.id === myIdRef.current) continue;
        const st = statsRef.current[p.id];
        rows.push({
          id: p.id,
          name: connected ? p.name : `${p.name} (getrennt)`,
          color: colorFor(p.id),
          equity: st && Number.isFinite(st.eq) ? st.eq : STARTING_BALANCE,
          returnPct: st && Number.isFinite(st.ret) ? st.ret : 0,
          side: st?.side ?? null,
          isMe: false,
          isBot: false,
        });
      }
      for (const b of e.bots) {
        const eq = equity(b, price);
        rows.push({
          id: b.id,
          name: b.name,
          color: b.color,
          equity: eq,
          returnPct: ((eq - STARTING_BALANCE) / STARTING_BALANCE) * 100,
          side: b.account.position?.side ?? null,
          isMe: false,
          isBot: true,
        });
      }
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
  }, [name, isHost, publishTrades, colorFor]);

  // Results: replay + account history when online; local play works fully offline.
  useEffect(() => {
    if (phase !== "finished" || savedRoundRef.current) return;
    const e = engineRef.current!;
    savedRoundRef.current = true;
    const rec = recorderRef.current?.finish(e) ?? null;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const price = e.market.currentPrice;
    const eqMe = equity(e.player, price);
    const peers = playersRef.current
      .filter((p) => p.id !== myIdRef.current)
      .map((p) => ({ equity: statsRef.current[p.id]?.eq ?? STARTING_BALANCE }));
    const others = [...e.bots.map((b) => ({ rating: b.rating, equity: equity(b, price) })), ...peers];
    const rows: LeaderRow[] = [
      { id: "me", name, color: ME_COLOR, equity: eqMe, returnPct: 0, side: null, isMe: true, isBot: false },
      ...others.map((o, i) => ({ id: `o${i}`, name: "", color: "", equity: o.equity, returnPct: 0, side: null, isMe: false, isBot: true })),
    ].sort((a, b) => b.equity - a.equity);
    const marketId = marketIdRef.current;
    const review = buildMultiplayerReview(e, roundCandlesRef.current, rows, "LOCAL", roundNumberRef.current, e.market.label, marketId);
    review.summary.totalPlayers = others.length + 1;
    review.summary.rank = 1 + others.filter((o) => o.equity > eqMe).length;
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
        setup: mpRoundSetup(marketId),
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

  // Host: draw the market, make sure every guest has it, then schedule the start.
  const start = useCallback(async () => {
    if (!isHost || startEpochRef.current != null || pendingReadyRef.current || loadingMarket) return;
    setLoadingMarket(true);
    const counts = tallyVotes(
      pickModeRef.current === "host" ? [votesRef.current[HOST_PEER_ID]] : Object.values(votesRef.current),
    );
    let options = optionsRef.current;
    let id = weightedPick(counts, options);
    let data: MarketData | null = null;
    // A drawn market that can't be loaded here is dropped and the draw repeated.
    for (let attempt = 0; attempt < 4 && id !== SYNTHETIC; attempt++) {
      const text = marketTextRef.current.get(id) ?? (await loadMarketText(id));
      data = text ? parseMarket(text) : null;
      if (data && text) {
        marketTextRef.current.set(id, text);
        break;
      }
      options = options.filter((o) => o.id !== id);
      delete counts[id];
      id = weightedPick(counts, options);
    }
    if (id !== SYNTHETIC && !data) id = SYNTHETIC;

    const seed = randomSeed();
    resetRound(roundNumberRef.current);
    installMarket(id, data, seed);
    const guests = playersRef.current.filter((p) => p.id !== HOST_PEER_ID).map((p) => p.id);
    if (guests.length === 0) {
      sendStart(id, seed);
      return;
    }
    const timer = window.setTimeout(() => {
      const pr = pendingReadyRef.current;
      if (!pr) return;
      pendingReadyRef.current = null;
      sendStart(pr.id, pr.seed);
    }, READY_TIMEOUT_MS);
    pendingReadyRef.current = { id, seed, waiting: new Set(guests), timer };
    for (const g of guests) send({ kind: "ping", t: performance.now() }, g);
    send({ kind: "market", id, seed, round: roundNumberRef.current });
  }, [isHost, loadingMarket, resetRound, installMarket, sendStart]);

  const rematch = useCallback(() => {
    if (!isHost) return;
    const round = roundNumberRef.current + 1;
    resetRound(round);
    send({ kind: "rematch", round });
    broadcastLobby();
  }, [isHost, resetRound, broadcastLobby]);

  const vote = useCallback(
    (id: string) => {
      if (startEpochRef.current != null) return;
      const me = myIdRef.current || HOST_PEER_ID;
      const next = votesRef.current[me] === id ? null : id;
      if (isHost) {
        if (next) votesRef.current[me] = next;
        else delete votesRef.current[me];
        setVotes({ ...votesRef.current });
        broadcastLobby();
      } else {
        // Optimistic; the host's lobby broadcast is authoritative.
        const v = { ...votesRef.current };
        if (next) v[me] = next;
        else delete v[me];
        votesRef.current = v;
        setVotes(v);
        send({ kind: "vote", id: next });
      }
    },
    [isHost, broadcastLobby],
  );

  const setPickMode = useCallback(
    (mode: PickMode) => {
      if (!isHost) return;
      pickModeRef.current = mode;
      setPickModeState(mode);
      broadcastLobby();
    },
    [isHost, broadcastLobby],
  );

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const msg: ChatMessage = { id: randomId(), userId: myIdRef.current || "me", name, text: trimmed.slice(0, 120), at: Date.now() };
      send({ kind: "chat", msg });
      addChat(msg);
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

  const humans = isHost ? players.length || 1 : linkUp ? Math.max(players.length, 2) : 1;
  const myVote = votes[myId || HOST_PEER_ID] ?? null;
  const voteCounts = tallyVotes(pickMode === "host" ? [votes[HOST_PEER_ID]] : Object.values(votes));
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
    spectators: [],
    isHost,
    role: "player",
    isSpectator: false,
    start: () => void start(),
    rematch,
    controls: {
      long: tradeAction((e) => e.playerLong()),
      short: tradeAction((e) => e.playerShort()),
      close: tradeAction((e) => e.playerClose()),
    },
    instruments,
    selectedInstrument,
    setInstrument: () => {},
    instrumentLoading: loadingMarket,
    myVote,
    voteCounts,
    vote,
    pickMode,
    setPickMode,
    chatMessages,
    danmaku,
    sendChat,
    saveStatus,
    replayId,
    accountResult,
  };
}
