import type { Candle } from "@/lib/sim/types";
import { ema, macd, rsi, stdLast, stochastic, adx, vwap, sma } from "@/lib/sim/indicators";
import type { ChartIndicator } from "@/lib/game/roundSetup";

export interface OverlayLine {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

export function buildOverlays(candles: Candle[], indicators: ChartIndicator[]): OverlayLine[] {
  const closed = candles.slice(0, -1);
  const closes = closed.map((c) => c.close);
  const lines: OverlayLine[] = [];

  for (const ind of indicators) {
    if (ind.kind === "sma") {
      lines.push({ label: ind.label, color: ind.color, values: sma(closes, ind.period) });
    } else if (ind.kind === "ema") {
      lines.push({ label: ind.label, color: ind.color, values: ema(closes, ind.period) });
    } else if (ind.kind === "rsi") {
      lines.push({ label: ind.label, color: ind.color, values: rsi(closes, ind.period), dashed: true });
    } else if (ind.kind === "macd") {
      const { macd: m } = macd(closes, 12, 26, 9);
      lines.push({ label: ind.label, color: ind.color, values: m, dashed: true });
    } else if (ind.kind === "bollinger") {
      const mid = sma(closes, ind.period);
      lines.push({ label: `BB mid(${ind.period})`, color: ind.color, values: mid });
      const upper: number[] = closes.map((_, i) => {
        if (i < ind.period - 1) return NaN;
        const window = closes.slice(i - ind.period + 1, i + 1);
        const m = mid[i];
        const sd = stdLast(window, ind.period);
        return Number.isNaN(sd) ? NaN : m + 2 * sd;
      });
      const lower: number[] = closes.map((_, i) => {
        if (i < ind.period - 1) return NaN;
        const window = closes.slice(i - ind.period + 1, i + 1);
        const m = mid[i];
        const sd = stdLast(window, ind.period);
        return Number.isNaN(sd) ? NaN : m - 2 * sd;
      });
      lines.push({ label: "BB upper", color: ind.color, values: upper, dashed: true });
      lines.push({ label: "BB lower", color: ind.color, values: lower, dashed: true });
    } else if (ind.kind === "stochastic") {
      const { k, d } = stochastic(closed, ind.period, 3);
      lines.push({ label: `%K(${ind.period})`, color: ind.color, values: k, dashed: true });
      lines.push({ label: "%D(3)", color: ind.color, values: d, dashed: true });
    } else if (ind.kind === "adx") {
      const adxValues = adx(closed, ind.period);
      lines.push({ label: ind.label, color: ind.color, values: adxValues, dashed: true });
    } else if (ind.kind === "vwap") {
      const vwapValues = vwap(closed);
      lines.push({ label: ind.label, color: ind.color, values: vwapValues });
    }
  }
  return lines;
}
