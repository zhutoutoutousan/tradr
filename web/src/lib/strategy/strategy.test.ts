import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GameEngine } from "@/lib/sim/engine";
import { DEFAULT_MARKET, Market } from "@/lib/sim/market";
import { HistoricalMarket } from "@/lib/sim/historical";
import { RNG } from "@/lib/sim/rng";
import { ARCHETYPES } from "@/lib/sim/strategies";
import type { BotSpec } from "@/lib/sim/botFactory";
import { ema, macd, rsi, smaLast, stdLast } from "@/lib/sim/indicators";
import type { Candle, IMarket } from "@/lib/sim/types";
import type { StrategyDef } from "./ast";
import { parseFormula, printFormula, FormulaError } from "./parse";
import { compileStrategy, strategyOnBar, StrategyError } from "./compile";
import { BUILTIN_STRATEGIES } from "./builtins";
import { OPS } from "./ops";
import { backtest, optimize } from "./backtest";

const load = (id: string): Candle[] =>
  JSON.parse(readFileSync(new URL(`../../../public/data/${id}.json`, import.meta.url), "utf8")).candles;

/** Evaluate one formula over a candle series, the way a bot sees it bar by bar. */
function series(src: string, candles: Candle[], params: Record<string, number> = {}): number[] {
  const def: StrategyDef = { v: 1, name: "t", let: { x: src }, long: "0", params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, { default: v }])) };
  const c = compileStrategy(def);
  const ev = c.instantiate();
  for (let n = 1; n <= candles.length; n++) ev.update(candles, candles[n - 1].close, n);
  return [...ev.series(c.named.x)];
}

const same = (a: number[], b: number[]) => {
  expect(a.length).toBe(b.length);
  a.forEach((v, i) => {
    if (Number.isNaN(b[i])) expect(v).toBeNaN();
    else expect(v).toBeCloseTo(b[i], 9);
  });
};

describe("formula parser", () => {
  it("follows Alpha101 precedence and round-trips", () => {
    const cases = [
      "(-1 * correlation(open, volume, 10))",
      "((close - open) / ((high - low) + .001))",
      "((0 < ts_min(delta(close, 1), 5)) ? delta(close, 1) : ((ts_max(delta(close, 1), 5) < 0) ? delta(close, 1) : (-1 * delta(close, 1))))",
      "-x ^ 2 + a * b - c / d",
      "a < b && c >= d || !e",
      "a ? b : c ? d : e",
      "2 ^ 3 ^ 2",
    ];
    for (const src of cases) {
      const tree = parseFormula(src);
      expect(parseFormula(printFormula(tree))).toEqual(tree);
    }
    expect(parseFormula("-x ^ 2")).toEqual({ k: "call", fn: "neg", args: [{ k: "call", fn: "pow", args: [{ k: "id", name: "x" }, { k: "num", v: 2 }] }] });
    expect(parseFormula("2 ^ 3 ^ 2")).toEqual(parseFormula("2 ^ (3 ^ 2)"));
    const [a, b, c] = ["a", "b", "c"].map((name) => ({ k: "id" as const, name }));
    expect(parseFormula("a < b - c")).toEqual({ k: "call", fn: "lt", args: [a, { k: "call", fn: "sub", args: [b, c] }] });
    expect(parseFormula("a - b - c")).toEqual({ k: "call", fn: "sub", args: [{ k: "call", fn: "sub", args: [a, b] }, c] });
    expect(parseFormula("a * b + c")).toEqual({ k: "call", fn: "add", args: [{ k: "call", fn: "mul", args: [a, b] }, c] });
    expect(printFormula(parseFormula("a - (b - c)"))).toBe("a - (b - c)");
    expect(printFormula(parseFormula("(a - b) - c"))).toBe("a - b - c");
    expect(parseFormula("Ts_ArgMax(close, 5)")).toEqual(parseFormula("ts_argmax(close, 5)"));
  });

  it("reports where a formula breaks", () => {
    expect(() => parseFormula("delta(close, 1")).toThrow(FormulaError);
    try {
      parseFormula("close + * 2");
    } catch (e) {
      expect((e as FormulaError).pos).toBe(8);
    }
  });
});

describe("operators", () => {
  const candles = load("aapl").slice(0, 300);
  const closes = candles.map((c) => c.close);

  it("match the game's indicator implementations", () => {
    same(series("rsi(close, 14)", candles), rsi(closes, 14));
    same(series("ema(close, 20)", candles), ema(closes, 20));
    same(series("ema(close, 12) - ema(close, 26)", candles), macd(closes).macd);
    same(series("ema(ema(close, 12) - ema(close, 26), 9)", candles), macd(closes).signal);
    const sma = series("sma(close, 20)", candles);
    const sd = series("stddev(close, 20)", candles);
    for (const i of [19, 100, 299]) {
      expect(sma[i]).toBe(smaLast(closes.slice(0, i + 1), 20));
      expect(sd[i]).toBe(stdLast(closes.slice(0, i + 1), 20));
    }
  });

  it("compute the Alpha101 time-series operators", () => {
    const c = [1, 3, 2, 5, 4].map((v, i) => ({ time: i, open: v, high: v, low: v, close: v, volume: 10 * (i + 1) }));
    same(series("delay(close, 2)", c), [NaN, NaN, 1, 3, 2]);
    same(series("delta(close, 1)", c), [NaN, 2, -1, 3, -1]);
    same(series("sum(close, 3)", c), [NaN, NaN, 6, 10, 11]);
    same(series("min(close, 3)", c), [NaN, NaN, 1, 2, 2]);
    same(series("max(close, open)", c), [1, 3, 2, 5, 4]);
    same(series("ts_argmax(close, 3)", c), [NaN, NaN, 2, 3, 2]);
    same(series("ts_rank(close, 3)", c), [NaN, NaN, 2 / 3, 1, 2 / 3]);
    same(series("decay_linear(close, 2)", c), [NaN, (1 + 6) / 3, (3 + 4) / 3, (2 + 10) / 3, (5 + 8) / 3]);
    same(series("product(close, 2)", c), [NaN, 3, 6, 10, 20]);
    same(series("streak(delta(close, 1) > 0)", c), [0, 1, 0, 1, 0]);
    same(series("cross_above(close, 2.5)", c), [0, 1, 0, 1, 0]);
    same(series("correlation(close, volume, 5)", c).slice(4), [0.8]);
    same(series("adv2", c), [NaN, 15, 25, 35, 45]);
    same(series("returns", c), [NaN, 2, -1 / 3, 1.5, -0.2]);
    same(series("delay(close, d * 2)", c, { d: 1 }), [NaN, NaN, 1, 3, 2]);
  });

  it("give the same series incrementally as in one pass", () => {
    const src = "decay_linear(correlation(vwap, adv20, 10), 5) + ts_rank(rsi(close, 9), 15) * streak(returns > 0)";
    const bulk = compileStrategy({ v: 1, name: "t", let: { x: src }, long: "0" });
    const ev = bulk.instantiate();
    ev.update(candles, closes[closes.length - 1]);
    same(series(src, candles), [...ev.series(bulk.named.x)]);
  });
});

describe("strategy compiler", () => {
  it("explains unsupported or broken formulas", () => {
    const base: StrategyDef = { v: 1, name: "t", long: "rank(close) > 0.5" };
    expect(() => compileStrategy(base)).toThrow(/compares several instruments/);
    expect(() => compileStrategy({ ...base, long: "closee > 1" })).toThrow(/Unknown name "closee"/);
    expect(() => compileStrategy({ ...base, long: "delay(close, volume) > 1" })).toThrow(/must be a number or a parameter/);
    expect(() => compileStrategy({ ...base, long: "ts_max(close, 0) > 1" })).toThrow(/window must be/);
    expect(() => compileStrategy({ ...base, long: "close > (1" })).toThrow(StrategyError);
    expect(() => compileStrategy({ v: 1, name: "t" })).toThrow(/at least one entry rule/);
  });

  it("shares repeated sub-expressions", () => {
    const c = compileStrategy({ v: 1, name: "t", long: "delta(close, 1) > 0 && delta(close, 1) < delta(close, 1) * 2" });
    expect(c.nodes.filter((n) => n.kind === "op" && n.op === OPS.delta)).toHaveLength(1);
  });
});

describe("built-in bots as strategy definitions", () => {
  const markets: [string, (seed: number) => IMarket][] = [
    ["synthetic", (seed) => new Market({ ...DEFAULT_MARKET, seed })],
    ["aapl", (seed) => new HistoricalMarket(load("aapl"), "AAPL", undefined, seed)],
    ["btcusd", (seed) => new HistoricalMarket(load("btcusd"), "BTC", undefined, seed)],
    ["eurusd", (seed) => new HistoricalMarket(load("eurusd"), "EUR/USD", undefined, seed)],
  ];
  const spec = (id: string, onBar: BotSpec["strategy"]["onBar"]): BotSpec => ({
    id,
    name: id,
    color: "#fff",
    blurb: "",
    exposure: 2,
    rating: 1000,
    strategy: { id, name: id, color: "#fff", blurb: "", onBar },
  });

  for (const arch of ARCHETYPES) {
    it(`${arch.label} trades exactly like the hand-written bot`, () => {
      let total = 0;
      for (const [label, make] of markets) {
        for (let seed = 1; seed <= 4; seed++) {
          const params = seed === 1 ? {} : arch.roll(new RNG(seed * 7919));
          const hand = new GameEngine(make(seed), [spec("b", arch.make(params))]);
          const ir = new GameEngine(make(seed), [spec("b", strategyOnBar(BUILTIN_STRATEGIES[arch.key], params))]);
          // ~700 bars, past the 600-candle window so the shifting-window path runs too.
          for (let t = 0; t < 4200; t++) {
            hand.step();
            ir.step();
          }
          const a = hand.bots[0].account;
          const b = ir.bots[0].account;
          expect(b.closed, `${label} seed ${seed}`).toEqual(a.closed);
          expect(b.position).toEqual(a.position);
          expect(b.balance).toBe(a.balance);
          total += a.closed.length;
        }
      }
      expect(total).toBeGreaterThan(10);
    });
  }
});

describe("backtest", () => {
  const ramp = Array.from({ length: 50 }, (_, i) => {
    const p = 100 + i;
    return { time: i, open: p, high: p + 0.5, low: p - 0.5, close: p + 0.25, volume: 1 };
  });

  it("fills at the next open and marks to market", () => {
    const r = backtest({ v: 1, name: "hold", long: "bar >= 1" }, ramp);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]).toMatchObject({ side: "long", entryBar: 1, entry: 101, exit: 149.25, reason: "end" });
    expect(r.metrics.totalReturn).toBeCloseTo(149.25 / 101 - 1, 9);
    expect(r.metrics.maxDrawdown).toBe(0);
  });

  it("applies stops and fees", () => {
    const r = backtest({ v: 1, name: "short", short: "bar >= 1", slPct: 0.02 }, ramp, { feeBps: 10 });
    expect(r.trades[0]).toMatchObject({ side: "short", entry: 101, reason: "stop" });
    expect(r.trades[0].exit).toBeCloseTo(101 * 1.02, 9);
    expect(r.metrics.fees).toBeGreaterThan(0);
    expect(r.metrics.trades).toBeGreaterThan(1);
  });

  it("optimizes on the training part and scores the rest", () => {
    const res = optimize(BUILTIN_STRATEGIES.trend, load("aapl"), { samples: 25, seed: 3 });
    expect(res.params.fast).toBeGreaterThanOrEqual(3);
    expect(Number.isFinite(res.test.sharpe)).toBe(true);
    expect(res.train.trades).toBeGreaterThan(0);
  });

  it("runs alpha-style formulas as bots", () => {
    const alphaBot = (alpha: string): StrategyDef => ({
      v: 1,
      name: "alpha",
      params: { k: { default: 1, min: 0.5, max: 2 } },
      let: { a: alpha, z: "zscore(a, 20)" },
      long: "z > k",
      short: "z < -k",
      exitLong: "z < 0",
      exitShort: "z > 0",
      slPct: 0.05,
    });
    for (const alpha of [
      "-1 * correlation(open, volume, 10)",
      "(close - open) / ((high - low) + .001)",
      "sign(delta(volume, 1)) * (-1 * delta(close, 1))",
      "((high * low) ^ 0.5) - vwap",
      "-1 * ts_rank(decay_linear(delta(close, 3), 7), 12)",
    ]) {
      const r = backtest(alphaBot(alpha), load("msft"));
      expect(r.equity).toHaveLength(1254);
      expect(r.trades.length).toBeGreaterThan(0);
    }
  });
});
