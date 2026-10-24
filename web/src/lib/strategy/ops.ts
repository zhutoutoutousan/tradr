// Operator library. Every operator produces a series aligned with the candles.
// A kernel computes index `i` from its inputs at indices <= i and its own output
// (and scratch arrays) at indices < i, never later, so evaluation is causal and
// can be resumed bar by bar. Values before a window is full are NaN.

export type Kernel = (i: number, a: number[][], k: number[], out: number[], aux: number[][]) => number;

export interface OpSpec {
  /** Kinds of the arguments: series inputs or static numbers fixed at compile time (windows). */
  args: ("s" | "k")[];
  aux?: number;
  fn: Kernel;
  doc: string;
}

const truthy = (v: number) => v !== 0 && !Number.isNaN(v);
const b = (c: boolean) => (c ? 1 : 0);

function windowed(i: number, d: number, x: number[], f: (lo: number) => number): number {
  if (i < d - 1) return NaN;
  return f(i - d + 1);
}

function mean(x: number[], lo: number, hi: number): number {
  let s = 0;
  for (let j = lo; j <= hi; j++) s += x[j];
  return s / (hi - lo + 1);
}

const elementwise = (f: (...v: number[]) => number, doc: string, n = 1): OpSpec => ({
  args: Array<"s">(n).fill("s"),
  fn: (i, a) => f(...a.map((s) => s[i])),
  doc,
});

export const OPS: Record<string, OpSpec> = {
  add: elementwise((x, y) => x + y, "x + y", 2),
  sub: elementwise((x, y) => x - y, "x - y", 2),
  mul: elementwise((x, y) => x * y, "x * y", 2),
  div: elementwise((x, y) => x / y, "x / y", 2),
  pow: elementwise((x, y) => Math.pow(x, y), "x ^ y", 2),
  neg: elementwise((x) => -x, "-x"),
  lt: elementwise((x, y) => b(x < y), "x < y", 2),
  gt: elementwise((x, y) => b(x > y), "x > y", 2),
  le: elementwise((x, y) => b(x <= y), "x <= y", 2),
  ge: elementwise((x, y) => b(x >= y), "x >= y", 2),
  eq: elementwise((x, y) => b(x === y), "x == y", 2),
  ne: elementwise((x, y) => b(x !== y), "x != y", 2),
  and: elementwise((x, y) => b(truthy(x) && truthy(y)), "x && y", 2),
  or: elementwise((x, y) => b(truthy(x) || truthy(y)), "x || y", 2),
  not: elementwise((x) => b(!truthy(x)), "!x"),
  cond: elementwise((c, x, y) => (truthy(c) ? x : y), "c ? x : y", 3),

  abs: elementwise(Math.abs, "absolute value"),
  sign: elementwise((x) => (Number.isNaN(x) ? NaN : Math.sign(x)), "-1, 0 or 1"),
  log: elementwise(Math.log, "natural log"),
  sqrt: elementwise(Math.sqrt, "square root"),
  signedpower: elementwise((x, y) => Math.sign(x) * Math.pow(Math.abs(x), y), "sign(x) * |x|^y", 2),
  least: elementwise((x, y) => Math.min(x, y), "smaller of x and y", 2),
  greatest: elementwise((x, y) => Math.max(x, y), "larger of x and y", 2),

  delay: {
    args: ["s", "k"],
    fn: (i, [x], [d]) => (i >= d ? x[i - d] : NaN),
    doc: "value d bars ago",
  },
  delta: {
    args: ["s", "k"],
    fn: (i, [x], [d]) => (i >= d ? x[i] - x[i - d] : NaN),
    doc: "x minus its value d bars ago",
  },
  ts_sum: {
    args: ["s", "k"],
    fn: (i, [x], [d]) => windowed(i, d, x, (lo) => mean(x, lo, i) * d),
    doc: "sum over the last d bars",
  },
  sma: {
    args: ["s", "k"],
    fn: (i, [x], [d]) => windowed(i, d, x, (lo) => mean(x, lo, i)),
    doc: "simple moving average",
  },
  stddev: {
    args: ["s", "k"],
    fn: (i, [x], [d]) =>
      windowed(i, d, x, (lo) => {
        const m = mean(x, lo, i);
        let s = 0;
        for (let j = lo; j <= i; j++) s += (x[j] - m) * (x[j] - m);
        return Math.sqrt(s / d);
      }),
    doc: "population standard deviation over d bars",
  },
  zscore: {
    args: ["s", "k"],
    fn: (i, [x], [d]) =>
      windowed(i, d, x, (lo) => {
        const m = mean(x, lo, i);
        let s = 0;
        for (let j = lo; j <= i; j++) s += (x[j] - m) * (x[j] - m);
        const sd = Math.sqrt(s / d);
        return sd === 0 ? 0 : (x[i] - m) / sd;
      }),
    doc: "distance from the d-bar mean in standard deviations",
  },
  ts_min: {
    args: ["s", "k"],
    fn: (i, [x], [d]) => windowed(i, d, x, (lo) => Math.min(...x.slice(lo, i + 1))),
    doc: "lowest value over d bars",
  },
  ts_max: {
    args: ["s", "k"],
    fn: (i, [x], [d]) => windowed(i, d, x, (lo) => Math.max(...x.slice(lo, i + 1))),
    doc: "highest value over d bars",
  },
  ts_argmin: {
    args: ["s", "k"],
    fn: (i, [x], [d]) =>
      windowed(i, d, x, (lo) => {
        let best = lo;
        for (let j = lo; j <= i; j++) if (x[j] < x[best]) best = j;
        return best - lo + 1;
      }),
    doc: "position of the minimum in the window (1 = oldest, d = today)",
  },
  ts_argmax: {
    args: ["s", "k"],
    fn: (i, [x], [d]) =>
      windowed(i, d, x, (lo) => {
        let best = lo;
        for (let j = lo; j <= i; j++) if (x[j] > x[best]) best = j;
        return best - lo + 1;
      }),
    doc: "position of the maximum in the window (1 = oldest, d = today)",
  },
  ts_rank: {
    args: ["s", "k"],
    fn: (i, [x], [d]) =>
      windowed(i, d, x, (lo) => {
        let c = 0;
        for (let j = lo; j <= i; j++) if (x[j] <= x[i]) c++;
        return c / d;
      }),
    doc: "rank of today's value within the last d bars, in (0, 1]",
  },
  product: {
    args: ["s", "k"],
    fn: (i, [x], [d]) =>
      windowed(i, d, x, (lo) => {
        let p = 1;
        for (let j = lo; j <= i; j++) p *= x[j];
        return p;
      }),
    doc: "product over d bars",
  },
  decay_linear: {
    args: ["s", "k"],
    fn: (i, [x], [d]) =>
      windowed(i, d, x, (lo) => {
        let s = 0;
        for (let j = lo; j <= i; j++) s += x[j] * (j - lo + 1);
        return s / ((d * (d + 1)) / 2);
      }),
    doc: "weighted average with weights d (today) down to 1",
  },
  correlation: {
    args: ["s", "s", "k"],
    fn: (i, [x, y], [d]) =>
      windowed(i, d, x, (lo) => {
        const mx = mean(x, lo, i);
        const my = mean(y, lo, i);
        let sxy = 0;
        let sxx = 0;
        let syy = 0;
        for (let j = lo; j <= i; j++) {
          sxy += (x[j] - mx) * (y[j] - my);
          sxx += (x[j] - mx) ** 2;
          syy += (y[j] - my) ** 2;
        }
        return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
      }),
    doc: "Pearson correlation of x and y over d bars",
  },
  covariance: {
    args: ["s", "s", "k"],
    fn: (i, [x, y], [d]) =>
      windowed(i, d, x, (lo) => {
        const mx = mean(x, lo, i);
        const my = mean(y, lo, i);
        let s = 0;
        for (let j = lo; j <= i; j++) s += (x[j] - mx) * (y[j] - my);
        return s / d;
      }),
    doc: "covariance of x and y over d bars",
  },
  ema: {
    args: ["s", "k"],
    // Seeded with the first value, matching indicators.ema.
    fn: (i, [x], [d], out) => {
      if (i === 0 || Number.isNaN(out[i - 1])) return x[i];
      const k = 2 / (d + 1);
      return x[i] * k + out[i - 1] * (1 - k);
    },
    doc: "exponential moving average",
  },
  rsi: {
    args: ["s", "k"],
    aux: 2,
    // Wilder's smoothing, matching indicators.rsi; aux = average gain / loss.
    fn: (i, [x], [d], _out, [gain, loss]) => {
      gain[i] = NaN;
      loss[i] = NaN;
      if (i < d) return NaN;
      if (i === d) {
        let g = 0;
        let l = 0;
        for (let j = 1; j <= d; j++) {
          const diff = x[j] - x[j - 1];
          if (diff >= 0) g += diff;
          else l -= diff;
        }
        gain[i] = g / d;
        loss[i] = l / d;
      } else {
        const diff = x[i] - x[i - 1];
        gain[i] = (gain[i - 1] * (d - 1) + (diff > 0 ? diff : 0)) / d;
        loss[i] = (loss[i - 1] * (d - 1) + (diff < 0 ? -diff : 0)) / d;
      }
      return loss[i] === 0 ? 100 : 100 - 100 / (1 + gain[i] / loss[i]);
    },
    doc: "relative strength index (0-100)",
  },
  cross_above: {
    args: ["s", "s"],
    fn: (i, [x, y]) => (i < 1 ? 0 : b(x[i - 1] <= y[i - 1] && x[i] > y[i])),
    doc: "x crossed from at or below y to above it on this bar",
  },
  cross_below: {
    args: ["s", "s"],
    fn: (i, [x, y]) => (i < 1 ? 0 : b(x[i - 1] >= y[i - 1] && x[i] < y[i])),
    doc: "x crossed from at or above y to below it on this bar",
  },
  streak: {
    args: ["s"],
    fn: (i, [c], _k, out) => (truthy(c[i]) ? (i > 0 ? out[i - 1] : 0) + 1 : 0),
    doc: "consecutive bars (ending today) on which the condition held",
  },
};

/** Alpha101 spellings and convenience names. */
export const ALIASES: Record<string, string> = {
  sum: "ts_sum",
  mean: "sma",
  ma: "sma",
  std: "stddev",
  corr: "correlation",
  cov: "covariance",
  ts_mean: "sma",
  ts_stddev: "stddev",
  ts_product: "product",
  ts_corr: "correlation",
  ts_cov: "covariance",
  ts_delay: "delay",
  ts_delta: "delta",
  ts_decay_linear: "decay_linear",
};

/** Series available by name. `price` is the live price on the current bar and the close before it. */
export const FIELDS = ["open", "high", "low", "close", "volume", "vwap", "returns", "price", "bar"] as const;
export type Field = (typeof FIELDS)[number];

/** Names that need a cross-section of instruments; not available on a single-instrument bot yet. */
export const CROSS_SECTIONAL = new Set(["rank", "scale", "indneutralize"]);
