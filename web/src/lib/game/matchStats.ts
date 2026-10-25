import type { DealTrade, MatchStats, ReviewStanding, RoundReview } from "./reviews";

/** Sports-style box-score helpers. Safe on partial/legacy reviews. */
export function buildMatchStats(input: {
  marketLabel: string;
  mode: string;
  standings: ReviewStanding[];
  playerTrades: DealTrade[];
  allTrades: DealTrade[];
  chatCount: number;
  durationMs?: number;
}): MatchStats {
  const { standings, allTrades, playerTrades, chatCount } = input;
  let mvpId: string | undefined;
  let volumeKingId: string | undefined;
  let sharpId: string | undefined;
  let bestRet = -Infinity;
  let mostTrades = -1;
  let bestWr = -1;

  for (const s of standings) {
    if (s.returnPct > bestRet) {
      bestRet = s.returnPct;
      mvpId = s.id;
    }
    if (s.trades > mostTrades) {
      mostTrades = s.trades;
      volumeKingId = s.id;
    }
    if (s.trades >= 2) {
      const wr = s.wins / s.trades;
      if (wr > bestWr) {
        bestWr = wr;
        sharpId = s.id;
      }
    }
  }

  return {
    durationMs: input.durationMs,
    marketLabel: input.marketLabel,
    mode: input.mode,
    fieldSize: standings.length,
    totalDeals: allTrades.length,
    playerDeals: playerTrades.length,
    botDeals: allTrades.filter((t) => t.traderKind === "bot").length,
    chatCount,
    mvpId,
    volumeKingId,
    sharpId,
  };
}

export function standingName(review: RoundReview, id: string | undefined): string {
  if (!id) return "—";
  return review.standings?.find((s) => s.id === id)?.name ?? id;
}
