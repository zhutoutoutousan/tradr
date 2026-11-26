import type { Candle } from "./types";

// Wilder's RSI over closing prices. Returns an array aligned with `closes`
// where the first `period` entries are NaN (not enough data).
export function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length <= period) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

// Exponential moving average aligned with `values`.
export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length === 0) return out;
  const k = 2 / (period + 1);
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

// Average True Range (simple mean of true range over `period`).
export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const hl = c.high - c.low;
    const hc = Math.abs(c.high - prevClose);
    const lc = Math.abs(c.low - prevClose);
    sum += Math.max(hl, hc, lc);
  }
  return sum / period;
}

// Simple moving average over the last `period` values.
export function smaLast(values: number[], period: number): number {
  if (values.length < period) return NaN;
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) s += values[i];
  return s / period;
}

// Population standard deviation over the last `period` values.
export function stdLast(values: number[], period: number): number {
  if (values.length < period) return NaN;
  const m = smaLast(values, period);
  let s = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - m;
    s += d * d;
  }
  return Math.sqrt(s / period);
}

// MACD line + signal line aligned with `closes`.
export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const line = closes.map((_, i) => ef[i] - es[i]);
  const signal = ema(line, signalPeriod);
  return { macd: line, signal };
}
