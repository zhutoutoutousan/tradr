import type { Candle, IMarket } from "./types";

export interface HistoricalConfig {
  ticksPerBar: number;
  maxHistory: number;
  warmup: number;
}

export const DEFAULT_HISTORICAL: HistoricalConfig = {
  ticksPerBar: 6,
  maxHistory: 600,
  warmup: 80,
};

// Replays real OHLC candles. Each real candle is animated over `ticksPerBar`
// sub-ticks tracing open -> low/high -> close so the chart moves smoothly and
// intra-bar stop/target hits behave realistically. When a candle finishes, the
// exact real OHLC candle is committed to history (so indicators see real data).
export class HistoricalMarket implements IMarket {
  readonly label: string;
  candles: Candle[] = [];
  private data: Candle[];
  private cfg: HistoricalConfig;
  private cursor: number; // index of the real candle currently forming
  private loopStart: number;
  private completed: number; // total committed candles (monotonic bar index)
  private tickInBar = 0;
  private path: number[] = [];
  private price: number;
  private forming: Candle;

  constructor(data: Candle[], label: string, cfg: HistoricalConfig = DEFAULT_HISTORICAL) {
    this.data = data;
    this.label = label;
    this.cfg = cfg;

    const warmup = Math.max(0, Math.min(cfg.warmup, data.length - 2));
    this.loopStart = warmup;
    this.completed = warmup;
    this.candles = data.slice(0, warmup).map((c, i) => ({ ...c, time: i }));
    if (this.candles.length > cfg.maxHistory) this.candles = this.candles.slice(-cfg.maxHistory);

    this.cursor = warmup;
    const first = data[this.cursor] ?? data[data.length - 1];
    this.price = first.open;
    this.forming = this.newForming(first.open);
  }

  private newForming(open: number): Candle {
    return { time: this.completed, open, high: open, low: open, close: open, volume: 0 };
  }

  // Build the intra-bar price path for a real candle.
  private buildPath(c: Candle, n: number): number[] {
    if (n <= 1) return [c.close];
    const up = c.close >= c.open;
    const wp = up ? [c.open, c.low, c.high, c.close] : [c.open, c.high, c.low, c.close];
    const seg = (n - 1) / 3;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      let s = Math.floor(i / seg);
      if (s > 2) s = 2;
      const local = seg === 0 ? 0 : (i - s * seg) / seg;
      out.push(wp[s] + (wp[s + 1] - wp[s]) * local);
    }
    out[0] = c.open;
    out[n - 1] = c.close;
    return out;
  }

  get currentPrice(): number {
    return this.price;
  }

  get bar(): number {
    return this.completed;
  }

  get date(): string | null {
    const idx = Math.min(this.cursor, this.data.length - 1);
    return this.data[idx]?.date ?? null;
  }

  tick(): boolean {
    const n = this.cfg.ticksPerBar;
    const target = this.data[this.cursor];
    if (!target) return false;

    if (this.tickInBar === 0) {
      this.path = this.buildPath(target, n);
      this.forming = this.newForming(target.open);
    }

    this.price = this.path[this.tickInBar];
    const f = this.forming;
    f.close = this.price;
    if (this.price > f.high) f.high = this.price;
    if (this.price < f.low) f.low = this.price;
    f.volume = Math.round((target.volume * (this.tickInBar + 1)) / n);

    this.tickInBar++;
    if (this.tickInBar >= n) {
      // Commit the exact real candle so indicators read real history.
      this.candles.push({ ...target, time: this.completed });
      if (this.candles.length > this.cfg.maxHistory) this.candles.shift();
      this.completed++;
      this.tickInBar = 0;
      this.cursor++;
      if (this.cursor >= this.data.length) this.cursor = this.loopStart; // loop replay
      const next = this.data[this.cursor];
      this.price = next.open;
      this.forming = this.newForming(next.open);
      return true;
    }
    return false;
  }

  view(): Candle[] {
    return [...this.candles, this.forming];
  }

  closes(): number[] {
    return this.candles.map((c) => c.close);
  }
}
