import type { Candle, Side } from "@/lib/sim/types";
import { unpackCandle } from "./recorder";
import type { ReplayParticipant, ReplayRecording } from "./types";

export const STARTING_EQUITY = 10000;

export interface PlaybackRow extends ReplayParticipant {
  equity: number;
  returnPct: number;
  position: { side: Side; entry: number } | null;
  trades: number;
}

export interface PlaybackState {
  candles: Candle[];
  price: number;
  rows: PlaybackRow[];
}

function lastIndexAtOrBefore<T extends { t: number }>(arr: T[], tick: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t <= tick) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Ticks at which the recording begins and ends. */
export function tickRange(rec: ReplayRecording): [number, number] {
  return [rec.startTick, Math.max(rec.startTick, rec.durationTicks)];
}

/** Pick a playback speed that fits the whole round into about three minutes. */
export function defaultSpeed(rec: ReplayRecording, speeds: readonly number[]): number {
  const [a, b] = tickRange(rec);
  const ms = (b - a) * rec.msPerTick;
  return speeds.find((s) => ms / s <= 185_000) ?? speeds[speeds.length - 1];
}

export function playbackAt(rec: ReplayRecording, rawTick: number, maxCandles = 160): PlaybackState {
  const [t0, t1] = tickRange(rec);
  const tick = Math.max(t0, Math.min(t1, Math.floor(rawTick)));

  const barIdx = lastIndexAtOrBefore(rec.bars, tick);
  const closed: Candle[] = [
    ...rec.history.map(unpackCandle),
    ...rec.bars.slice(0, barIdx + 1).map((b) => unpackCandle(b.c)),
  ];
  const lastClosedTick = barIdx >= 0 ? rec.bars[barIdx].t : t0;
  const from = lastClosedTick - t0;
  const to = tick - t0;
  const segment = rec.prices.slice(from, to);
  const prev = closed[closed.length - 1];
  let price = prev?.close ?? rec.prices[0] ?? 0;
  if (segment.length > 0) {
    const open = prev?.close ?? segment[0];
    price = segment[segment.length - 1];
    closed.push({
      time: (prev?.time ?? 0) + 1,
      open,
      high: Math.max(open, ...segment),
      low: Math.min(open, ...segment),
      close: price,
      volume: 0,
    });
  }
  const candles = closed.slice(-maxCandles);

  const positions = new Map<string, { side: Side; entry: number } | null>();
  const trades = new Map<string, number>();
  for (const ev of rec.events) {
    if (ev.t > tick) break;
    if (ev.k === "open") positions.set(ev.id, { side: ev.side, entry: ev.price });
    else if (ev.k === "close") {
      positions.set(ev.id, null);
      trades.set(ev.id, (trades.get(ev.id) ?? 0) + 1);
    }
  }

  const sIdx = lastIndexAtOrBefore(rec.samples, tick);
  const sample = sIdx >= 0 ? rec.samples[sIdx].eq : {};
  const rows: PlaybackRow[] = rec.participants.map((p) => {
    const equity = sample[p.id] ?? STARTING_EQUITY;
    return {
      ...p,
      equity,
      returnPct: ((equity - STARTING_EQUITY) / STARTING_EQUITY) * 100,
      position: positions.get(p.id) ?? null,
      trades: trades.get(p.id) ?? 0,
    };
  });
  rows.sort((a, b) => b.equity - a.equity);
  return { candles, price, rows };
}
