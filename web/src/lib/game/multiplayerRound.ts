import { STARTING_BALANCE, equity, type GameEngine } from "@/lib/sim/engine";
import type { Candle } from "@/lib/sim/types";
import type { DealTrade, ReviewStanding, RoundReview } from "@/lib/game/reviews";
import type { RoundSetup } from "@/lib/game/roundSetup";
import { saveAnonymousGame } from "@/lib/game/anonymousGames";
import { buildMatchStats } from "@/lib/game/matchStats";
import type { RoundResult } from "@/hooks/useGame";
import type { LeaderRow } from "@/hooks/useMultiplayer";
import type { ReviewChatMsg } from "@/lib/game/reviews";

function barDate(candles: Candle[], bar: number): string | undefined {
  return candles.find((c) => c.time === bar)?.date;
}

export function mpRoundSetup(instrumentId: string): RoundSetup {
  return {
    instrumentId,
    timeframe: "5m",
    ticksPerBar: 3,
    timeframeLabel: "5m",
    indicators: [],
  };
}

export function buildMultiplayerReview(
  engine: GameEngine,
  candles: Candle[],
  leaderboard: LeaderRow[],
  room: string,
  roundNumber: number,
  marketLabel: string,
  marketId: string,
  chat: ReviewChatMsg[] = [],
): RoundReview {
  const price = engine.market.currentPrice;
  const eq = equity(engine.player, price);
  const returnPct = ((eq - STARTING_BALANCE) / STARTING_BALANCE) * 100;
  const rank = Math.max(1, leaderboard.findIndex((r) => r.isMe) + 1);
  const wins = engine.player.account.closed.filter((c) => c.pnl > 0).length;
  const view = engine.market.view();
  const forming = view[view.length - 1];
  const series = candles.map((c) => ({ ...c }));
  if (forming && series[series.length - 1]?.time !== forming.time) {
    series.push({ ...forming });
  }

  const toDeal = (
    t: { side: "long" | "short"; entry: number; exit: number; size: number; pnl: number; openBar: number; closeBar: number },
    meta: { traderId: string; traderName: string; traderKind: "player" | "bot" | "human"; color: string },
  ): DealTrade => {
    const notional = t.entry * t.size;
    return {
      side: t.side,
      entry: t.entry,
      exit: t.exit,
      size: t.size,
      pnl: t.pnl,
      returnPct: notional > 0 ? (t.pnl / notional) * 100 : 0,
      openBar: t.openBar,
      closeBar: t.closeBar,
      openDate: barDate(series, t.openBar),
      closeDate: barDate(series, t.closeBar),
      ...meta,
    };
  };

  const trades: DealTrade[] = engine.player.account.closed.map((t) =>
    toDeal(t, { traderId: "you", traderName: "You", traderKind: "player", color: "#34d399" }),
  );
  const botDeals: DealTrade[] = engine.bots.flatMap((b) =>
    b.account.closed.map((t) =>
      toDeal(t, { traderId: b.id, traderName: b.name, traderKind: "bot", color: b.color }),
    ),
  );
  // Remote humans: leaderboard rows that are not me/bot — no closed-trade ledger here;
  // their deals live in the tick replay when available.
  const humanStandings: ReviewStanding[] = leaderboard.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    kind: r.isBot ? "bot" : r.isMe ? "player" : "human",
    equity: r.equity,
    returnPct: r.returnPct,
    trades: r.isMe ? trades.length : 0,
    wins: r.isMe ? wins : 0,
  }));

  const allTrades = [...trades, ...botDeals];
  const label = `${marketLabel} · room ${room}`;
  const seed = roundNumber > 0 ? `${room}:${roundNumber}` : room;

  return {
    v: 2,
    id: `mp-${room}-r${roundNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    marketId,
    marketLabel: label,
    seed: hashSeed(seed),
    candles: series,
    trades,
    allTrades,
    standings: humanStandings,
    chat,
    matchStats: buildMatchStats({
      marketLabel: label,
      mode: "multiplayer",
      standings: humanStandings,
      playerTrades: trades,
      allTrades,
      chatCount: chat.length,
    }),
    summary: {
      returnPct,
      profit: eq - STARTING_BALANCE,
      trades: engine.player.account.closed.length,
      wins,
      rank,
      totalPlayers: leaderboard.length,
      eloDelta: 0,
    },
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function saveMultiplayerRound(review: RoundReview, setup: RoundSetup): Promise<void> {
  const result: RoundResult = {
    standings: [],
    rank: review.summary.rank,
    summary: {
      rank: review.summary.rank,
      totalPlayers: review.summary.totalPlayers,
      returnPct: review.summary.returnPct,
      profit: review.summary.profit,
      trades: review.summary.trades,
      wins: review.summary.wins,
      losses: review.summary.trades - review.summary.wins,
      maxDrawdownPct: 0,
      minReturnPct: review.summary.returnPct,
      powerupsUsed: 0,
      roundsPlayed: 0,
    },
    eloBefore: 0,
    eloAfter: 0,
    eloDelta: 0,
    newAchievements: [],
    review,
  };
  await saveAnonymousGame(result, setup, "multiplayer");
}
