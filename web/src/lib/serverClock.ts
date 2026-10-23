// Offset between this device's clock and the server's. Phones can be seconds or
// minutes off, which breaks absolute start times shared between players.
let offsetMs = 0;
let syncing: Promise<void> | null = null;

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function serverClockOffset(): number {
  return offsetMs;
}

async function sample(): Promise<{ offset: number; rtt: number } | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const t0 = Date.now();
    const r = await fetch(`/api/time?_=${t0}`, { cache: "no-store", signal: ctl.signal });
    const t1 = Date.now();
    if (!r.ok) return null;
    const { t } = (await r.json()) as { t: number };
    if (!Number.isFinite(t)) return null;
    const rtt = t1 - t0;
    return { offset: t + rtt / 2 - t1, rtt };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Measure the offset a few times and keep the sample with the shortest round trip. */
export function syncServerClock(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    let best: { offset: number; rtt: number } | null = null;
    for (let i = 0; i < 4; i++) {
      const s = await sample();
      if (s && (!best || s.rtt < best.rtt)) best = s;
    }
    if (best) {
      offsetMs = Math.round(best.offset);
      if (Math.abs(offsetMs) > 1000) console.info(`[clock] device clock off by ${offsetMs} ms, correcting`);
    }
  })().finally(() => {
    // Allow a fresh measurement on the next room join.
    setTimeout(() => (syncing = null), 60_000);
  });
  return syncing;
}
