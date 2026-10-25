import { describe, expect, it } from "vitest";
import { normalizeCommunityReview, type CommunityGameRow } from "./anonymousGames";
import { buildMatchStats } from "./matchStats";
import { reviewDealsForChart, type DealTrade, type RoundReview } from "./reviews";

const playerDeal: DealTrade = {
  side: "long",
  entry: 100,
  exit: 110,
  size: 1,
  pnl: 10,
  returnPct: 10,
  openBar: 1,
  closeBar: 2,
  traderId: "you",
  traderName: "You",
  traderKind: "player",
  color: "#34d399",
};

const botDeal: DealTrade = {
  side: "short",
  entry: 105,
  exit: 100,
  size: 1,
  pnl: 5,
  returnPct: 4.7,
  openBar: 1,
  closeBar: 3,
  traderId: "bot-1",
  traderName: "Bot A",
  traderKind: "bot",
  color: "#60a5fa",
};

describe("review backward compatibility", () => {
  it("reads legacy v1 reviews with only player trades", () => {
    const row: CommunityGameRow = {
      id: "legacy-1",
      deviceId: "d",
      createdAt: "2024-01-01T00:00:00.000Z",
      mode: "solo",
      marketLabel: "EURUSD · 1H",
      rank: 2,
      returnPct: 1.5,
      profit: 150,
      trades: 1,
      review: {
        id: "legacy-1",
        createdAt: 1,
        marketId: "synthetic",
        marketLabel: "EURUSD · 1H",
        seed: 42,
        candles: [],
        trades: [playerDeal],
        summary: {
          returnPct: 1.5,
          profit: 150,
          trades: 1,
          wins: 1,
          rank: 2,
          totalPlayers: 7,
          eloDelta: 12,
        },
      },
    };

    const review = normalizeCommunityReview(row);
    expect(review.v).toBeUndefined();
    expect(review.allTrades).toBeUndefined();
    expect(review.chat).toBeUndefined();
    expect(review.matchStats).toBeUndefined();
    expect(reviewDealsForChart(review)).toEqual([playerDeal]);
  });

  it("prefers allTrades for charts while keeping player trades for ghost BC", () => {
    const review: RoundReview = {
      v: 2,
      id: "v2",
      createdAt: 1,
      marketId: "synthetic",
      marketLabel: "BTC · 5m",
      seed: 1,
      candles: [],
      trades: [playerDeal],
      allTrades: [playerDeal, botDeal],
      standings: [
        {
          id: "you",
          name: "You",
          color: "#34d399",
          kind: "player",
          equity: 10150,
          returnPct: 1.5,
          trades: 1,
          wins: 1,
        },
        {
          id: "bot-1",
          name: "Bot A",
          color: "#60a5fa",
          kind: "bot",
          equity: 10050,
          returnPct: 0.5,
          trades: 1,
          wins: 1,
        },
      ],
      chat: [{ t: 10, name: "You", text: "gg" }],
      matchStats: buildMatchStats({
        marketLabel: "BTC · 5m",
        mode: "solo",
        standings: [
          {
            id: "you",
            name: "You",
            color: "#34d399",
            kind: "player",
            equity: 10150,
            returnPct: 1.5,
            trades: 1,
            wins: 1,
          },
          {
            id: "bot-1",
            name: "Bot A",
            color: "#60a5fa",
            kind: "bot",
            equity: 10050,
            returnPct: 0.5,
            trades: 1,
            wins: 1,
          },
        ],
        playerTrades: [playerDeal],
        allTrades: [playerDeal, botDeal],
        chatCount: 1,
      }),
      summary: {
        returnPct: 1.5,
        profit: 150,
        trades: 1,
        wins: 1,
        rank: 1,
        totalPlayers: 2,
        eloDelta: 8,
      },
    };

    expect(review.trades).toHaveLength(1);
    expect(review.trades[0].traderKind).toBe("player");
    expect(reviewDealsForChart(review)).toHaveLength(2);
    expect(review.matchStats?.mvpId).toBe("you");
    expect(review.matchStats?.botDeals).toBe(1);
    expect(review.matchStats?.chatCount).toBe(1);
  });

  it("normalizes partial stored JSON without throwing", () => {
    const review = normalizeCommunityReview({
      id: "sparse",
      deviceId: "d",
      createdAt: "2024-06-01T12:00:00.000Z",
      mode: "multiplayer",
      marketLabel: "Room X",
      rank: 3,
      returnPct: -2,
      profit: -200,
      trades: 0,
      review: null,
    });
    expect(review.id).toBe("sparse");
    expect(review.trades).toEqual([]);
    expect(reviewDealsForChart(review)).toEqual([]);
    expect(review.summary.rank).toBe(3);
  });
});
