import { ALL_STRATEGIES, type Strategy } from "./strategies";
import { BASE_ELO, type BotSpec } from "./botFactory";
import type { Account, ClosedTrade, IMarket, Position, Side } from "./types";

export const STARTING_BALANCE = 10000;

export interface Trader {
  id: string;
  kind: "player" | "bot";
  name: string;
  color: string;
  blurb: string;
  exposure: number; // notional multiple of balance per trade
  exposureMult: number; // transient multiplier (Leverage power-up); 1 normally
  rating: number; // ELO; bots carry implied ratings, player rating is external
  shieldActive: boolean; // Hedge Shield: refunds the next losing trade
  account: Account;
  strategy?: Strategy;
  state: Record<string, number>;
}

function newAccount(): Account {
  return { balance: STARTING_BALANCE, position: null, closed: [], peakEquity: STARTING_BALANCE };
}

function unrealized(pos: Position | null, price: number): number {
  if (!pos) return 0;
  const dir = pos.side === "long" ? 1 : -1;
  return (price - pos.entry) * pos.size * dir;
}

export function equity(t: Trader, price: number): number {
  return t.account.balance + unrealized(t.account.position, price);
}

export function openPosition(
  t: Trader,
  side: Side,
  price: number,
  slPct?: number,
  tpPct?: number,
  openBar = 0,
) {
  if (t.account.position) return; // one position at a time
  const notional = t.account.balance * t.exposure * t.exposureMult;
  const size = Math.max(0, notional / price);
  if (size <= 0) return;
  const sl =
    slPct !== undefined
      ? side === "long"
        ? price * (1 - slPct)
        : price * (1 + slPct)
      : undefined;
  const tp =
    tpPct !== undefined
      ? side === "long"
        ? price * (1 + tpPct)
        : price * (1 - tpPct)
      : undefined;
  t.account.position = { side, entry: price, size, openBar, sl, tp };
}

export function closePosition(t: Trader, price: number, bar: number) {
  const pos = t.account.position;
  if (!pos) return;
  let pnl = unrealized(pos, price);
  // Hedge Shield refunds a single losing trade, then is consumed.
  if (t.shieldActive && pnl < 0) {
    pnl = 0;
    t.shieldActive = false;
  }
  t.account.balance += pnl;
  const trade: ClosedTrade = {
    side: pos.side,
    entry: pos.entry,
    exit: price,
    size: pos.size,
    pnl,
    openBar: pos.openBar,
    closeBar: bar,
  };
  t.account.closed.push(trade);
  if (t.account.closed.length > 200) t.account.closed.shift();
  t.account.position = null;
}

export interface EngineConfig {
  playerExposure?: number;
  botExposure?: number;
}

// Default field used when no roguelike specs are supplied (the synced
// multiplayer race and any fallback). Mirrors the original six fixed bots.
function defaultBotSpecs(exposure: number): BotSpec[] {
  return ALL_STRATEGIES.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    blurb: s.blurb,
    exposure,
    rating: BASE_ELO,
    strategy: s,
  }));
}

export class GameEngine {
  market: IMarket;
  player: Trader;
  bots: Trader[];
  ticks = 0; // gameplay ticks elapsed (excludes market warmup)
  botsFrozen = false; // Freeze power-up: bots stop making decisions

  constructor(market: IMarket, bots?: BotSpec[], cfg: EngineConfig = {}) {
    this.market = market;
    this.player = {
      id: "you",
      kind: "player",
      name: "You",
      color: "#34d399",
      blurb: "Your discretionary trades.",
      exposure: cfg.playerExposure ?? 2,
      exposureMult: 1,
      rating: BASE_ELO,
      shieldActive: false,
      account: newAccount(),
      state: {},
    };
    const specs = bots ?? defaultBotSpecs(cfg.botExposure ?? 2);
    this.bots = specs.map((s) => ({
      id: s.id,
      kind: "bot" as const,
      name: s.name,
      color: s.color,
      blurb: s.blurb,
      exposure: s.exposure,
      exposureMult: 1,
      rating: s.rating,
      shieldActive: false,
      account: newAccount(),
      strategy: s.strategy,
      state: {},
    }));
  }

  private checkStops(t: Trader, price: number, bar: number) {
    const pos = t.account.position;
    if (!pos) return;
    if (pos.side === "long") {
      if (pos.sl !== undefined && price <= pos.sl) return closePosition(t, pos.sl, bar);
      if (pos.tp !== undefined && price >= pos.tp) return closePosition(t, pos.tp, bar);
    } else {
      if (pos.sl !== undefined && price >= pos.sl) return closePosition(t, pos.sl, bar);
      if (pos.tp !== undefined && price <= pos.tp) return closePosition(t, pos.tp, bar);
    }
  }

  private runBot(bot: Trader) {
    if (!bot.strategy) return;
    const ctx = {
      candles: this.market.candles,
      closes: this.market.closes(),
      price: this.market.currentPrice,
    };
    const decision = bot.strategy.onBar(ctx, bot.account.position, bot.state);
    if (!decision) return;
    if (decision.close) closePosition(bot, this.market.currentPrice, this.market.bar);
    if (decision.open) {
      openPosition(
        bot,
        decision.open.side,
        this.market.currentPrice,
        decision.open.slPct,
        decision.open.tpPct,
      );
      const pos = bot.account.position;
      if (pos) pos.openBar = this.market.bar;
    }
  }

  // Advance the simulation by one tick.
  step() {
    this.ticks++;
    const newBar = this.market.tick();
    const price = this.market.currentPrice;
    const bar = this.market.bar;

    // Stops are evaluated every tick for everyone.
    this.checkStops(this.player, price, bar);
    for (const b of this.bots) this.checkStops(b, price, bar);

    // Bot decisions run on bar close (matching the EA "new bar" logic) unless
    // the player has frozen the field with a power-up.
    if (newBar && !this.botsFrozen) {
      for (const b of this.bots) this.runBot(b);
    }

    // Track peak equity for drawdown stats.
    const pe = equity(this.player, price);
    if (pe > this.player.account.peakEquity) this.player.account.peakEquity = pe;
    for (const b of this.bots) {
      const e = equity(b, price);
      if (e > b.account.peakEquity) b.account.peakEquity = e;
    }
  }

  // Player controls.
  playerLong() {
    if (this.player.account.position?.side === "short")
      closePosition(this.player, this.market.currentPrice, this.market.bar);
    if (!this.player.account.position) {
      openPosition(this.player, "long", this.market.currentPrice, undefined, undefined, this.market.bar);
    }
  }

  playerShort() {
    if (this.player.account.position?.side === "long")
      closePosition(this.player, this.market.currentPrice, this.market.bar);
    if (!this.player.account.position) {
      openPosition(this.player, "short", this.market.currentPrice, undefined, undefined, this.market.bar);
    }
  }

  playerClose() {
    closePosition(this.player, this.market.currentPrice, this.market.bar);
  }

  setPlayerExposure(x: number) {
    this.player.exposure = x;
  }
}
