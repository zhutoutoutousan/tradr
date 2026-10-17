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
  return { macd: line, signal, histogram: line.map((v, i) => v - signal[i]) };
}

// Simple Moving Average (SMA) - full array
export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - j];
    }
    out[i] = sum / period;
  }
  return out;
}

// Bollinger Bands - returns upper, middle, lower bands
export function bollingerBands(closes: number[], period = 20, stdDev = 2): { 
  upper: number[], 
  middle: number[], 
  lower: number[] 
} {
  const middle = sma(closes, period);
  const upper = new Array<number>(closes.length).fill(NaN);
  const lower = new Array<number>(closes.length).fill(NaN);
  
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      const diff = closes[i - j] - middle[i];
      sum += diff * diff;
    }
    const std = Math.sqrt(sum / period);
    upper[i] = middle[i] + stdDev * std;
    lower[i] = middle[i] - stdDev * std;
  }
  
  return { upper, middle, lower };
}

// Stochastic Oscillator (%K and %D)
export function stochastic(candles: Candle[], kPeriod = 14, dPeriod = 3): {
  k: number[],
  d: number[]
} {
  const k = new Array<number>(candles.length).fill(NaN);
  
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highest = candles[i - kPeriod + 1].high;
    let lowest = candles[i - kPeriod + 1].low;
    
    for (let j = 0; j < kPeriod; j++) {
      const c = candles[i - j];
      if (c.high > highest) highest = c.high;
      if (c.low < lowest) lowest = c.low;
    }
    
    const current = candles[i].close;
    k[i] = highest === lowest ? 50 : ((current - lowest) / (highest - lowest)) * 100;
  }
  
  const d = sma(k, dPeriod);
  return { k, d };
}

// Average Directional Index (ADX) - trend strength indicator
export function adx(candles: Candle[], period = 14): number[] {
  const out = new Array<number>(candles.length).fill(NaN);
  if (candles.length <= period + 1) return out;
  
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;
    
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    const hl = high - low;
    const hc = Math.abs(high - prevClose);
    const lc = Math.abs(low - prevClose);
    tr.push(Math.max(hl, hc, lc));
  }
  
  for (let i = period; i < candles.length; i++) {
    const avgTR = smaLast(tr.slice(i - period, i), period);
    const avgPlusDM = smaLast(plusDM.slice(i - period, i), period);
    const avgMinusDM = smaLast(minusDM.slice(i - period, i), period);
    
    const plusDI = (avgPlusDM / avgTR) * 100;
    const minusDI = (avgMinusDM / avgTR) * 100;
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    out[i] = dx;
  }
  
  return out;
}

// Volume-Weighted Average Price (VWAP) - requires volume data
export function vwap(candles: Candle[]): number[] {
  const out = new Array<number>(candles.length).fill(NaN);
  let cumulativeTPV = 0;  // Typical Price * Volume
  let cumulativeVolume = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const volume = candles[i].volume || 1;  // Default to 1 if no volume data
    
    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;
    
    out[i] = cumulativeTPV / cumulativeVolume;
  }
  
  return out;
}
