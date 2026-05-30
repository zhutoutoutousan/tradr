"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, equity, STARTING_BALANCE, type Trader } from "@/lib/sim/engine";
import { Market, DEFAULT_MARKET } from "@/lib/sim/market";
import { HistoricalMarket } from "@/lib/sim/historical";
import type { Candle, Position } from "@/lib/sim/types";

export type GameConfig =
  | { kind: "synthetic"; seed: number }
  | { kind: "historical"; id: string; label: string; candles: Candle[] };

export interface TraderView {
  id: string;
  kind: "player" | "bot";
  name: string;
  color: string;
  blurb: string;
  equity: number;
  balance: number;
  returnPct: number;
  position: Position | null;
  unrealized: number;
  trades: number;
  wins: number;
  maxDrawdownPct: number;
}

export interface Snapshot {
  candles: Candle[];
  price: number;
  bar: number;
  label: string;
  date: string | null;
  player: TraderView;
  bots: TraderView[];
}

const SPEEDS = [1, 2, 5, 20] as const;
const BASE_TPS = 9; // ticks per second at 1x

function toView(t: Trader, price: number): TraderView {
  const eq = equity(t, price);
  const wins = t.account.closed.filter((c) => c.pnl > 0).length;
  const dd = t.account.peakEquity > 0 ? (t.account.peakEquity - eq) / t.account.peakEquity : 0;
  return {
    id: t.id,
    kind: t.kind,
    name: t.name,
    color: t.color,
    blurb: t.blurb,
    equity: eq,
    balance: t.account.balance,
    returnPct: ((eq - STARTING_BALANCE) / STARTING_BALANCE) * 100,
    position: t.account.position,
    unrealized: eq - t.account.balance,
    trades: t.account.closed.length,
    wins,
    maxDrawdownPct: dd * 100,
  };
}

function buildEngine(config: GameConfig): GameEngine {
  const market =
    config.kind === "synthetic"
      ? new Market({ ...DEFAULT_MARKET, seed: config.seed })
      : new HistoricalMarket(config.candles, config.label);
  return new GameEngine(market);
}

export function useGame(config: GameConfig) {
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) engineRef.current = buildEngine(config);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);
  const runningRef = useRef(running);
  const speedRef = useRef(SPEEDS[speedIdx]);
  runningRef.current = running;
  speedRef.current = SPEEDS[speedIdx];

  const buildSnapshot = useCallback(() => {
    const e = engineRef.current!;
    const price = e.market.currentPrice;
    setSnapshot({
      candles: e.market.view(),
      price,
      bar: e.market.bar,
      label: e.market.label,
      date: e.market.date,
      player: toView(e.player, price),
      bots: e.bots.map((b) => toView(b, price)),
    });
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (runningRef.current) {
        acc += (dt / 1000) * BASE_TPS * speedRef.current;
        let steps = Math.floor(acc);
        if (steps > 600) steps = 600; // safety cap
        acc -= steps;
        const e = engineRef.current!;
        for (let i = 0; i < steps; i++) e.step();
      }
      buildSnapshot();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [buildSnapshot]);

  const controls = {
    long: () => engineRef.current!.playerLong(),
    short: () => engineRef.current!.playerShort(),
    close: () => engineRef.current!.playerClose(),
    setExposure: (x: number) => engineRef.current!.setPlayerExposure(x),
    togglePause: () => setRunning((r) => !r),
    setSpeedIdx,
    cycleSpeed: () => setSpeedIdx((i) => (i + 1) % SPEEDS.length),
  };

  return {
    snapshot,
    running,
    speed: SPEEDS[speedIdx],
    speedIdx,
    speeds: SPEEDS,
    controls,
  };
}
