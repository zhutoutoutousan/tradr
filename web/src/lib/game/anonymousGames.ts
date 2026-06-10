import type { RoundResult } from "@/hooks/useGame";
import type { RoundReview } from "@/lib/game/reviews";
import type { RoundSetup } from "@/lib/game/roundSetup";
import { getDeviceId } from "@/lib/game/session";

export interface CommunityGame {
  id: string;
  deviceId: string;
  createdAt: string;
  mode: "solo" | "multiplayer";
  marketLabel: string;
  rank: number;
  returnPct: number;
  profit: number;
  trades: number;
  review: RoundReview;
  isMine: boolean;
}

export async function saveAnonymousGame(
  result: RoundResult,
  setup: RoundSetup,
  mode: "solo" | "multiplayer" = "solo",
): Promise<void> {
  const deviceId = getDeviceId();
  const res = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: result.review.id,
      deviceId,
      mode,
      marketId: result.review.marketId,
      marketLabel: result.review.marketLabel,
      seed: result.review.seed,
      rank: result.summary.rank,
      returnPct: result.summary.returnPct,
      profit: result.summary.profit,
      trades: result.summary.trades,
      reviewJson: result.review,
      setupJson: setup,
    }),
  });
  if (!res.ok) throw new Error("save failed");
}

export async function fetchCommunityGames(limit = 24): Promise<CommunityGame[]> {
  const deviceId = getDeviceId();
  const res = await fetch(`/api/games?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { games?: CommunityGame[] };
  return (data.games ?? []).map((g) => ({ ...g, isMine: g.deviceId === deviceId }));
}
