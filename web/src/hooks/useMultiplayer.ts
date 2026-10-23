"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { GameEngine, equity, STARTING_BALANCE } from "@/lib/sim/engine";
import { Market, DEFAULT_MARKET } from "@/lib/sim/market";
import { HistoricalMarket } from "@/lib/sim/historical";
import { supabase, supabaseEnabled } from "@/lib/supabase";
import type { Candle, Side } from "@/lib/sim/types";
import type { DanmakuItem } from "@/components/DanmakuOverlay";
import { buildMultiplayerReview, mpRoundSetup, saveMultiplayerRound } from "@/lib/game/multiplayerRound";
import {
  heartbeatActiveRoom,
  ROOM_HEARTBEAT_MS,
} from "@/lib/multiplayer/roomDirectory";
import { type MpRole } from "@/lib/multiplayer/lobby";
import { ReplayRecorder } from "@/lib/replay/recorder";
import { saveReplay } from "@/lib/replay/storage";
import type { ReplayEvent } from "@/lib/replay/types";
import { saveAccountGame, type AccountGameResult } from "@/lib/game/accountHistory";

const MS_PER_TICK = 1000 / 9; // must match the synthetic feed's intended speed
const COUNTDOWN_MS = 4000;
const ROUND_MS = 180_000; // 3-minute race, wall-clock synced from startEpoch
const MAX_CATCHUP = 600;
const STATS_HZ = 3;
const SYNTHETIC = "synthetic";

const REMOTE_PALETTE = ["#60a5fa", "#fb923c", "#e879f9", "#4ade80", "#fbbf24", "#fb7185", "#38bdf8"];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function colorForId(id: string): number {
  return hashSeed(id) % REMOTE_PALETTE.length;
}

export type MpPhase = "disabled" | "connecting" | "lobby" | "countdown" | "running" | "finished";
export type { MpRole } from "@/lib/multiplayer/lobby";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: number;
}

interface TradeBroadcast {
  id: string;
  name: string;
  ev: ReplayEvent;
}

export function multiplayerReplayId(room: string, roundNumber: number, startEpoch: number): string {
  return `mp-${room}-r${roundNumber}-${startEpoch}`;
}

export interface InstrumentOption {
  id: string;
  name: string;
  kind: string;
}

export interface LeaderRow {
  id: string;
  name: string;
  color: string;
  equity: number;
  returnPct: number;
  side: Side | null;
  isMe: boolean;
  isBot: boolean;
}

export interface MpSnapshot {
  candles: Candle[];
  price: number;
  bar: number;
  label: string;
  me: {
    equity: number;
    balance: number;
    returnPct: number;
    unrealized: number;
    position: { side: Side; entry: number } | null;
    trades: number;
  };
  leaderboard: LeaderRow[];
  botPositions: { label: string; color: string; side: Side; entry: number }[];
}

// Presence carries only stable membership data. It is tracked once on join and
// re-tracked ONLY when one of these slow-changing fields changes. High-frequency
// re-tracking destabilizes Supabase presence (other clients drop the member), so
// live equity is sent over broadcast instead (see LiveStats).
interface PresenceMeta {
  name: string;
  joinedAt: number;
  startEpoch: number | null;
  instrument: string;
  instrumentVersion: number;
  role: MpRole;
  roundNumber: number;
}

interface LiveStats {
  id: string;
  eq: number;
  ret: number;
  side: Side | null;
}

// Build a deterministic engine for the given instrument. Synthetic uses the room
// seed; real markets replay the exact same candle file on every client, so the
// race stays perfectly in sync.
function roomSeed(room: string, roundNumber: number): number {
  return hashSeed(roundNumber > 0 ? `${room}:${roundNumber}` : room);
}

function buildSyntheticEngine(room: string, roundNumber = 0): GameEngine {
  return new GameEngine(new Market({ ...DEFAULT_MARKET, seed: roomSeed(room, roundNumber) }));
}

export function useMultiplayer(room: string, name: string, role: MpRole = "player") {
  const engineRef = useRef<GameEngine | null>(null);
  const roundNumberRef = useRef(0);
  const roundCandlesRef = useRef<Candle[]>([]);
  const savedRoundRef = useRef(false);
  const roleRef = useRef<MpRole>(role);
  const recorderRef = useRef<ReplayRecorder | null>(null);

  if (!engineRef.current) {
    engineRef.current = buildSyntheticEngine(room, 0);
    roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
  }
  roleRef.current = role;

  const myIdRef = useRef<string>("");
  if (!myIdRef.current) {
    myIdRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }
  const joinedAtRef = useRef<number>(Date.now());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const startEpochRef = useRef<number | null>(null);
  const lastPushRef = useRef<number>(0);
  const presenceRef = useRef<Record<string, PresenceMeta>>({});
  const statsRef = useRef<Record<string, LiveStats>>({});
  const instrumentRef = useRef<string>(SYNTHETIC);
  const instrumentVersionRef = useRef<number>(0);
  const engineReadyRef = useRef<boolean>(true);
  const applyInstrumentRef = useRef<(id: string, version: number) => void>(() => {});

  const [phase, setPhase] = useState<MpPhase>(supabaseEnabled ? "connecting" : "disabled");
  const [snapshot, setSnapshot] = useState<MpSnapshot | null>(null);
  const [secondsToStart, setSecondsToStart] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_MS);
  const [playerCount, setPlayerCount] = useState(1);
  const [isHost, setIsHost] = useState(false);
  const [instruments, setInstruments] = useState<InstrumentOption[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(SYNTHETIC);
  const [instrumentLoading, setInstrumentLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [traderCount, setTraderCount] = useState(1);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [roundNumber, setRoundNumber] = useState(0);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [accountResult, setAccountResult] = useState<AccountGameResult | null>(null);

  // Load the catalogue of real markets once.
  useEffect(() => {
    fetch("/data/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: InstrumentOption[]) => setInstruments(list))
      .catch(() => setInstruments([]));
  }, []);

  // Track stable membership info. Called sparingly (join / start / instrument
  // change) — never on a tight interval.
  const pushPresence = useCallback(
    (partial: Partial<PresenceMeta> = {}) => {
      const ch = channelRef.current;
      if (!ch) return;
      const meta: PresenceMeta = {
        name,
        joinedAt: joinedAtRef.current,
        startEpoch: startEpochRef.current,
        instrument: instrumentRef.current,
        instrumentVersion: instrumentVersionRef.current,
        role: roleRef.current,
        roundNumber: roundNumberRef.current,
        ...partial,
      };
      ch.track(meta);
    },
    [name],
  );

  // Swap the active engine to a new instrument. Real markets are fetched async;
  // the engine is only swapped in once its candles are ready so the sim never
  // runs on a half-loaded feed.
  const applyInstrument = useCallback(
    (id: string, version: number) => {
      instrumentVersionRef.current = Math.max(instrumentVersionRef.current, version);
      if (id === instrumentRef.current && engineReadyRef.current) return;
      instrumentRef.current = id;
      setSelectedInstrument(id);

      if (id === SYNTHETIC) {
        engineRef.current = buildSyntheticEngine(room, roundNumberRef.current);
        roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
        engineReadyRef.current = true;
        setInstrumentLoading(false);
        return;
      }

      engineReadyRef.current = false;
      setInstrumentLoading(true);
      const reqId = id;
      fetch(`/data/${id}.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`failed to load ${id}`);
          return r.json();
        })
        .then((d: { name: string; candles: Candle[] }) => {
          if (instrumentRef.current !== reqId) return; // a newer selection won
          engineRef.current = new GameEngine(
            new HistoricalMarket(d.candles, d.name, undefined, roomSeed(room, roundNumberRef.current)),
          );
          roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
          engineReadyRef.current = true;
          setInstrumentLoading(false);
        })
        .catch(() => {
          if (instrumentRef.current !== reqId) return;
          instrumentRef.current = SYNTHETIC;
          setSelectedInstrument(SYNTHETIC);
          engineRef.current = buildSyntheticEngine(room, roundNumberRef.current);
          roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
          engineReadyRef.current = true;
          setInstrumentLoading(false);
        });
    },
    [room],
  );
  applyInstrumentRef.current = applyInstrument;

  const publishActiveRoom = useCallback(() => {
    const flat = presenceRef.current;
    let traders = 0;
    let spectators = 0;
    for (const meta of Object.values(flat)) {
      if (meta?.role === "spectator") spectators += 1;
      else traders += 1;
    }
    if (traders === 0 && roleRef.current !== "spectator") traders = 1;
    if (traders < 1) return;
    void heartbeatActiveRoom(room, traders, spectators);
  }, [room]);

  // Connect to the realtime room.
  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setPhase("disabled");
      return;
    }
    const sb = supabase;
    const ch = sb.channel(`tradr-room:${room}`, {
      config: { presence: { key: myIdRef.current } },
    });
    channelRef.current = ch;

    // Live equity / position of every player — high frequency, ephemeral.
    ch.on("broadcast", { event: "stats" }, ({ payload }) => {
      const p = payload as LiveStats;
      if (p && p.id) statsRef.current[p.id] = p;
    });

    ch.on("broadcast", { event: "chat" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      if (!msg?.id || !msg.text) return;
      const rec = recorderRef.current;
      if (rec) rec.addEvent({ t: rec.tick, k: "chat", id: msg.userId, name: msg.name, text: msg.text });
      setChatMessages((prev) => [...prev.slice(-99), msg]);
      setDanmaku((prev) => [
        ...prev,
        {
          id: msg.id,
          text: `${msg.name}: ${msg.text}`,
          top: 8 + Math.random() * 72,
          color: REMOTE_PALETTE[colorForId(msg.userId)],
        },
      ]);
    });

    ch.on("broadcast", { event: "trade" }, ({ payload }) => {
      const p = payload as TradeBroadcast;
      const rec = recorderRef.current;
      if (!rec || !p?.id || !p.ev || p.id === myIdRef.current) return;
      rec.addParticipant({ id: p.id, name: p.name || "Trader", color: REMOTE_PALETTE[colorForId(p.id)], kind: "human" });
      rec.addEvent({ ...p.ev, id: p.id });
    });

    ch.on("broadcast", { event: "control" }, ({ payload }) => {
      const p = payload as {
        instrument?: string;
        instrumentVersion?: number;
        startEpoch?: number | null;
        rematch?: boolean;
        roundNumber?: number;
      };
      if (p?.rematch) {
        const rn = p.roundNumber ?? roundNumberRef.current + 1;
        roundNumberRef.current = rn;
        setRoundNumber(rn);
        startEpochRef.current = null;
        savedRoundRef.current = false;
        recorderRef.current = null;
        setReplayId(null);
        setAccountResult(null);
        setSaveStatus("idle");
        roundCandlesRef.current = [];
        if (instrumentRef.current === SYNTHETIC) {
          engineRef.current = buildSyntheticEngine(room, rn);
          roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
        } else {
          applyInstrumentRef.current(instrumentRef.current, instrumentVersionRef.current);
        }
        setPhase("lobby");
        pushPresence({ startEpoch: null, roundNumber: rn });
        return;
      }
      if (p?.instrument && (p.instrumentVersion ?? 0) > instrumentVersionRef.current) {
        applyInstrumentRef.current(p.instrument, p.instrumentVersion ?? 0);
      }
      if (p?.startEpoch != null && startEpochRef.current == null) {
        startEpochRef.current = p.startEpoch;
        pushPresence({ startEpoch: p.startEpoch });
      }
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PresenceMeta>();
      const flat: Record<string, PresenceMeta> = {};
      let minStart: number | null = null;
      for (const key of Object.keys(state)) {
        const meta = state[key][0];
        if (!meta) continue;
        flat[key] = meta;
        if (meta.startEpoch != null) minStart = minStart == null ? meta.startEpoch : Math.min(minStart, meta.startEpoch);
      }
      presenceRef.current = flat;
      // Drop live stats for players who have left.
      for (const id of Object.keys(statsRef.current)) {
        if (!flat[id]) delete statsRef.current[id];
      }
      const ids = Object.keys(flat);
      setPlayerCount(ids.length || 1);
      setTraderCount(ids.filter((id) => (flat[id]?.role ?? "player") === "player").length || 1);
      setSpectatorCount(ids.filter((id) => flat[id]?.role === "spectator").length);

      // Host = earliest joiner (ties broken by id) and is the source of truth
      // for the chosen instrument.
      let hostId = myIdRef.current;
      let best = flat[hostId]?.joinedAt ?? joinedAtRef.current;
      for (const k of Object.keys(flat)) {
        const j = flat[k].joinedAt;
        if (j < best || (j === best && k < hostId)) {
          best = j;
          hostId = k;
        }
      }
      setIsHost(hostId === myIdRef.current);

      // Adopt the instrument with the newest version anywhere in the room. This
      // is independent of "host" detection, so a pick is never reverted by a
      // member who still carries the default synthetic choice.
      let bestInst = instrumentRef.current;
      let bestVer = instrumentVersionRef.current;
      for (const k of Object.keys(flat)) {
        const fv = flat[k].instrumentVersion ?? 0;
        if (fv > bestVer) {
          bestVer = fv;
          bestInst = flat[k].instrument;
        }
      }
      let changed = bestInst && bestInst !== instrumentRef.current && bestVer > instrumentVersionRef.current;

      // Fallback: if version logic didn't move us off the default synthetic but a
      // peer is clearly on a real market (e.g. a client without version info),
      // follow it. Only while WE are still on the default, so an explicit local
      // pick is never overridden.
      if (!changed && instrumentRef.current === SYNTHETIC) {
        for (const k of Object.keys(flat)) {
          const fi = flat[k].instrument;
          if (fi && fi !== SYNTHETIC) {
            bestInst = fi;
            bestVer = Math.max(instrumentVersionRef.current, flat[k].instrumentVersion ?? 0) || 1;
            changed = true;
            break;
          }
        }
      }

      if (changed && bestInst) {
        applyInstrumentRef.current(bestInst, bestVer);
        pushPresence({ instrument: bestInst, instrumentVersion: bestVer });
      }

      // Adopt the earliest proposed start time.
      if (minStart != null && startEpochRef.current == null) {
        startEpochRef.current = minStart;
        pushPresence({ startEpoch: minStart });
      }
      publishActiveRoom();
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        pushPresence();
        publishActiveRoom();
        setPhase((p) => (p === "connecting" ? "lobby" : p));
      }
    });

    const heartbeat = window.setInterval(publishActiveRoom, ROOM_HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      channelRef.current = null;
      sb.removeChannel(ch);
    };
  }, [publishActiveRoom, room, pushPresence]);

  const publishTrades = useCallback(
    (events: ReplayEvent[]) => {
      const ch = channelRef.current;
      if (!ch || roleRef.current !== "player") return;
      for (const ev of events) {
        if (ev.id !== myIdRef.current) continue;
        ch.send({ type: "broadcast", event: "trade", payload: { id: myIdRef.current, name, ev } as TradeBroadcast });
      }
    },
    [name],
  );

  const startRecorder = useCallback(
    (e: GameEngine) => {
      const rec = new ReplayRecorder(e, {
        mode: "multiplayer",
        room,
        roundNumber: roundNumberRef.current,
        marketId: instrumentRef.current,
        marketLabel: e.market.label,
        msPerTick: MS_PER_TICK,
        me: roleRef.current === "player" ? { id: myIdRef.current, name, color: "#34d399" } : null,
      });
      const addHumans = () => {
        for (const [id, m] of Object.entries(presenceRef.current)) {
          if (id === myIdRef.current || m?.role === "spectator") continue;
          rec.addParticipant({ id, name: m?.name ?? "Trader", color: REMOTE_PALETTE[colorForId(id)], kind: "human" });
        }
      };
      addHumans();
      rec.remoteEquity = () => {
        addHumans();
        const out: Record<string, number> = {};
        for (const [id, st] of Object.entries(statsRef.current)) {
          if (id !== myIdRef.current && presenceRef.current[id]) out[id] = st.eq;
        }
        return out;
      };
      return rec;
    },
    [name, room],
  );

  // Game loop: deterministic, wall-clock synchronized across all clients.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const e = engineRef.current;
      if (!e || !engineReadyRef.current) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const start = startEpochRef.current;
      const now = Date.now();

      if (start != null) {
        if (now >= start) {
          const end = start + ROUND_MS;
          const left = Math.max(0, end - now);
          setTimeLeftMs(left);
          setSecondsToStart(0);

          if (now >= end) {
            setPhase((p) => (p === "finished" ? p : "finished"));
          } else {
            setPhase((p) => (p === "finished" ? p : "running"));
            const target = Math.floor((now - start) / MS_PER_TICK);
            let steps = target - e.ticks;
            if (steps > MAX_CATCHUP) steps = MAX_CATCHUP;
            if (!recorderRef.current && !savedRoundRef.current) recorderRef.current = startRecorder(e);
            const rec = recorderRef.current;
            for (let i = 0; i < steps; i++) {
              const prevBar = e.market.bar;
              e.step();
              if (rec) publishTrades(rec.afterStep(e));
              if (e.market.bar > prevBar) {
                const closed = e.market.candles[e.market.candles.length - 1];
                if (closed) {
                  const last = roundCandlesRef.current[roundCandlesRef.current.length - 1];
                  if (!last || last.time !== closed.time) {
                    roundCandlesRef.current.push({ ...closed });
                  }
                }
              }
            }
          }
        } else {
          setPhase("countdown");
          setSecondsToStart(Math.ceil((start - now) / 1000));
          setTimeLeftMs(ROUND_MS);
        }
      }

      // Build the render snapshot.
      const price = e.market.currentPrice;
      const eqMe = equity(e.player, price);
      const pos = e.player.account.position;
      const retMe = ((eqMe - STARTING_BALANCE) / STARTING_BALANCE) * 100;

      if (channelRef.current && roleRef.current === "player" && now - lastPushRef.current > 1000 / STATS_HZ) {
        lastPushRef.current = now;
        channelRef.current.send({
          type: "broadcast",
          event: "stats",
          payload: { id: myIdRef.current, eq: eqMe, ret: retMe, side: pos?.side ?? null } as LiveStats,
        });
      }

      const rows: LeaderRow[] = [];
      if (roleRef.current === "player") {
        rows.push({
          id: myIdRef.current,
          name: `${name} (you)`,
          color: "#34d399",
          equity: eqMe,
          returnPct: retMe,
          side: pos?.side ?? null,
          isMe: true,
          isBot: false,
        });
      }
      for (const id of Object.keys(presenceRef.current)) {
        if (id === myIdRef.current) continue;
        const m = presenceRef.current[id];
        if (m.role === "spectator") continue;
        const s = statsRef.current[id];
        rows.push({
          id,
          name: m.name ?? "Trader",
          color: REMOTE_PALETTE[colorForId(id)],
          equity: s && Number.isFinite(s.eq) ? s.eq : STARTING_BALANCE,
          returnPct: s && Number.isFinite(s.ret) ? s.ret : 0,
          side: s ? s.side : null,
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
          returnPct: ((eqMe - STARTING_BALANCE) / STARTING_BALANCE) * 100,
          unrealized: eqMe - e.player.account.balance,
          position: pos ? { side: pos.side, entry: pos.entry } : null,
          trades: e.player.account.closed.length,
        },
        leaderboard: rows,
        botPositions: e.bots
          .filter((b) => b.account.position)
          .map((b) => ({
            label: b.name.split(" ")[0],
            color: b.color,
            side: b.account.position!.side,
            entry: b.account.position!.entry,
          })),
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [name, pushPresence, publishTrades, startRecorder]);

  // Host-only: change the instrument while still in the lobby.
  const setInstrument = useCallback(
    (id: string) => {
      if (startEpochRef.current != null) return; // locked once the race is scheduled
      const version = Date.now();
      applyInstrument(id, version);
      pushPresence({ instrument: id, instrumentVersion: version });
      channelRef.current?.send({ type: "broadcast", event: "control", payload: { instrument: id, instrumentVersion: version } });
    },
    [applyInstrument, pushPresence],
  );

  const start = useCallback(() => {
    if (startEpochRef.current != null) return;
    const epoch = Date.now() + COUNTDOWN_MS;
    startEpochRef.current = epoch;
    savedRoundRef.current = false;
    setSaveStatus("idle");
    roundCandlesRef.current = engineRef.current!.market.candles.map((c) => ({ ...c }));
    pushPresence({ startEpoch: epoch });
    channelRef.current?.send({ type: "broadcast", event: "control", payload: { startEpoch: epoch } });
  }, [pushPresence]);

  const rematch = useCallback(() => {
    const rn = roundNumberRef.current + 1;
    roundNumberRef.current = rn;
    setRoundNumber(rn);
    startEpochRef.current = null;
    savedRoundRef.current = false;
    recorderRef.current = null;
    setReplayId(null);
    setAccountResult(null);
    setSaveStatus("idle");
    roundCandlesRef.current = [];
    if (instrumentRef.current === SYNTHETIC) {
      engineRef.current = buildSyntheticEngine(room, rn);
      roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
    } else {
      applyInstrument(instrumentRef.current, instrumentVersionRef.current);
    }
    setPhase("lobby");
    pushPresence({ startEpoch: null, roundNumber: rn });
    channelRef.current?.send({
      type: "broadcast",
      event: "control",
      payload: { rematch: true, roundNumber: rn, startEpoch: null },
    });
  }, [applyInstrument, pushPresence, room]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !channelRef.current) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        userId: myIdRef.current,
        name,
        text: trimmed.slice(0, 120),
        at: Date.now(),
      };
      channelRef.current.send({ type: "broadcast", event: "chat", payload: msg });
      setChatMessages((prev) => [...prev.slice(-99), msg]);
      setDanmaku((prev) => [
        ...prev,
        {
          id: msg.id,
          text: `${msg.name}: ${msg.text}`,
          top: 8 + Math.random() * 72,
          color: "#34d399",
        },
      ]);
    },
    [name],
  );

  const finished = phase === "finished";

  useEffect(() => {
    if (phase !== "finished" || savedRoundRef.current) return;
    const e = engineRef.current;
    if (!e) return;
    savedRoundRef.current = true;

    if (roleRef.current === "spectator") {
      const rec = recorderRef.current;
      const startEpoch = startEpochRef.current;
      if (!rec || startEpoch == null) return;
      const id = multiplayerReplayId(room, roundNumberRef.current, startEpoch);
      const recording = rec.finish(e);
      // Players upload the same round id first; this only fills in if none did.
      window.setTimeout(() => {
        saveReplay(id, recording)
          .then(() => setReplayId(id))
          .catch((err) => console.warn("replay save failed", err));
      }, 3000);
      return;
    }
    setSaveStatus("saving");

    const price = e.market.currentPrice;
    const eqMe = equity(e.player, price);
    const retMe = ((eqMe - STARTING_BALANCE) / STARTING_BALANCE) * 100;
    const rows: LeaderRow[] = [];
    rows.push({
      id: myIdRef.current,
      name,
      color: "#34d399",
      equity: eqMe,
      returnPct: retMe,
      side: e.player.account.position?.side ?? null,
      isMe: true,
      isBot: false,
    });
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

    const review = buildMultiplayerReview(
      e,
      roundCandlesRef.current,
      rows,
      room,
      roundNumberRef.current,
      e.market.label,
      instrumentRef.current,
    );
    const setup = mpRoundSetup(instrumentRef.current);

    const rec = recorderRef.current;
    const startEpoch = startEpochRef.current;
    const id = rec && startEpoch != null ? multiplayerReplayId(room, roundNumberRef.current, startEpoch) : null;
    const replaySaved: Promise<string | null> = id && rec
      ? saveReplay(id, rec.finish(e))
          .then(() => {
            setReplayId(id);
            return id;
          })
          .catch((err) => {
            console.warn("replay save failed", err);
            return null;
          })
      : Promise.resolve(null);

    const others = [
      ...e.bots.map((b) => ({ rating: b.rating, equity: equity(b, price) })),
      ...Object.keys(presenceRef.current)
        .filter((pid) => pid !== myIdRef.current && presenceRef.current[pid]?.role !== "spectator")
        .map((pid) => ({ equity: statsRef.current[pid]?.eq ?? STARTING_BALANCE })),
    ];
    review.summary.totalPlayers = others.length + 1;
    review.summary.rank = 1 + others.filter((o) => o.equity > eqMe).length;

    const accountSaved = replaySaved
      .then((rid) =>
        saveAccountGame({
          mode: "multiplayer",
          review,
          setup,
          finalBalance: eqMe,
          opponents: others,
          myEquity: eqMe,
          replayId: rid,
        }),
      )
      .then((res) => {
        if (res) setAccountResult(res);
      })
      .catch((err) => console.warn("account history save failed", err));

    Promise.all([saveMultiplayerRound(review, setup), accountSaved])
      .then(() => setSaveStatus("saved"))
      .catch((err) => {
        console.warn("multiplayer save failed", err);
        setSaveStatus("error");
      });
  }, [phase, name, room]);

  const controls = {
    long: () => {
      if (finished || roleRef.current === "spectator") return;
      engineRef.current!.playerLong();
      const rec = recorderRef.current;
      if (rec) publishTrades(rec.syncPositions(engineRef.current!));
    },
    short: () => {
      if (finished || roleRef.current === "spectator") return;
      engineRef.current!.playerShort();
      const rec = recorderRef.current;
      if (rec) publishTrades(rec.syncPositions(engineRef.current!));
    },
    close: () => {
      if (finished || roleRef.current === "spectator") return;
      engineRef.current!.playerClose();
      const rec = recorderRef.current;
      if (rec) publishTrades(rec.syncPositions(engineRef.current!));
    },
  };

  return {
    phase,
    snapshot,
    secondsToStart,
    timeLeftMs,
    roundMs: ROUND_MS,
    roundNumber,
    playerCount,
    traderCount,
    spectatorCount,
    isHost,
    role,
    isSpectator: role === "spectator",
    start,
    rematch,
    controls,
    instruments,
    selectedInstrument,
    setInstrument,
    instrumentLoading,
    chatMessages,
    danmaku,
    sendChat,
    saveStatus,
    replayId,
    accountResult,
  };
}
