import type { Candle, Position, Side } from "./types";
import { rsi, ema } from "./indicators";

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
//  - Entry: RSI crosses back out of oversold/overbought across two closed bars
//  - Exit:  RSI reaches target, or stays against the position for BarsToWait
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

    // Flat: look for cross out of extreme zones.
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
// Darvas Box  (ported from Strategies/DarvasBoxStrategy.mqh)
//  - Forms a box when the last N bars consolidate inside an allowed range
//  - Buys on breakout above the box on a volume spike, sells on breakdown
// ---------------------------------------------------------------------------
const DB_BOX_PERIOD = 20;
const DB_ALLOWED_RANGE_PCT = 0.025; // consolidation tightness
const DB_VOL_MULT = 1.3;

export const darvasBox: Strategy = {
  id: "darvas-box",
  name: "Darvas Box",
  color: "#f59e0b",
  blurb: "Detects price consolidation boxes and rides breakouts with volume confirmation.",
  onBar(ctx, pos) {
    const c = ctx.candles;
    if (c.length < DB_BOX_PERIOD + 2) return null;

    if (pos) {
      // Box strategy exits are handled by SL/TP in the engine.
      return null;
    }

    const window = c.slice(c.length - DB_BOX_PERIOD);
    let hi = -Infinity;
    let lo = Infinity;
    let volSum = 0;
    for (const k of window) {
      if (k.high > hi) hi = k.high;
      if (k.low < lo) lo = k.low;
      volSum += k.volume;
    }
    const range = hi - lo;
    const allowed = DB_ALLOWED_RANGE_PCT * ctx.price;
    if (range > allowed) return null; // no box formed

    const last = c[c.length - 1];
    const avgVol = volSum / window.length;
    const volSpike = last.volume > avgVol * DB_VOL_MULT;
    if (!volSpike) return null;

    if (ctx.price > hi) return { open: { side: "long", slPct: 0.02, tpPct: 0.04 } };
    if (ctx.price < lo) return { open: { side: "short", slPct: 0.02, tpPct: 0.04 } };
    return null;
  },
};

// ---------------------------------------------------------------------------
// EMA Slope + Distance  (ported from Strategies/EMASlopeDistanceStrategy.mqh)
//  - Arms when price is far from EMA AND the EMA slope is strong
//  - Trades in the direction of price vs EMA, exits on the EMA cross-back
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

export const ALL_STRATEGIES: Strategy[] = [rsiScalping, darvasBox, emaSlope];
