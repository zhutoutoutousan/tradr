"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { GameEngine, equity, STARTING_BALANCE } from "@/lib/sim/engine";
import { Market, DEFAULT_MARKET } from "@/lib/sim/market";
import { HistoricalMarket } from "@/lib/sim/historical";
import { supabase, supabaseEnabled } from "@/lib/supabase";
import type { Candle, Side } from "@/lib/sim/types";

const MS_PER_TICK = 1000 / 9; // must match the synthetic feed's intended speed
const COUNTDOWN_MS = 4000;
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

export type MpPhase = "disabled" | "connecting" | "lobby" | "countdown" | "running";

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
  // Version (timestamp) of the instrument choice. Highest version wins across
  // the room, so an explicit pick always beats the default and the choice never
  // depends on fragile clock-based "host" detection.
  instrumentVersion: number;
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
function buildSyntheticEngine(room: string): GameEngine {
  return new GameEngine(new Market({ ...DEFAULT_MARKET, seed: hashSeed(room) }));
}

export function useMultiplayer(room: string, name: string) {
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = buildSyntheticEngine(room);
  }

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
  const [playerCount, setPlayerCount] = useState(1);
  const [isHost, setIsHost] = useState(false);
  const [instruments, setInstruments] = useState<InstrumentOption[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(SYNTHETIC);
  const [instrumentLoading, setInstrumentLoading] = useState(false);

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
        engineRef.current = buildSyntheticEngine(room);
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
          engineRef.current = new GameEngine(new HistoricalMarket(d.candles, d.name));
          engineReadyRef.current = true;
          setInstrumentLoading(false);
        })
        .catch(() => {
          if (instrumentRef.current !== reqId) return;
          // Fall back to synthetic so the room never gets stuck.
          instrumentRef.current = SYNTHETIC;
          setSelectedInstrument(SYNTHETIC);
          engineRef.current = buildSyntheticEngine(room);
          engineReadyRef.current = true;
          setInstrumentLoading(false);
        });
    },
    [room],
  );
  applyInstrumentRef.current = applyInstrument;

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

    // Host control signals (instrument choice, race start). Broadcast is
    // immediate and reliable for one-off events; presence carries the same data
    // so anyone joining LATER still picks it up from the initial state.
    ch.on("broadcast", { event: "control" }, ({ payload }) => {
      const p = payload as { instrument?: string; instrumentVersion?: number; startEpoch?: number };
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
      setPlayerCount(Object.keys(flat).length || 1);

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
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        pushPresence();
        setPhase((p) => (p === "connecting" ? "lobby" : p));
      }
    });

    return () => {
      channelRef.current = null;
      sb.removeChannel(ch);
    };
  }, [room, pushPresence]);

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
          setPhase((p) => (p === "running" ? p : "running"));
          setSecondsToStart(0);
          const target = Math.floor((now - start) / MS_PER_TICK);
          let steps = target - e.ticks;
          if (steps > MAX_CATCHUP) steps = MAX_CATCHUP;
          for (let i = 0; i < steps; i++) e.step();
        } else {
          setPhase("countdown");
          setSecondsToStart(Math.ceil((start - now) / 1000));
        }
      }

      // Build the render snapshot.
      const price = e.market.currentPrice;
      const eqMe = equity(e.player, price);
      const pos = e.player.account.position;
      const retMe = ((eqMe - STARTING_BALANCE) / STARTING_BALANCE) * 100;

      // Broadcast my live stats (ephemeral, high-frequency) — keeps the shared
      // leaderboard fresh WITHOUT churning presence membership.
      if (channelRef.current && now - lastPushRef.current > 1000 / STATS_HZ) {
        lastPushRef.current = now;
        channelRef.current.send({
          type: "broadcast",
          event: "stats",
          payload: { id: myIdRef.current, eq: eqMe, ret: retMe, side: pos?.side ?? null } as LiveStats,
        });
      }

      const rows: LeaderRow[] = [];
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
      for (const id of Object.keys(presenceRef.current)) {
        if (id === myIdRef.current) continue;
        const m = presenceRef.current[id];
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
  }, [name, pushPresence]);

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
    pushPresence({ startEpoch: epoch });
    channelRef.current?.send({ type: "broadcast", event: "control", payload: { startEpoch: epoch } });
  }, [pushPresence]);

  const controls = {
    long: () => engineRef.current!.playerLong(),
    short: () => engineRef.current!.playerShort(),
    close: () => engineRef.current!.playerClose(),
  };

  return {
    phase,
    snapshot,
    secondsToStart,
    playerCount,
    isHost,
    start,
    controls,
    instruments,
    selectedInstrument,
    setInstrument,
    instrumentLoading,
  };
}
