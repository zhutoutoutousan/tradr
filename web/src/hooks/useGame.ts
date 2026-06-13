"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, equity, STARTING_BALANCE, type Trader } from "@/lib/sim/engine";
import { Market, DEFAULT_MARKET } from "@/lib/sim/market";
import { HistoricalMarket } from "@/lib/sim/historical";
import { generateBots } from "@/lib/sim/botFactory";
import { RNG } from "@/lib/sim/rng";
import type { Candle, Position } from "@/lib/sim/types";
import { loadProfile, saveProfile } from "@/lib/game/profile";
import { computeEloDelta, opponentsFromStandings } from "@/lib/game/elo";
import {
  evaluateAchievements,
  type Achievement,
  type RoundSummary,
} from "@/lib/game/achievements";
import { POWERUPS, POWERUPS_BY_ID, type PowerupId } from "@/lib/game/powerups";
import type { DealTrade, RoundReview } from "@/lib/game/reviews";
import { instrumentLabel, type RoundSetup } from "@/lib/game/roundSetup";
import type { GhostBotSpec } from "@/lib/sim/ghostReplay";
import type { MarketOption } from "@/components/GameView";

export type GameConfig =
  | { kind: "synthetic"; seed: number; setup: RoundSetup; ghost?: GhostBotSpec }
  | { kind: "historical"; id: string; label: string; candles: Candle[]; seed: number; setup: RoundSetup; ghost?: GhostBotSpec };

export interface TraderView {
  id: string;
  kind: "player" | "bot";
  name: string;
  color: string;
  blurb: string;
  rating: number;
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
  tip: number; // Insider Tip direction: 1 up / -1 down / 0 inactive
  shieldArmed: boolean;
}

export interface PowerupView {
  id: PowerupId;
  name: string;
  short: string;
  hotkey: string;
  description: string;
  color: string;
  charges: number;
  active: boolean;
  cooldownPct: number; // 0..1 remaining cooldown (0 = ready)
  ready: boolean;
}

export interface RoundResult {
  standings: TraderView[];
  rank: number;
  summary: RoundSummary;
  eloBefore: number;
  eloAfter: number;
  eloDelta: number;
  newAchievements: Achievement[];
  review: RoundReview;
}

const SPEEDS = [1, 2, 5, 20] as const;
const BASE_TPS = 9; // ticks per second at 1x
const SLOWMO_SPEED = 0.25;
const DEFAULT_ROUND_MS = 180_000; // 3 minutes of play time
const BUST_EQUITY = STARTING_BALANCE * 0.05; // account blown

function readRoundMs(): number {
  if (typeof window === "undefined") return DEFAULT_ROUND_MS;
  const raw = localStorage.getItem("tradr.demo.roundMs");
  if (!raw) return DEFAULT_ROUND_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 5_000 && n <= 600_000 ? n : DEFAULT_ROUND_MS;
}

function demoNoBust(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("tradr.demo.noBust") === "1";
}

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
    rating: t.rating,
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

function barDate(candles: Candle[], bar: number): string | undefined {
  return candles.find((c) => c.time === bar)?.date;
}

function buildEngine(config: GameConfig): GameEngine {
  const playerElo = loadProfile().elo;
  const botCount = config.ghost ? 5 : 6;
  const bots = generateBots(config.seed, playerElo, botCount);
  const tpb = config.setup.ticksPerBar;
  const ghost = config.ghost;
  if (config.kind === "synthetic") {
    const r = new RNG((config.seed ^ 0x85ebca6b) >>> 0);
    const startPrice = Math.round(50 + r.next() * 4950);
    return new GameEngine(
      new Market({ ...DEFAULT_MARKET, seed: config.seed, startPrice, ticksPerBar: tpb }),
      bots,
      {},
      ghost,
    );
  }
  return new GameEngine(
    new HistoricalMarket(config.candles, config.label, { ticksPerBar: tpb, maxHistory: 600, warmup: 80 }, config.seed),
    bots,
    {},
    ghost,
  );
}

interface PowerupRuntime {
  charges: number;
  cooldownUntil: number; // play-time ms
  activeUntil: number; // play-time ms (timed effects)
}

export function useGame(config: GameConfig, markets: MarketOption[] = []) {
  const engineRef = useRef<GameEngine | null>(null);
  const roundCandlesRef = useRef<Candle[]>([]);
  const roundInitRef = useRef(false);
  if (!engineRef.current) engineRef.current = buildEngine(config);
  if (!roundInitRef.current) {
    roundInitRef.current = true;
    roundCandlesRef.current = engineRef.current.market.candles.map((c) => ({ ...c }));
  }

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);
  const roundMsRef = useRef(readRoundMs());
  const [timeLeftMs, setTimeLeftMs] = useState(roundMsRef.current);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);

  const runningRef = useRef(running);
  const speedRef = useRef<number>(SPEEDS[speedIdx]);
  runningRef.current = running;
  speedRef.current = SPEEDS[speedIdx];

  // Play-time clock: only advances while running and not finished. Powers the
  // countdown and all power-up timers so they respect pause + speed.
  const playMsRef = useRef(0);
  const gameOverRef = useRef(false);
  const usedCountRef = useRef(0);
  const minReturnRef = useRef(0);
  const maxDDRef = useRef(0);

  // Power-up runtime state (mutable refs; surfaced to UI via state mirror).
  const puRef = useRef<Record<PowerupId, PowerupRuntime>>(
    Object.fromEntries(
      POWERUPS.map((p) => [p.id, { charges: p.charges, cooldownUntil: 0, activeUntil: 0 }]),
    ) as Record<PowerupId, PowerupRuntime>,
  );
  const [powerups, setPowerups] = useState<PowerupView[]>([]);

  const finalize = useCallback(() => {
    const e = engineRef.current!;
    const price = e.market.currentPrice;
    const player = toView(e.player, price);
    const bots = e.bots.map((b) => toView(b, price));
    const standings = [player, ...bots].sort((a, b) => b.equity - a.equity);
    const rank = standings.findIndex((t) => t.id === "you") + 1;

    const wins = e.player.account.closed.filter((c) => c.pnl > 0).length;
    const losses = e.player.account.closed.filter((c) => c.pnl < 0).length;

    const summary: RoundSummary = {
      rank,
      totalPlayers: standings.length,
      returnPct: player.returnPct,
      profit: player.equity - STARTING_BALANCE,
      trades: player.trades,
      wins,
      losses,
      maxDrawdownPct: maxDDRef.current,
      minReturnPct: minReturnRef.current,
      powerupsUsed: usedCountRef.current,
      roundsPlayed: 0, // filled below once we know the lifetime count
    };

    const profile = loadProfile();
    const eloBefore = profile.elo;
    const delta = computeEloDelta(
      eloBefore,
      opponentsFromStandings(player.equity, bots.map((b) => ({ rating: b.rating, equity: b.equity }))),
    );
    const eloAfter = Math.max(100, eloBefore + delta);

    profile.roundsPlayed += 1;
    summary.roundsPlayed = profile.roundsPlayed;

    const newAchievements = evaluateAchievements(summary, profile.unlocked);

    profile.elo = eloAfter;
    profile.bestElo = Math.max(profile.bestElo, eloAfter);
    profile.firstPlaces += rank === 1 ? 1 : 0;
    profile.bestReturnPct = Math.max(profile.bestReturnPct, player.returnPct);
    profile.bestRoundProfit = Math.max(profile.bestRoundProfit, summary.profit);
    profile.unlocked = [...profile.unlocked, ...newAchievements.map((a) => a.id)];
    saveProfile(profile);

    const view = e.market.view();
    const forming = view[view.length - 1];
    const candles = roundCandlesRef.current.map((c) => ({ ...c }));
    if (forming && candles[candles.length - 1]?.time !== forming.time) {
      candles.push({ ...forming });
    }
    const trades: DealTrade[] = e.player.account.closed.map((t) => {
      const notional = t.entry * t.size;
      return {
        side: t.side,
        entry: t.entry,
        exit: t.exit,
        size: t.size,
        pnl: t.pnl,
        returnPct: notional > 0 ? (t.pnl / notional) * 100 : 0,
        openBar: t.openBar,
        closeBar: t.closeBar,
        openDate: barDate(candles, t.openBar),
        closeDate: barDate(candles, t.closeBar),
      };
    });

    const inst = instrumentLabel(config.setup.instrumentId, markets);
    const review: RoundReview = {
      id: `round-${config.seed}-${Date.now()}`,
      createdAt: Date.now(),
      marketId: config.setup.instrumentId,
      marketLabel: `${inst} · ${config.setup.timeframeLabel}`,
      seed: config.seed,
      candles: candles.map((c) => ({ ...c })),
      trades,
      summary: {
        returnPct: player.returnPct,
        profit: summary.profit,
        trades: summary.trades,
        wins: summary.wins,
        rank,
        totalPlayers: summary.totalPlayers,
        eloDelta: eloAfter - eloBefore,
      },
    };

    setResult({
      standings,
      rank,
      summary,
      eloBefore,
      eloAfter,
      eloDelta: eloAfter - eloBefore,
      newAchievements,
      review,
    });
  }, [config, markets]);

  const buildSnapshot = useCallback(() => {
    const e = engineRef.current!;
    const price = e.market.currentPrice;
    const tipActive = playMsRef.current < puRef.current.tip.activeUntil;
    setSnapshot({
      candles: e.market.view(),
      price,
      bar: e.market.bar,
      label: e.market.label,
      date: e.market.date,
      player: toView(e.player, price),
      bots: e.bots.map((b) => toView(b, price)),
      tip: tipActive ? e.market.peekDirection(1) : 0,
      shieldArmed: e.player.shieldActive,
    });
  }, []);

  const refreshPowerups = useCallback(() => {
    const now = playMsRef.current;
    setPowerups(
      POWERUPS.map((p) => {
        const rt = puRef.current[p.id];
        const cdLeft = Math.max(0, rt.cooldownUntil - now);
        const active = now < rt.activeUntil || (p.id === "shield" && engineRef.current!.player.shieldActive);
        return {
          id: p.id,
          name: p.name,
          short: p.short,
          hotkey: p.hotkey,
          description: p.description,
          color: p.color,
          charges: rt.charges,
          active,
          cooldownPct: p.cooldownMs > 0 ? cdLeft / p.cooldownMs : 0,
          ready: rt.charges > 0 && cdLeft <= 0 && !gameOverRef.current,
        };
      }),
    );
  }, []);

  // Apply timed power-up effects to the engine for the current play-time.
  const applyEffects = useCallback(() => {
    const e = engineRef.current!;
    const now = playMsRef.current;
    e.botsFrozen = now < puRef.current.freeze.activeUntil;
    e.player.exposureMult = now < puRef.current.leverage.activeUntil ? 2 : 1;
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;

      if (runningRef.current && !gameOverRef.current) {
        playMsRef.current += dt;

        // Countdown.
        const left = Math.max(0, roundMsRef.current - playMsRef.current);
        setTimeLeftMs(left);

        // Slow-Mo overrides the chosen speed while active.
        const slowmo = playMsRef.current < puRef.current.slowmo.activeUntil;
        const effSpeed = slowmo ? SLOWMO_SPEED : speedRef.current;

        applyEffects();

        acc += (dt / 1000) * BASE_TPS * effSpeed;
        let steps = Math.floor(acc);
        if (steps > 600) steps = 600; // safety cap
        acc -= steps;
        const e = engineRef.current!;
        for (let i = 0; i < steps; i++) {
          const prevBar = e.market.bar;
          e.step();
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

        // Track worst return + max drawdown over the round for achievements.
        const eq = equity(e.player, e.market.currentPrice);
        const ret = ((eq - STARTING_BALANCE) / STARTING_BALANCE) * 100;
        if (ret < minReturnRef.current) minReturnRef.current = ret;
        const dd = e.player.account.peakEquity > 0 ? (e.player.account.peakEquity - eq) / e.player.account.peakEquity : 0;
        if (dd * 100 > maxDDRef.current) maxDDRef.current = dd * 100;

        // End conditions: time up or account blown.
        if (left <= 0 || (!demoNoBust() && eq <= BUST_EQUITY)) {
          gameOverRef.current = true;
          setGameOver(true);
          setRunning(false);
          finalize();
        }
      }

      buildSnapshot();
      refreshPowerups();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [buildSnapshot, refreshPowerups, applyEffects, finalize]);

  const activatePowerup = useCallback((id: PowerupId) => {
    if (gameOverRef.current) return;
    const def = POWERUPS_BY_ID.get(id);
    if (!def) return;
    const rt = puRef.current[id];
    const now = playMsRef.current;
    if (rt.charges <= 0 || now < rt.cooldownUntil) return;

    rt.charges -= 1;
    rt.cooldownUntil = now + def.cooldownMs;
    if (def.durationMs > 0) rt.activeUntil = now + def.durationMs;
    usedCountRef.current += 1;

    if (id === "shield") engineRef.current!.player.shieldActive = true;

    applyEffects();
    refreshPowerups();
  }, [applyEffects, refreshPowerups]);

  const controls = {
    long: () => engineRef.current!.playerLong(),
    short: () => engineRef.current!.playerShort(),
    close: () => engineRef.current!.playerClose(),
    setExposure: (x: number) => engineRef.current!.setPlayerExposure(x),
    togglePause: () => {
      if (gameOverRef.current) return;
      setRunning((r) => !r);
    },
    setSpeedIdx,
    cycleSpeed: () => setSpeedIdx((i) => (i + 1) % SPEEDS.length),
    activatePowerup,
  };

  return {
    snapshot,
    running,
    speed: SPEEDS[speedIdx],
    speedIdx,
    speeds: SPEEDS,
    timeLeftMs,
    roundMs: roundMsRef.current,
    gameOver,
    result,
    powerups,
    controls,
  };
}
