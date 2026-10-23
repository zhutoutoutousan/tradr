"use client";

import { offlineStorage } from './offline-storage';

const MARKET_SYMBOLS = [
  'aapl', 'amd', 'amzn', 'googl', 'meta', 'msft', 'nvda', 'tsla',
  'spy', 'qqq', 'btcusd', 'ethusd', 'eurusd', 'gbpusd', 'usdjpy',
  'bac', 'dis', 'nflx', 'ba', 'pfe', 'intc', 'csco', 'orcl', 'unh', 'mcd'
];

const FRESH_MS = 24 * 60 * 60 * 1000;

export async function precacheMarketData(signal?: AbortSignal): Promise<void> {
  console.log('[Precache] Starting market data caching...');
  
  let cached = 0;
  let failed = 0;

  for (const symbol of MARKET_SYMBOLS) {
    if (signal?.aborted) {
      console.log('[Precache] Aborted');
      break;
    }

    try {
      const existing = await offlineStorage.getCachedData(`market-${symbol}`).catch(() => null);
      if (existing && Date.now() - existing.timestamp < FRESH_MS) {
        cached++;
        continue;
      }
      const response = await fetch(`/data/${symbol}.json`, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      await offlineStorage.cacheData(`market-${symbol}`, {
        candles: data,
        timestamp: Date.now()
      });

      cached++;
      console.log(`[Precache] Cached ${symbol} (${cached}/${MARKET_SYMBOLS.length})`);
    } catch (error) {
      failed++;
      // Offline or the page is going away: the remaining fetches would fail the same way.
      if (signal?.aborted || error instanceof TypeError) {
        console.warn(`[Precache] Stopped at ${symbol}:`, error);
        break;
      }
      console.warn(`[Precache] Failed to cache ${symbol}:`, error);
    }
  }

  console.log(`[Precache] Complete: ${cached} cached, ${failed} failed`);
}

export async function getCachedMarketData(symbol: string): Promise<any | null> {
  try {
    const cached = await offlineStorage.getCachedData(`market-${symbol}`);
    if (!cached) return null;

    const ageMs = Date.now() - cached.timestamp;
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours > 24) {
      console.log(`[Precache] Cached data for ${symbol} is ${ageHours.toFixed(1)}h old`);
    }

    return cached.candles;
  } catch (error) {
    console.error(`[Precache] Failed to get cached data for ${symbol}:`, error);
    return null;
  }
}

export async function isPrecached(): Promise<boolean> {
  try {
    const firstSymbol = MARKET_SYMBOLS[0];

const FRESH_MS = 24 * 60 * 60 * 1000;
    const cached = await offlineStorage.getCachedData(`market-${firstSymbol}`);
    return !!cached;
  } catch {
    return false;
  }
}

export function startBackgroundPrecache(): void {
  if (typeof window === 'undefined') return;
  const controller = new AbortController();
  window.addEventListener('pagehide', () => controller.abort(), { once: true });
  const run = () => {
    if (!navigator.onLine) return;
    precacheMarketData(controller.signal).catch((err) => console.warn('[Precache]', err));
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 10000 });
  } else {
    setTimeout(run, 2000);
  }
}
