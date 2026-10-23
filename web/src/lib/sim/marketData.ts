import { GameEngine } from "@/lib/sim/engine";
import { Market, DEFAULT_MARKET } from "@/lib/sim/market";
import { HistoricalMarket } from "@/lib/sim/historical";
import type { Candle } from "@/lib/sim/types";

export const SYNTHETIC = "synthetic";

export interface InstrumentOption {
  id: string;
  name: string;
  kind: string;
}

export interface MarketData {
  name: string;
  candles: Candle[];
}

export type PickMode = "vote" | "host";

/** Fetch with a deadline: a tether without internet can report onLine and then hang. */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function loadInstrumentIndex(timeoutMs = 8000): Promise<InstrumentOption[]> {
  try {
    const r = await fetchWithTimeout("/data/index.json", timeoutMs);
    if (!r.ok) return [];
    const list = (await r.json()) as InstrumentOption[];
    return list.map(({ id, name, kind }) => ({ id, name, kind }));
  } catch {
    return [];
  }
}

/** Raw JSON text of a market file, so it can be relayed to peers unchanged. */
export async function loadMarketText(id: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const r = await fetchWithTimeout(`/data/${id}.json`, timeoutMs);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

export function parseMarket(text: string): MarketData | null {
  try {
    const d = JSON.parse(text) as Partial<MarketData>;
    if (!d || !Array.isArray(d.candles) || d.candles.length < 10) return null;
    return { name: d.name ?? "Market", candles: d.candles };
  } catch {
    return null;
  }
}

/** Ids whose data file is in the service-worker cache (playable without internet). */
export async function cachedInstrumentIds(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (typeof caches === "undefined") return out;
  await Promise.all(
    ids.map(async (id) => {
      try {
        if (await caches.match(`/data/${id}.json`)) out.add(id);
      } catch {}
    }),
  );
  return out;
}

export function buildEngine(id: string, data: MarketData | null, seed: number): GameEngine {
  if (id === SYNTHETIC || !data) return new GameEngine(new Market({ ...DEFAULT_MARKET, seed }));
  return new GameEngine(new HistoricalMarket(data.candles, data.name, undefined, seed));
}

/** Count votes per instrument. */
export function tallyVotes(votes: Iterable<string | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of votes) if (v) out[v] = (out[v] ?? 0) + 1;
  return out;
}

/**
 * Draw an instrument with probability proportional to its votes. Without votes
 * every real market is equally likely.
 */
export function weightedPick(counts: Record<string, number>, options: InstrumentOption[], rand = Math.random): string {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    if (options.length === 0) return SYNTHETIC;
    return options[Math.floor(rand() * options.length)].id;
  }
  const total = entries.reduce((s, [, n]) => s + n, 0);
  let r = rand() * total;
  for (const [id, n] of entries) {
    r -= n;
    if (r < 0) return id;
  }
  return entries[entries.length - 1][0];
}
