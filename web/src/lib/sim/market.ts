import { mulberry32, gaussian } from "./rng";
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

// Generates a synthetic price series with trends, consolidations and
// volatility clustering so the ported strategies have structure to trade.
export class Market implements IMarket {
  readonly cfg: MarketConfig;
  readonly label = "Random (synthetic)";
  private rand: () => number;
  private price: number;
  private trend = 0;
  private vol: number;
  private tickInBar = 0;
  private barIndex = 0;
  private forming: Candle;
  candles: Candle[] = [];

  constructor(cfg: MarketConfig = DEFAULT_MARKET) {
    this.cfg = cfg;
    this.rand = mulberry32(cfg.seed);
    this.price = cfg.startPrice;
    this.vol = cfg.baseVol;
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
    return this.price;
  }

  get bar(): number {
    return this.barIndex;
  }

  // Advance one tick. Returns true when a new bar has just closed.
  tick(): boolean {
    // Slowly wandering drift with occasional regime shifts (trends vs ranges).
    this.trend = this.trend * 0.985 + gaussian(this.rand) * 0.00035;
    if (this.rand() < 0.012) this.trend += (this.rand() - 0.5) * 0.0055;
    this.trend = Math.max(-0.004, Math.min(0.004, this.trend));

    // Volatility clustering.
    this.vol = this.vol * 0.97 + this.cfg.baseVol * 0.03;
    if (this.rand() < 0.02) this.vol *= 1 + this.rand() * 1.5;
    this.vol = Math.max(this.cfg.baseVol * 0.4, Math.min(this.cfg.baseVol * 5, this.vol));

    const ret = this.trend + this.vol * gaussian(this.rand);
    this.price = Math.max(1, this.price * (1 + ret));

    const c = this.forming;
    c.close = this.price;
    if (this.price > c.high) c.high = this.price;
    if (this.price < c.low) c.low = this.price;
    c.volume += 1 + Math.floor(Math.abs(ret) / this.cfg.baseVol);

    this.tickInBar++;
    if (this.tickInBar >= this.cfg.ticksPerBar) {
      this.candles.push(c);
      if (this.candles.length > this.cfg.maxHistory) this.candles.shift();
      this.tickInBar = 0;
      this.barIndex++;
      this.forming = this.newCandle(this.price);
      return true;
    }
    return false;
  }

  // Candles including the currently forming one (for live rendering).
  view(): Candle[] {
    return [...this.candles, this.forming];
  }

  closes(): number[] {
    const arr = this.candles.map((c) => c.close);
    return arr;
  }
}
