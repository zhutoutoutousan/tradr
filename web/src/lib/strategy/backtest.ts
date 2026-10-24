import type { Candle, Side } from "@/lib/sim/types";
import { RNG } from "@/lib/sim/rng";
import type { StrategyDef } from "./ast";
import { compileStrategy, type CompiledStrategy } from "./compile";

export interface BacktestOptions {
  startBalance?: number;
  /** Position notional as a multiple of the balance (the game's exposure). */
  exposure?: number;
  /** Commission per side in basis points of notional. */
  feeBps?: number;
  /** Used to annualize Sharpe and return: 252 for stocks, 365 for crypto. */
  barsPerYear?: number;
  /** Evaluate decisions only on bars in [from, to); indicators still see earlier bars. */
  from?: number;
  to?: number;
}

export interface BacktestTrade {
  side: Side;
  entryBar: number;
  exitBar: number;
  entry: number;
  exit: number;
  pnl: number;
  reason: "signal" | "stop" | "target" | "end";
}

export interface BacktestMetrics {
  totalReturn: number;
  annualReturn: number;
  sharpe: number;
  maxDrawdown: number;
  trades: number;
  winRate: number;
  profitFactor: number;
  exposureTime: number;
  fees: number;
}

export interface BacktestResult {
  equity: number[];
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
}

interface Open {
  side: Side;
  entry: number;
  size: number;
  bar: number;
  sl?: number;
  tp?: number;
}

/**
 * Bar-by-bar backtest on daily candles. Rules are evaluated on each close and
 * filled at the next bar's open (the game's `price` at bar close is the next
 * open as well). Stops are checked against each bar's range; when a bar spans
 * both the stop and the target, the stop is assumed to hit first.
 */
export function backtest(strategy: StrategyDef | CompiledStrategy, candles: Candle[], opts: BacktestOptions = {}): BacktestResult {
  const c = "instantiate" in strategy ? strategy : compileStrategy(strategy);
  const ev = c.instantiate();
  const startBalance = opts.startBalance ?? 10_000;
  const exposure = opts.exposure ?? 1;
  const fee = (opts.feeBps ?? 0) / 10_000;
  const from = Math.max(0, opts.from ?? 0);
  const to = Math.min(candles.length, opts.to ?? candles.length);

  let balance = startBalance;
  let pos: Open | null = null;
  let fees = 0;
  let inMarket = 0;
  const trades: BacktestTrade[] = [];
  const equity: number[] = [];

  const close = (bar: number, price: number, reason: BacktestTrade["reason"]) => {
    if (!pos) return;
    const dir = pos.side === "long" ? 1 : -1;
    const cost = price * pos.size * fee;
    const pnl = (price - pos.entry) * pos.size * dir - cost;
    fees += cost;
    balance += pnl;
    trades.push({ side: pos.side, entryBar: pos.bar, exitBar: bar, entry: pos.entry, exit: price, pnl, reason });
    pos = null;
  };

  for (let i = from; i < to; i++) {
    const bar = candles[i];
    if (pos) {
      inMarket++;
      const p: Open = pos;
      const long = p.side === "long";
      const stopHit = p.sl !== undefined && (long ? bar.low <= p.sl : bar.high >= p.sl);
      const targetHit = p.tp !== undefined && (long ? bar.high >= p.tp : bar.low <= p.tp);
      // A gap through the level fills at the open.
      if (stopHit) close(i, long ? Math.min(bar.open, p.sl!) : Math.max(bar.open, p.sl!), "stop");
      else if (targetHit) close(i, long ? Math.max(bar.open, p.tp!) : Math.min(bar.open, p.tp!), "target");
    }

    const next = i + 1 < to ? candles[i + 1].open : bar.close;
    ev.update(candles, next, i + 1);
    if (i + 1 < to) {
      const d = ev.decide(pos ? (pos as Open).side : null);
      if (d?.close) close(i + 1, next, "signal");
      if (d?.open && !pos) {
        const size = (balance * exposure) / next;
        const cost = next * size * fee;
        fees += cost;
        balance -= cost;
        const { side, slPct, tpPct } = d.open;
        const dir = side === "long" ? 1 : -1;
        pos = {
          side,
          entry: next,
          size,
          bar: i + 1,
          sl: slPct !== undefined ? next * (1 - dir * slPct) : undefined,
          tp: tpPct !== undefined ? next * (1 + dir * tpPct) : undefined,
        };
      }
    }

    const open = pos as Open | null;
    const mtm = open && open.bar <= i ? (bar.close - open.entry) * open.size * (open.side === "long" ? 1 : -1) : 0;
    equity.push(balance + mtm);
  }
  if (pos && to > from) close(to - 1, candles[to - 1].close, "end");
  if (equity.length) equity[equity.length - 1] = balance;

  return { equity, trades, metrics: metrics(equity, trades, startBalance, inMarket, fees, opts.barsPerYear ?? 252) };
}

function metrics(equity: number[], trades: BacktestTrade[], start: number, inMarket: number, fees: number, perYear: number): BacktestMetrics {
  const n = equity.length;
  const end = n ? equity[n - 1] : start;
  const rets: number[] = [];
  let prev = start;
  let peak = start;
  let maxDd = 0;
  for (const e of equity) {
    rets.push(prev > 0 ? e / prev - 1 : 0);
    prev = e;
    peak = Math.max(peak, e);
    maxDd = Math.max(maxDd, peak > 0 ? (peak - e) / peak : 0);
  }
  const mean = rets.reduce((s, r) => s + r, 0) / Math.max(1, rets.length);
  const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, rets.length - 1));
  const wins = trades.filter((t) => t.pnl > 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = -trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0);
  const total = end / start - 1;
  return {
    totalReturn: total,
    annualReturn: n ? Math.pow(Math.max(0, 1 + total), perYear / n) - 1 : 0,
    sharpe: sd > 0 ? (mean / sd) * Math.sqrt(perYear) : 0,
    maxDrawdown: maxDd,
    trades: trades.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    exposureTime: n ? inMarket / n : 0,
    fees,
  };
}

export interface OptimizeOptions extends BacktestOptions {
  samples?: number;
  seed?: number;
  /** Fraction of bars used for fitting; the rest is the untouched test segment. */
  trainFraction?: number;
  objective?: (m: BacktestMetrics) => number;
}

export interface OptimizeResult {
  params: Record<string, number>;
  train: BacktestMetrics;
  test: BacktestMetrics;
  tried: number;
}

/**
 * Random search over the declared parameter ranges, fitted on the first part
 * of the data and scored once on the rest. The gap between train and test is
 * the honest measure of how much of the fit is curve fitting.
 */
export function optimize(def: StrategyDef, candles: Candle[], opts: OptimizeOptions = {}): OptimizeResult {
  const rng = new RNG(opts.seed ?? 1);
  const split = Math.floor(candles.length * (opts.trainFraction ?? 0.7));
  const objective = opts.objective ?? ((m: BacktestMetrics) => m.sharpe);
  const specs = Object.entries(def.params ?? {});
  let best: { params: Record<string, number>; score: number; train: BacktestMetrics } | null = null;
  const samples = opts.samples ?? 200;

  for (let s = 0; s < samples; s++) {
    const params: Record<string, number> = {};
    for (const [name, spec] of specs) {
      if (s === 0 || spec.min === undefined || spec.max === undefined) {
        params[name] = spec.default;
        continue;
      }
      let v = spec.min + rng.next() * (spec.max - spec.min);
      if (spec.step) v = spec.min + Math.round((v - spec.min) / spec.step) * spec.step;
      params[name] = spec.int ? Math.round(v) : v;
    }
    let compiled: CompiledStrategy;
    try {
      compiled = compileStrategy(def, params);
    } catch {
      continue;
    }
    const train = backtest(compiled, candles, { ...opts, from: 0, to: split }).metrics;
    const score = objective(train);
    if (Number.isFinite(score) && (!best || score > best.score)) best = { params, score, train };
  }
  if (!best) throw new Error("No parameter set produced a valid backtest");
  const test = backtest(compileStrategy(def, best.params), candles, { ...opts, from: split, to: candles.length }).metrics;
  return { params: best.params, train: best.train, test, tried: samples };
}
