export type Side = "long" | "short";

export interface Candle {
  time: number; // bar index (sequential)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string; // optional calendar date for historical data
}

// Common surface for both the synthetic and historical price feeds so the
// game engine can drive either interchangeably.
export interface IMarket {
  readonly currentPrice: number;
  readonly bar: number;
  candles: Candle[]; // closed candles (oldest -> newest)
  label: string;
  date: string | null; // calendar date of the latest candle, if any
  tick(): boolean; // advance one tick; returns true when a bar just closed
  view(): Candle[]; // closed candles + the forming candle
  closes(): number[];
}

export interface Position {
  side: Side;
  entry: number;
  size: number; // units
  openBar: number;
  sl?: number;
  tp?: number;
}

export interface ClosedTrade {
  side: Side;
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  openBar: number;
  closeBar: number;
}

export interface Account {
  balance: number; // realized cash
  position: Position | null;
  closed: ClosedTrade[];
  peakEquity: number;
}

export type TraderKind = "player" | "bot";

export interface MarketSnapshot {
  candles: Candle[];
  price: number; // latest price (forming candle close)
  bar: number; // current bar index
}
