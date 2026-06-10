import { RNG } from "@/lib/sim/rng";
import type { MarketOption } from "@/components/GameView";

export type TimeframeId = "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

export const TIMEFRAMES: Record<TimeframeId, { label: string; ticksPerBar: number }> = {
  "5m": { label: "5m", ticksPerBar: 3 },
  "15m": { label: "15m", ticksPerBar: 5 },
  "30m": { label: "30m", ticksPerBar: 7 },
  "1h": { label: "1H", ticksPerBar: 9 },
  "4h": { label: "4H", ticksPerBar: 15 },
  "1d": { label: "1D", ticksPerBar: 24 },
};

export type IndicatorKind = "sma" | "ema" | "rsi" | "macd" | "bollinger";

export interface ChartIndicator {
  kind: IndicatorKind;
  period: number;
  label: string;
  color: string;
}

export interface RoundSetup {
  instrumentId: string;
  timeframe: TimeframeId;
  ticksPerBar: number;
  timeframeLabel: string;
  indicators: ChartIndicator[];
}

const INDICATOR_DEFS: { kind: IndicatorKind; basePeriod: number; color: string; name: string }[] = [
  { kind: "sma", basePeriod: 20, color: "#fbbf24", name: "SMA" },
  { kind: "ema", basePeriod: 21, color: "#a78bfa", name: "EMA" },
  { kind: "rsi", basePeriod: 14, color: "#22d3ee", name: "RSI" },
  { kind: "macd", basePeriod: 12, color: "#f472b6", name: "MACD" },
  { kind: "bollinger", basePeriod: 20, color: "#2dd4bf", name: "BB" },
];

const TF_IDS = Object.keys(TIMEFRAMES) as TimeframeId[];

export function pickRoundSetup(seed: number, markets: MarketOption[]): RoundSetup {
  const r = new RNG((seed ^ 0xc2b2ae35) >>> 0);
  const pool = ["synthetic", ...markets.map((m) => m.id)];
  const instrumentId = pool[r.int(0, pool.length - 1)];
  const timeframe = r.pick(TF_IDS);
  const tf = TIMEFRAMES[timeframe];

  const count = r.int(2, 3);
  const kinds = r.shuffle(INDICATOR_DEFS).slice(0, count);
  const indicators: ChartIndicator[] = kinds.map((d) => {
    const period = Math.max(5, d.basePeriod + r.int(-4, 6));
    return {
      kind: d.kind,
      period,
      label: `${d.name}(${period})`,
      color: d.color,
    };
  });

  return {
    instrumentId,
    timeframe,
    ticksPerBar: tf.ticksPerBar,
    timeframeLabel: tf.label,
    indicators,
  };
}

export function instrumentLabel(id: string, markets: MarketOption[]): string {
  if (id === "synthetic") return "Random (synthetic)";
  return markets.find((m) => m.id === id)?.name ?? id.toUpperCase();
}
