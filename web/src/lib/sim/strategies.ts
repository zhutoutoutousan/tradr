import type { Candle, Position, Side } from "./types";
import { rsi, ema, smaLast, stdLast, macd } from "./indicators";

export interface BarContext {
  candles: Candle[]; // closed candles only (oldest -> newest)
  closes: number[];
  price: number;
}

export interface BotDecision {
  open?: { side: Side; slPct?: number; tpPct?: number };
  close?: boolean;
}

export interface Strategy {
  id: string;
  name: string;
  color: string;
  blurb: string;
  // Mutable per-bot scratch state lives in `state`.
  onBar(ctx: BarContext, pos: Position | null, state: Record<string, number>): BotDecision | null;
}

// ---------------------------------------------------------------------------
// RSI Scalping  (ported from Strategies/RSIScalpingStrategy.mqh)
// ---------------------------------------------------------------------------
const RSI_PERIOD = 14;
const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;
const RSI_TARGET_BUY = 60;
const RSI_TARGET_SELL = 40;
const RSI_BARS_TO_WAIT = 5;

export const rsiScalping: Strategy = {
  id: "rsi-scalping",
  name: "RSI Scalper",
  color: "#22d3ee",
  blurb: "Buys RSI bouncing out of oversold, sells out of overbought. Exits at RSI target.",
  onBar(ctx, pos, state) {
    const r = rsi(ctx.closes, RSI_PERIOD);
    const n = r.length;
    if (n < 3) return null;
    const cur = r[n - 1];
    const prev = r[n - 1];
    const twoAgo = r[n - 2];
    if (Number.isNaN(cur) || Number.isNaN(twoAgo)) return null;

    if (pos) {
      if (pos.side === "long") {
        if (cur < RSI_OVERSOLD) {
          state.against = (state.against || 0) + 1;
          if (state.against >= RSI_BARS_TO_WAIT) {
            state.against = 0;
            return { close: true };
          }
        } else {
          state.against = 0;
          if (cur >= RSI_TARGET_BUY) return { close: true };
        }
      } else {
        if (cur > RSI_OVERBOUGHT) {
          state.against = (state.against || 0) + 1;
          if (state.against >= RSI_BARS_TO_WAIT) {
            state.against = 0;
            return { close: true };
          }
        } else {
          state.against = 0;
          if (cur <= RSI_TARGET_SELL) return { close: true };
        }
      }
      return null;
    }

    if (twoAgo <= RSI_OVERSOLD && prev > RSI_OVERSOLD) {
      return { open: { side: "long", slPct: 0.02, tpPct: 0.03 } };
    }
    if (twoAgo >= RSI_OVERBOUGHT && prev < RSI_OVERBOUGHT) {
      return { open: { side: "short", slPct: 0.02, tpPct: 0.03 } };
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// EMA Slope + Distance  (ported from Strategies/EMASlopeDistanceStrategy.mqh)
// ---------------------------------------------------------------------------
const ES_EMA_PERIOD = 50;
const ES_PRICE_THRESH_PCT = 0.004;
const ES_SLOPE_THRESH_PCT = 0.0006;

export const emaSlope: Strategy = {
  id: "ema-slope",
  name: "EMA Slope",
  color: "#a78bfa",
  blurb: "Arms when price stretches from a sloping EMA, trades the trend, exits on cross-back.",
  onBar(ctx, pos, state) {
    const e = ema(ctx.closes, ES_EMA_PERIOD);
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
    if (distance > ES_PRICE_THRESH_PCT && slope > ES_SLOPE_THRESH_PCT) {
      state.armed = 1;
    }

    if (state.armed) {
      if (close > emaNow) {
        state.armed = 0;
        return { open: { side: "long", slPct: 0.025 } };
      }
      if (close < emaNow) {
        state.armed = 0;
        return { open: { side: "short", slPct: 0.025 } };
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Trend Rider  (dual-EMA crossover, in the spirit of SuperEMAStrategy.mqh)
// ---------------------------------------------------------------------------
const TR_FAST = 10;
const TR_SLOW = 30;

export const trendRider: Strategy = {
  id: "trend-rider",
  name: "Trend Rider",
  color: "#f59e0b",
  blurb: "Rides momentum: goes long on a fast/slow EMA golden cross, flips on the death cross.",
  onBar(ctx, pos) {
    const fast = ema(ctx.closes, TR_FAST);
    const slow = ema(ctx.closes, TR_SLOW);
    const n = ctx.closes.length;
    if (n < TR_SLOW + 2) return null;
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
    if (crossUp) return { open: { side: "long", slPct: 0.03 } };
    if (crossDn) return { open: { side: "short", slPct: 0.03 } };
    return null;
  },
};

// ---------------------------------------------------------------------------
// MACD Momentum  (MACD line / signal line crossover)
// ---------------------------------------------------------------------------
export const macdMomentum: Strategy = {
  id: "macd-momentum",
  name: "MACD Momentum",
  color: "#f472b6",
  blurb: "Trades MACD line / signal crossovers to catch momentum shifts early.",
  onBar(ctx, pos) {
    const { macd: m, signal: s } = macd(ctx.closes);
    const n = ctx.closes.length;
    if (n < 35) return null;
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
    if (crossUp) return { open: { side: "long", slPct: 0.03 } };
    if (crossDn) return { open: { side: "short", slPct: 0.03 } };
    return null;
  },
};

// ---------------------------------------------------------------------------
// Bollinger Reversion  (mean reversion off the bands back to the mean)
// ---------------------------------------------------------------------------
const BB_PERIOD = 20;
const BB_MULT = 2;

export const bollingerReversion: Strategy = {
  id: "bollinger-reversion",
  name: "Bollinger Reversion",
  color: "#2dd4bf",
  blurb: "Fades extremes: buys a close below the lower band, sells above the upper, targets the mean.",
  onBar(ctx, pos) {
    const n = ctx.closes.length;
    if (n < BB_PERIOD + 1) return null;
    const mid = smaLast(ctx.closes, BB_PERIOD);
    const sd = stdLast(ctx.closes, BB_PERIOD);
    if (Number.isNaN(mid) || Number.isNaN(sd)) return null;
    const upper = mid + BB_MULT * sd;
    const lower = mid - BB_MULT * sd;
    const price = ctx.price;

    if (pos) {
      if (pos.side === "long" && price >= mid) return { close: true };
      if (pos.side === "short" && price <= mid) return { close: true };
      return null;
    }
    if (price < lower) return { open: { side: "long", slPct: 0.03 } };
    if (price > upper) return { open: { side: "short", slPct: 0.03 } };
    return null;
  },
};

// ---------------------------------------------------------------------------
// Donchian Breakout  (channel breakout trend follower)
// ---------------------------------------------------------------------------
const DC_PERIOD = 20;

export const donchianBreakout: Strategy = {
  id: "donchian-breakout",
  name: "Donchian Breakout",
  color: "#facc15",
  blurb: "Buys breaks above the 20-bar high and sells breaks below the 20-bar low.",
  onBar(ctx, pos) {
    const c = ctx.candles;
    if (c.length < DC_PERIOD + 1) return null;
    if (pos) return null; // exits handled by SL/TP

    const window = c.slice(c.length - DC_PERIOD);
    let hh = -Infinity;
    let ll = Infinity;
    for (const k of window) {
      if (k.high > hh) hh = k.high;
      if (k.low < ll) ll = k.low;
    }
    if (ctx.price > hh) return { open: { side: "long", slPct: 0.025, tpPct: 0.05 } };
    if (ctx.price < ll) return { open: { side: "short", slPct: 0.025, tpPct: 0.05 } };
    return null;
  },
};

export const ALL_STRATEGIES: Strategy[] = [
  rsiScalping,
  emaSlope,
  trendRider,
  macdMomentum,
  bollingerReversion,
  donchianBreakout,
];
