import type { Candle, Position, Side } from "./types";
import { rsi, ema, smaLast, stdLast, macd } from "./indicators";
import type { RNG } from "./rng";

export interface BarContext {
  candles: Candle[]; // closed candles only (oldest -> newest)
  closes: number[];
  price: number;
}

export interface BotDecision {
  open?: { side: Side; slPct?: number; tpPct?: number };
  close?: boolean;
}

export type OnBar = (
  ctx: BarContext,
  pos: Position | null,
  state: Record<string, number>,
) => BotDecision | null;

export interface Strategy {
  id: string;
  name: string;
  color: string;
  blurb: string;
  // Mutable per-bot scratch state lives in `state`.
  onBar: OnBar;
}

// A tunable family of bots. `roll` produces randomized parameters (seeded), and
// `make` turns a parameter set into trading logic. This is what powers the
// roguelike, per-round bot field.
export interface Archetype {
  key: string;
  label: string; // human family name, e.g. "RSI Scalper"
  hue: number; // base color hue (0-360)
  roll(r: RNG): Record<string, number>;
  make(p: Record<string, number>): OnBar;
  name(p: Record<string, number>): string;
  blurb(p: Record<string, number>): string;
}

const num = (p: Record<string, number>, k: string, d: number) => (p[k] ?? d);

// ---------------------------------------------------------------------------
// RSI Scalping  (ported from Strategies/RSIScalpingStrategy.mqh)
// ---------------------------------------------------------------------------
export function makeRsiScalping(p: Record<string, number> = {}): OnBar {
  const period = num(p, "period", 14);
  const oversold = num(p, "oversold", 30);
  const overbought = num(p, "overbought", 70);
  const targetBuy = num(p, "targetBuy", 60);
  const targetSell = num(p, "targetSell", 40);
  const barsToWait = num(p, "barsToWait", 5);
  const slPct = num(p, "slPct", 0.02);
  const tpPct = num(p, "tpPct", 0.03);

  return (ctx, pos, state) => {
    const r = rsi(ctx.closes, period);
    const n = r.length;
    if (n < 3) return null;
    const cur = r[n - 1];
    const prev = r[n - 1];
    const twoAgo = r[n - 2];
    if (Number.isNaN(cur) || Number.isNaN(twoAgo)) return null;

    if (pos) {
      if (pos.side === "long") {
        if (cur < oversold) {
          state.against = (state.against || 0) + 1;
          if (state.against >= barsToWait) {
            state.against = 0;
            return { close: true };
          }
        } else {
          state.against = 0;
          if (cur >= targetBuy) return { close: true };
        }
      } else {
        if (cur > overbought) {
          state.against = (state.against || 0) + 1;
          if (state.against >= barsToWait) {
            state.against = 0;
            return { close: true };
          }
        } else {
          state.against = 0;
          if (cur <= targetSell) return { close: true };
        }
      }
      return null;
    }

    if (twoAgo <= oversold && prev > oversold) {
      return { open: { side: "long", slPct, tpPct } };
    }
    if (twoAgo >= overbought && prev < overbought) {
      return { open: { side: "short", slPct, tpPct } };
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// EMA Slope + Distance  (ported from Strategies/EMASlopeDistanceStrategy.mqh)
// ---------------------------------------------------------------------------
export function makeEmaSlope(p: Record<string, number> = {}): OnBar {
  const period = num(p, "period", 50);
  const priceThresh = num(p, "priceThresh", 0.004);
  const slopeThresh = num(p, "slopeThresh", 0.0006);
  const slPct = num(p, "slPct", 0.025);

  return (ctx, pos, state) => {
    const e = ema(ctx.closes, period);
    const n = e.length;
    if (n < 2) return null;
    const emaNow = e[n - 1];
    const emaPrev = e[n - 2];
    const close = ctx.closes[n - 1];

    if (pos) {
      const exitLong = pos.side === "long" && close < emaNow;
      const exitShort = pos.side === "short" && close > emaNow;
      if (exitLong || exitShort) {
        state.armed = 0;
        return { close: true };
      }
      return null;
    }

    const distance = Math.abs(close - emaNow) / ctx.price;
    const slope = Math.abs(emaNow - emaPrev) / ctx.price;
    if (distance > priceThresh && slope > slopeThresh) {
      state.armed = 1;
    }

    if (state.armed) {
      if (close > emaNow) {
        state.armed = 0;
        return { open: { side: "long", slPct } };
      }
      if (close < emaNow) {
        state.armed = 0;
        return { open: { side: "short", slPct } };
      }
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// Trend Rider  (dual-EMA crossover, in the spirit of SuperEMAStrategy.mqh)
// ---------------------------------------------------------------------------
export function makeTrendRider(p: Record<string, number> = {}): OnBar {
  const fastP = num(p, "fast", 10);
  const slowP = num(p, "slow", 30);
  const slPct = num(p, "slPct", 0.03);

  return (ctx, pos) => {
    const fast = ema(ctx.closes, fastP);
    const slow = ema(ctx.closes, slowP);
    const n = ctx.closes.length;
    if (n < slowP + 2) return null;
    const fNow = fast[n - 1];
    const fPrev = fast[n - 2];
    const sNow = slow[n - 1];
    const sPrev = slow[n - 2];
    const crossUp = fPrev <= sPrev && fNow > sNow;
    const crossDn = fPrev >= sPrev && fNow < sNow;

    if (pos) {
      if (pos.side === "long" && crossDn) return { close: true };
      if (pos.side === "short" && crossUp) return { close: true };
      return null;
    }
    if (crossUp) return { open: { side: "long", slPct } };
    if (crossDn) return { open: { side: "short", slPct } };
    return null;
  };
}

// ---------------------------------------------------------------------------
// MACD Momentum  (MACD line / signal line crossover)
// ---------------------------------------------------------------------------
export function makeMacdMomentum(p: Record<string, number> = {}): OnBar {
  const fast = num(p, "fast", 12);
  const slow = num(p, "slow", 26);
  const signalP = num(p, "signal", 9);
  const slPct = num(p, "slPct", 0.03);

  return (ctx, pos) => {
    const { macd: m, signal: s } = macd(ctx.closes, fast, slow, signalP);
    const n = ctx.closes.length;
    if (n < slow + signalP) return null;
    const mNow = m[n - 1];
    const mPrev = m[n - 2];
    const sNow = s[n - 1];
    const sPrev = s[n - 2];
    if ([mNow, mPrev, sNow, sPrev].some(Number.isNaN)) return null;
    const crossUp = mPrev <= sPrev && mNow > sNow;
    const crossDn = mPrev >= sPrev && mNow < sNow;

    if (pos) {
      if (pos.side === "long" && crossDn) return { close: true };
      if (pos.side === "short" && crossUp) return { close: true };
      return null;
    }
    if (crossUp) return { open: { side: "long", slPct } };
    if (crossDn) return { open: { side: "short", slPct } };
    return null;
  };
}

// ---------------------------------------------------------------------------
// Bollinger Reversion  (mean reversion off the bands back to the mean)
// ---------------------------------------------------------------------------
export function makeBollingerReversion(p: Record<string, number> = {}): OnBar {
  const period = num(p, "period", 20);
  const mult = num(p, "mult", 2);
  const slPct = num(p, "slPct", 0.03);

  return (ctx, pos) => {
    const n = ctx.closes.length;
    if (n < period + 1) return null;
    const mid = smaLast(ctx.closes, period);
    const sd = stdLast(ctx.closes, period);
    if (Number.isNaN(mid) || Number.isNaN(sd)) return null;
    const upper = mid + mult * sd;
    const lower = mid - mult * sd;
    const price = ctx.price;

    if (pos) {
      if (pos.side === "long" && price >= mid) return { close: true };
      if (pos.side === "short" && price <= mid) return { close: true };
      return null;
    }
    if (price < lower) return { open: { side: "long", slPct } };
    if (price > upper) return { open: { side: "short", slPct } };
    return null;
  };
}

// ---------------------------------------------------------------------------
// Donchian Breakout  (channel breakout trend follower)
// ---------------------------------------------------------------------------
export function makeDonchianBreakout(p: Record<string, number> = {}): OnBar {
  const period = num(p, "period", 20);
  const slPct = num(p, "slPct", 0.025);
  const tpPct = num(p, "tpPct", 0.05);

  return (ctx, pos) => {
    const c = ctx.candles;
    if (c.length < period + 1) return null;
    if (pos) return null; // exits handled by SL/TP

    const window = c.slice(c.length - period);
    let hh = -Infinity;
    let ll = Infinity;
    for (const k of window) {
      if (k.high > hh) hh = k.high;
      if (k.low < ll) ll = k.low;
    }
    if (ctx.price > hh) return { open: { side: "long", slPct, tpPct } };
    if (ctx.price < ll) return { open: { side: "short", slPct, tpPct } };
    return null;
  };
}

// ---------------------------------------------------------------------------
// Fixed presets (used by the default engine field and the synced multiplayer
// race so their behaviour and appearance stay exactly as before).
// ---------------------------------------------------------------------------
export const rsiScalping: Strategy = {
  id: "rsi-scalping",
  name: "RSI Scalper",
  color: "#22d3ee",
  blurb: "Buys RSI bouncing out of oversold, sells out of overbought. Exits at RSI target.",
  onBar: makeRsiScalping(),
};

export const emaSlope: Strategy = {
  id: "ema-slope",
  name: "EMA Slope",
  color: "#a78bfa",
  blurb: "Arms when price stretches from a sloping EMA, trades the trend, exits on cross-back.",
  onBar: makeEmaSlope(),
};

export const trendRider: Strategy = {
  id: "trend-rider",
  name: "Trend Rider",
  color: "#f59e0b",
  blurb: "Rides momentum: goes long on a fast/slow EMA golden cross, flips on the death cross.",
  onBar: makeTrendRider(),
};

export const macdMomentum: Strategy = {
  id: "macd-momentum",
  name: "MACD Momentum",
  color: "#f472b6",
  blurb: "Trades MACD line / signal crossovers to catch momentum shifts early.",
  onBar: makeMacdMomentum(),
};

export const bollingerReversion: Strategy = {
  id: "bollinger-reversion",
  name: "Bollinger Reversion",
  color: "#2dd4bf",
  blurb: "Fades extremes: buys a close below the lower band, sells above the upper, targets the mean.",
  onBar: makeBollingerReversion(),
};

export const donchianBreakout: Strategy = {
  id: "donchian-breakout",
  name: "Donchian Breakout",
  color: "#facc15",
  blurb: "Buys breaks above the 20-bar high and sells breaks below the 20-bar low.",
  onBar: makeDonchianBreakout(),
};

export const ALL_STRATEGIES: Strategy[] = [
  rsiScalping,
  emaSlope,
  trendRider,
  macdMomentum,
  bollingerReversion,
  donchianBreakout,
];

// ---------------------------------------------------------------------------
// Roguelike archetypes: tunable families the bot factory rolls each round.
// ---------------------------------------------------------------------------
const round1 = (n: number) => Math.round(n * 10) / 10;

export const ARCHETYPES: Archetype[] = [
  {
    key: "rsi",
    label: "RSI Scalper",
    hue: 190,
    roll: (r) => {
      const period = r.int(7, 21);
      const band = r.int(15, 32);
      return {
        period,
        oversold: band,
        overbought: 100 - band,
        targetBuy: r.int(52, 65),
        targetSell: r.int(35, 48),
        barsToWait: r.int(3, 8),
        slPct: round1(r.range(1.2, 3.0)) / 100,
        tpPct: round1(r.range(2.0, 4.5)) / 100,
      };
    },
    make: makeRsiScalping,
    name: (p) => `RSI-${p.period}`,
    blurb: (p) =>
      `Scalps RSI(${p.period}) out of ${p.oversold}/${p.overbought} extremes back toward the middle.`,
  },
  {
    key: "ema",
    label: "EMA Slope",
    hue: 265,
    roll: (r) => ({
      period: r.int(20, 80),
      priceThresh: round1(r.range(0.25, 0.7)) / 100,
      slopeThresh: round1(r.range(0.04, 0.1)) / 100,
      slPct: round1(r.range(1.8, 3.2)) / 100,
    }),
    make: makeEmaSlope,
    name: (p) => `EMA-${p.period}`,
    blurb: (p) => `Trades the EMA(${p.period}) trend once price stretches and the slope confirms.`,
  },
  {
    key: "trend",
    label: "Trend Rider",
    hue: 35,
    roll: (r) => {
      const fast = r.int(6, 16);
      return {
        fast,
        slow: fast + r.int(10, 30),
        slPct: round1(r.range(2.0, 4.0)) / 100,
      };
    },
    make: makeTrendRider,
    name: (p) => `Trend ${p.fast}/${p.slow}`,
    blurb: (p) => `Rides EMA ${p.fast}/${p.slow} crossovers, flipping out on the opposite cross.`,
  },
  {
    key: "macd",
    label: "MACD Momentum",
    hue: 320,
    roll: (r) => {
      const fast = r.int(8, 16);
      return {
        fast,
        slow: fast + r.int(8, 18),
        signal: r.int(6, 12),
        slPct: round1(r.range(2.0, 4.0)) / 100,
      };
    },
    make: makeMacdMomentum,
    name: (p) => `MACD ${p.fast}/${p.slow}`,
    blurb: (p) => `Catches momentum on MACD ${p.fast}/${p.slow}/${p.signal} signal crossovers.`,
  },
  {
    key: "bollinger",
    label: "Bollinger Reversion",
    hue: 165,
    roll: (r) => ({
      period: r.int(14, 28),
      mult: round1(r.range(1.6, 2.6)),
      slPct: round1(r.range(2.0, 4.0)) / 100,
    }),
    make: makeBollingerReversion,
    name: (p) => `Bollinger-${p.period}`,
    blurb: (p) => `Fades ${round1(p.mult)} sigma Bollinger(${p.period}) extremes back to the mean.`,
  },
  {
    key: "donchian",
    label: "Donchian Breakout",
    hue: 50,
    roll: (r) => ({
      period: r.int(12, 40),
      slPct: round1(r.range(1.8, 3.2)) / 100,
      tpPct: round1(r.range(3.5, 6.5)) / 100,
    }),
    make: makeDonchianBreakout,
    name: (p) => `Donchian-${p.period}`,
    blurb: (p) => `Breaks out of the ${p.period}-bar channel and runs with the move.`,
  },
];
