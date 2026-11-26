import { RNG } from "./rng";
import type { Candle, IMarket } from "./types";

export interface MarketConfig {
  seed: number;
  startPrice: number;
  ticksPerBar: number;
  baseVol: number; // per-tick volatility
  maxHistory: number; // candles to retain
  warmupBars: number; // bars to pre-generate before play
}

export const DEFAULT_MARKET: MarketConfig = {
  seed: 1337,
  startPrice: 100,
  ticksPerBar: 6,
  baseVol: 0.0016,
  maxHistory: 600,
  warmupBars: 80,
};

interface PriceState {
  price: number;
  trend: number;
  vol: number;
}

// Generates a synthetic price series with trends, consolidations and
// volatility clustering so the ported strategies have structure to trade.
export class Market implements IMarket {
  readonly cfg: MarketConfig;
  readonly label = "Random (synthetic)";
  private rng: RNG;
  private state: PriceState;
  private tickInBar = 0;
  private barIndex = 0;
  private forming: Candle;
  candles: Candle[] = [];

  constructor(cfg: MarketConfig = DEFAULT_MARKET) {
    this.cfg = cfg;
    this.rng = new RNG(cfg.seed);
    this.state = { price: cfg.startPrice, trend: 0, vol: cfg.baseVol };
    this.forming = this.newCandle(cfg.startPrice);
    for (let i = 0; i < cfg.warmupBars * cfg.ticksPerBar; i++) this.tick();
  }

  get date(): string | null {
    return null;
  }

  private newCandle(open: number): Candle {
    return { time: this.barIndex, open, high: open, low: open, close: open, volume: 0 };
  }

  get currentPrice(): number {
    return this.state.price;
  }

  get bar(): number {
    return this.barIndex;
  }

  // One price step. Mutates `s` and returns the tick return. The exact draw
  // order from the RNG matters: peekDirection rewinds the RNG afterwards so the
  // real path remains identical, which only holds if both paths draw the same.
  private stepPrice(s: PriceState): number {
    s.trend = s.trend * 0.985 + this.rng.gaussian() * 0.00035;
    if (this.rng.next() < 0.012) s.trend += (this.rng.next() - 0.5) * 0.0055;
    s.trend = Math.max(-0.004, Math.min(0.004, s.trend));

    s.vol = s.vol * 0.97 + this.cfg.baseVol * 0.03;
    if (this.rng.next() < 0.02) s.vol *= 1 + this.rng.next() * 1.5;
    s.vol = Math.max(this.cfg.baseVol * 0.4, Math.min(this.cfg.baseVol * 5, s.vol));

    const ret = s.trend + s.vol * this.rng.gaussian();
    s.price = Math.max(1, s.price * (1 + ret));
    return ret;
  }

  // Advance one tick. Returns true when a new bar has just closed.
  tick(): boolean {
    const ret = this.stepPrice(this.state);

    const c = this.forming;
    c.close = this.state.price;
    if (this.state.price > c.high) c.high = this.state.price;
    if (this.state.price < c.low) c.low = this.state.price;
    c.volume += 1 + Math.floor(Math.abs(ret) / this.cfg.baseVol);

    this.tickInBar++;
    if (this.tickInBar >= this.cfg.ticksPerBar) {
      this.candles.push(c);
      if (this.candles.length > this.cfg.maxHistory) this.candles.shift();
      this.tickInBar = 0;
      this.barIndex++;
      this.forming = this.newCandle(this.state.price);
      return true;
    }
    return false;
  }

  // Predicts the net direction of the next `bars` bars without disturbing the
  // live feed: simulates forward on a copy of the price state, then rewinds the
  // RNG so the real future is unchanged. Returns 1 (up), -1 (down) or 0.
  peekDirection(bars = 1): number {
    const saved = this.rng.state;
    const sim: PriceState = { ...this.state };
    const ticks = Math.max(1, bars) * this.cfg.ticksPerBar - this.tickInBar;
    for (let i = 0; i < ticks; i++) this.stepPrice(sim);
    this.rng.state = saved;
    const diff = sim.price - this.state.price;
    return diff > 0 ? 1 : diff < 0 ? -1 : 0;
  }

  // Candles including the currently forming one (for live rendering).
  view(): Candle[] {
    return [...this.candles, this.forming];
  }

  closes(): number[] {
    return this.candles.map((c) => c.close);
  }
}
