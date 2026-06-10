import { STARTING_BALANCE, equity, type GameEngine } from "@/lib/sim/engine";
import type { Candle } from "@/lib/sim/types";
import type { DealTrade, RoundReview } from "@/lib/game/reviews";
import type { RoundSetup } from "@/lib/game/roundSetup";
import { saveAnonymousGame } from "@/lib/game/anonymousGames";
import type { RoundResult } from "@/hooks/useGame";
import type { LeaderRow } from "@/hooks/useMultiplayer";

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

  const trades: DealTrade[] = engine.player.account.closed.map((t) => {
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
    };
  });

  const seed = roundNumber > 0 ? `${room}:${roundNumber}` : room;

  return {
    id: `mp-${room}-r${roundNumber}-${Date.now()}`,
    createdAt: Date.now(),
    marketId,
    marketLabel: `${marketLabel} · room ${room}`,
    seed: hashSeed(seed),
    candles: series,
    trades,
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
