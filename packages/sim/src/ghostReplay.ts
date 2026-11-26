import type { DealTrade } from "@/lib/game/reviews";
import type { Account, ClosedTrade, Side } from "./types";

export interface GhostReplayTarget {
  account: Account;
}

export interface GhostReplayState {
  index: number;
}

export interface GhostBotSpec {
  id: string;
  name: string;
  color: string;
  blurb: string;
  trades: DealTrade[];
}

function unrealized(pos: NonNullable<Account["position"]>, price: number): number {
  const dir = pos.side === "long" ? 1 : -1;
  return (price - pos.entry) * pos.size * dir;
}

function openExact(target: GhostReplayTarget, side: Side, entry: number, size: number, bar: number) {
  if (target.account.position || size <= 0) return;
  target.account.position = { side, entry, size, openBar: bar };
}

function closeExact(target: GhostReplayTarget, exit: number, bar: number) {
  const pos = target.account.position;
  if (!pos) return;
  const pnl = unrealized(pos, exit);
  const trade: ClosedTrade = {
    side: pos.side,
    entry: pos.entry,
    exit,
    size: pos.size,
    pnl,
    openBar: pos.openBar,
    closeBar: bar,
  };
  target.account.balance += pnl;
  target.account.closed.push(trade);
  if (target.account.closed.length > 200) target.account.closed.shift();
  target.account.position = null;
}

export function tickGhostReplay(
  target: GhostReplayTarget,
  trades: DealTrade[],
  state: GhostReplayState,
  bar: number,
) {
  const trade = trades[state.index];
  if (!trade) return;

  if (!target.account.position && bar >= trade.openBar) {
    openExact(target, trade.side, trade.entry, trade.size, bar);
  }
  if (target.account.position && bar >= trade.closeBar) {
    closeExact(target, trade.exit, bar);
    state.index += 1;
  }
}