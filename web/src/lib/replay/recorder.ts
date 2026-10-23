import { equity, type GameEngine, type Trader } from "@/lib/sim/engine";
import type { Candle } from "@/lib/sim/types";
import type {
  ReplayCandle,
  ReplayEvent,
  ReplayMode,
  ReplayParticipant,
  ReplayRecording,
} from "./types";

const HISTORY_BARS = 120;
const MAX_SAMPLES = 1200;

function round(n: number): number {
  return Number.isFinite(n) ? Number(n.toPrecision(7)) : 0;
}

export function packCandle(c: Candle): ReplayCandle {
  const out: ReplayCandle = [c.time, round(c.open), round(c.high), round(c.low), round(c.close)];
  if (c.date) out.push(c.date);
  return out;
}

export function unpackCandle(c: ReplayCandle): Candle {
  return { time: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: 0, date: c[5] };
}

export interface RecorderOptions {
  mode: ReplayMode;
  room?: string;
  roundNumber?: number;
  marketId: string;
  marketLabel: string;
  msPerTick: number;
  me: { id: string; name: string; color: string } | null;
}

/**
 * Records a round as it is simulated: the price after every tick, closed bars,
 * every open/close of the local player and the bots (derived by diffing
 * positions), remote players' trades and chat, plus per-bar equity samples.
 */
export class ReplayRecorder {
  private rec: ReplayRecording;
  private posKey = new Map<string, string>();
  private meId: string | null;
  private lastBar: number;
  private lastTick: number;
  private sampleEvery = 1;
  private barsSinceSample = 0;
  remoteEquity: () => Record<string, number> = () => ({});

  constructor(engine: GameEngine, opts: RecorderOptions) {
    this.meId = opts.me?.id ?? null;
    const participants: ReplayParticipant[] = [];
    if (opts.me) participants.push({ ...opts.me, kind: "me" });
    for (const b of engine.bots) participants.push({ id: b.id, name: b.name, color: b.color, kind: "bot" });
    this.lastTick = engine.ticks;
    this.lastBar = engine.market.bar;
    this.rec = {
      v: 1,
      mode: opts.mode,
      room: opts.room,
      roundNumber: opts.roundNumber,
      marketId: opts.marketId,
      marketLabel: opts.marketLabel,
      msPerTick: opts.msPerTick,
      startedAt: Date.now(),
      startTick: engine.ticks,
      durationTicks: 0,
      history: engine.market.candles.slice(-HISTORY_BARS).map(packCandle),
      bars: [],
      prices: [],
      participants,
      events: [],
      samples: [],
    };
    this.syncPositions(engine);
    this.sample(engine);
  }

  get tick(): number {
    return this.lastTick;
  }

  private traders(engine: GameEngine): { id: string; t: Trader }[] {
    const list = engine.bots.map((b) => ({ id: b.id, t: b }));
    if (this.meId) list.unshift({ id: this.meId, t: engine.player });
    return list;
  }

  /** Call after every engine.step(). */
  afterStep(engine: GameEngine): ReplayEvent[] {
    this.lastTick = engine.ticks;
    this.rec.prices.push(round(engine.market.currentPrice));
    if (engine.market.bar > this.lastBar) {
      this.lastBar = engine.market.bar;
      const closed = engine.market.candles[engine.market.candles.length - 1];
      if (closed) this.rec.bars.push({ t: engine.ticks, c: packCandle(closed) });
      if (++this.barsSinceSample >= this.sampleEvery) this.sample(engine);
    }
    return this.syncPositions(engine);
  }

  /** Detect opens/closes of the local player and bots since the last call. */
  syncPositions(engine: GameEngine): ReplayEvent[] {
    const out: ReplayEvent[] = [];
    const t = this.lastTick;
    for (const { id, t: trader } of this.traders(engine)) {
      const pos = trader.account.position;
      const key = pos ? `${pos.side}@${pos.entry}@${pos.openBar}` : "";
      const prev = this.posKey.get(id) ?? "";
      if (key === prev) continue;
      this.posKey.set(id, key);
      if (prev) {
        const last = trader.account.closed[trader.account.closed.length - 1];
        out.push({ t, k: "close", id, price: round(last?.exit ?? engine.market.currentPrice), pnl: last ? round(last.pnl) : undefined });
      }
      if (pos) out.push({ t, k: "open", id, side: pos.side, price: round(pos.entry) });
    }
    this.rec.events.push(...out);
    return out;
  }

  addParticipant(p: ReplayParticipant) {
    if (!this.rec.participants.some((x) => x.id === p.id)) this.rec.participants.push(p);
  }

  addEvent(ev: ReplayEvent) {
    this.rec.events.push({ ...ev, t: Math.max(this.rec.startTick, Math.min(ev.t, this.lastTick)) });
  }

  private sample(engine: GameEngine) {
    const price = engine.market.currentPrice;
    const eq: Record<string, number> = {};
    for (const { id, t } of this.traders(engine)) eq[id] = Math.round(equity(t, price) * 100) / 100;
    for (const [id, v] of Object.entries(this.remoteEquity())) {
      if (Number.isFinite(v)) eq[id] = Math.round(v * 100) / 100;
    }
    this.rec.samples.push({ t: this.lastTick, eq });
    this.barsSinceSample = 0;
    // Long (fast-forwarded) solo rounds: halve the sample density instead of growing unbounded.
    if (this.rec.samples.length > MAX_SAMPLES) {
      this.rec.samples = this.rec.samples.filter((_, i) => i % 2 === 0);
      this.sampleEvery *= 2;
    }
  }

  finish(engine: GameEngine): ReplayRecording {
    this.syncPositions(engine);
    this.sample(engine);
    this.rec.durationTicks = this.lastTick;
    this.rec.events.sort((a, b) => a.t - b.t);
    return this.rec;
  }
}
