import type { StrategyDef } from "./ast";

// The six built-in bot families as strategy definitions. Parameter names match
// the hand-written versions in sim/strategies.ts (and ARCHETYPES' rolls), and
// the decisions are identical bar for bar.

export const RSI_SCALPER: StrategyDef = {
  v: 1,
  name: "RSI Scalper",
  blurb: "Buys RSI bouncing out of oversold, sells out of overbought. Exits at the RSI target or after RSI stays against it.",
  params: {
    period: { default: 14, min: 5, max: 30, step: 1, int: true },
    oversold: { default: 30, min: 10, max: 45, step: 1 },
    overbought: { default: 70, min: 55, max: 90, step: 1 },
    targetBuy: { default: 60, min: 45, max: 80, step: 1 },
    targetSell: { default: 40, min: 20, max: 55, step: 1 },
    barsToWait: { default: 5, min: 1, max: 15, step: 1, int: true },
    slPct: { default: 0.02, min: 0.005, max: 0.08, step: 0.005 },
    tpPct: { default: 0.03, min: 0.005, max: 0.12, step: 0.005 },
  },
  let: { r: "rsi(close, period)" },
  when: "bar >= 3",
  long: "cross_above(r, oversold)",
  short: "cross_below(r, overbought)",
  exitLong: "(r < oversold && streak(r < oversold) >= barsToWait) || (r >= oversold && r >= targetBuy)",
  exitShort: "(r > overbought && streak(r > overbought) >= barsToWait) || (r <= overbought && r <= targetSell)",
  slPct: "slPct",
  tpPct: "tpPct",
};

export const EMA_SLOPE: StrategyDef = {
  v: 1,
  name: "EMA Slope",
  blurb: "Trades the EMA trend once price stretches away from it and the slope confirms; exits on the cross back.",
  params: {
    period: { default: 50, min: 10, max: 120, step: 1, int: true },
    priceThresh: { default: 0.004, min: 0.001, max: 0.02, step: 0.0005 },
    slopeThresh: { default: 0.0006, min: 0.0001, max: 0.003, step: 0.0001 },
    slPct: { default: 0.025, min: 0.005, max: 0.08, step: 0.005 },
  },
  let: {
    e: "ema(close, period)",
    stretched: "abs(close - e) / price > priceThresh && abs(e - delay(e, 1)) / price > slopeThresh",
  },
  when: "bar >= 2",
  long: "stretched && close > e",
  short: "stretched && close < e",
  exitLong: "close < e",
  exitShort: "close > e",
  slPct: "slPct",
};

export const TREND_RIDER: StrategyDef = {
  v: 1,
  name: "Trend Rider",
  blurb: "Goes long on a fast/slow EMA golden cross and short on the death cross.",
  params: {
    fast: { default: 10, min: 3, max: 30, step: 1, int: true },
    slow: { default: 30, min: 10, max: 100, step: 1, int: true },
    slPct: { default: 0.03, min: 0.005, max: 0.08, step: 0.005 },
  },
  let: { f: "ema(close, fast)", s: "ema(close, slow)" },
  when: "bar >= slow + 2",
  long: "cross_above(f, s)",
  short: "cross_below(f, s)",
  exitLong: "cross_below(f, s)",
  exitShort: "cross_above(f, s)",
  slPct: "slPct",
};

export const MACD_MOMENTUM: StrategyDef = {
  v: 1,
  name: "MACD Momentum",
  blurb: "Trades MACD line / signal line crossovers.",
  params: {
    fast: { default: 12, min: 4, max: 30, step: 1, int: true },
    slow: { default: 26, min: 10, max: 60, step: 1, int: true },
    signal: { default: 9, min: 3, max: 20, step: 1, int: true },
    slPct: { default: 0.03, min: 0.005, max: 0.08, step: 0.005 },
  },
  let: { line: "ema(close, fast) - ema(close, slow)", sig: "ema(line, signal)" },
  when: "bar >= slow + signal",
  long: "cross_above(line, sig)",
  short: "cross_below(line, sig)",
  exitLong: "cross_below(line, sig)",
  exitShort: "cross_above(line, sig)",
  slPct: "slPct",
};

export const BOLLINGER_REVERSION: StrategyDef = {
  v: 1,
  name: "Bollinger Reversion",
  blurb: "Fades closes outside the Bollinger bands and targets the mean.",
  params: {
    period: { default: 20, min: 5, max: 60, step: 1, int: true },
    mult: { default: 2, min: 1, max: 3.5, step: 0.1 },
    slPct: { default: 0.03, min: 0.005, max: 0.08, step: 0.005 },
  },
  let: { mid: "sma(close, period)", sd: "stddev(close, period)" },
  when: "bar >= period + 1",
  long: "price < mid - mult * sd",
  short: "price > mid + mult * sd",
  exitLong: "price >= mid",
  exitShort: "price <= mid",
  slPct: "slPct",
};

export const DONCHIAN_BREAKOUT: StrategyDef = {
  v: 1,
  name: "Donchian Breakout",
  blurb: "Buys breaks above the channel high and sells breaks below the channel low; exits on stops.",
  params: {
    period: { default: 20, min: 5, max: 80, step: 1, int: true },
    slPct: { default: 0.025, min: 0.005, max: 0.08, step: 0.005 },
    tpPct: { default: 0.05, min: 0.01, max: 0.15, step: 0.005 },
  },
  when: "bar >= period + 1",
  long: "price > ts_max(high, period)",
  short: "price < ts_min(low, period)",
  slPct: "slPct",
  tpPct: "tpPct",
};

/** Keyed like sim/strategies ARCHETYPES. */
export const BUILTIN_STRATEGIES: Record<string, StrategyDef> = {
  rsi: RSI_SCALPER,
  ema: EMA_SLOPE,
  trend: TREND_RIDER,
  macd: MACD_MOMENTUM,
  bollinger: BOLLINGER_REVERSION,
  donchian: DONCHIAN_BREAKOUT,
};
