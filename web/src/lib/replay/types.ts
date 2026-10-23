import type { Side } from "@/lib/sim/types";

export type ReplayMode = "solo" | "multiplayer";
export type ParticipantKind = "me" | "human" | "bot";

export interface ReplayParticipant {
  id: string;
  name: string;
  color: string;
  kind: ParticipantKind;
}

/** Compact candle: [time, open, high, low, close, date?] */
export type ReplayCandle = [number, number, number, number, number, string?];

export type ReplayEvent =
  | { t: number; k: "open"; id: string; side: Side; price: number }
  | { t: number; k: "close"; id: string; price: number; pnl?: number }
  | { t: number; k: "chat"; id: string; name: string; text: string };

export interface ReplayRecording {
  v: 1;
  mode: ReplayMode;
  room?: string;
  roundNumber?: number;
  marketId: string;
  marketLabel: string;
  msPerTick: number;
  startedAt: number;
  /** First recorded tick (non-zero when a client joined a race late). */
  startTick: number;
  durationTicks: number;
  /** Candles that already existed before the round started (chart context). */
  history: ReplayCandle[];
  /** Candles closed during the round, each with the tick it closed on. */
  bars: { t: number; c: ReplayCandle }[];
  /** Last traded price after every tick (index = tick - startTick - 1). */
  prices: number[];
  participants: ReplayParticipant[];
  events: ReplayEvent[];
  /** Equity of each participant, sampled every closed bar and at the end. */
  samples: { t: number; eq: Record<string, number> }[];
}

export interface ReplayComment {
  id: string;
  replay_id: string;
  tick: number;
  name: string;
  text: string;
  color: string | null;
  created_at: string;
}
