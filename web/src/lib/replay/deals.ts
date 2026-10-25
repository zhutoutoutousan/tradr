import type { DealTrade } from "@/lib/game/reviews";
import { unpackCandle } from "./recorder";
import type { ReplayEvent, ReplayParticipant, ReplayRecording } from "./types";

function lastIndexAtOrBefore<T extends { t: number }>(arr: T[], tick: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].t <= tick) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Map a recording tick to a candle `time` so charts can place MT5 markers. */
export function tickToBarTime(rec: ReplayRecording, tick: number): number {
  const idx = lastIndexAtOrBefore(rec.bars, tick);
  if (idx >= 0) return unpackCandle(rec.bars[idx].c).time;
  if (rec.history.length) return unpackCandle(rec.history[rec.history.length - 1]).time;
  return tick;
}

/**
 * Pair open/close events into MT5-style deals (player + bots + humans).
 * openBar/closeBar are candle times (not raw ticks) for chart alignment.
 */
export function dealsFromReplayEvents(
  rec: ReplayRecording,
  events: ReplayEvent[],
  participants: ReplayParticipant[],
  upToTick?: number,
): DealTrade[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const open = new Map<string, Extract<ReplayEvent, { k: "open" }>>();
  const out: DealTrade[] = [];

  for (const ev of events) {
    if (upToTick !== undefined && ev.t > upToTick) break;
    if (ev.k === "open") {
      open.set(ev.id, ev);
      continue;
    }
    if (ev.k !== "close") continue;
    const o = open.get(ev.id);
    if (!o) continue;
    open.delete(ev.id);
    const p = byId.get(ev.id);
    const pnl = ev.pnl ?? 0;
    out.push({
      side: o.side,
      entry: o.price,
      exit: ev.price,
      size: 1,
      pnl,
      returnPct: o.price !== 0 ? (pnl / Math.abs(o.price)) * 100 : 0,
      openBar: tickToBarTime(rec, o.t),
      closeBar: tickToBarTime(rec, ev.t),
      traderId: ev.id,
      traderName: p?.name,
      traderKind: p?.kind === "bot" ? "bot" : p?.kind === "human" ? "human" : "player",
      color: p?.color,
    });
  }
  return out;
}

export function dealsFromRecording(rec: ReplayRecording, upToTick?: number): DealTrade[] {
  return dealsFromReplayEvents(rec, rec.events, rec.participants, upToTick);
}

export function chatFromRecording(rec: ReplayRecording): { t: number; name: string; text: string; id?: string }[] {
  return rec.events
    .filter((e): e is Extract<ReplayEvent, { k: "chat" }> => e.k === "chat")
    .map((e) => ({ t: e.t, name: e.name, text: e.text, id: `${e.t}-${e.id}` }));
}
