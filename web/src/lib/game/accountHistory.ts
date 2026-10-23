import { supabase } from "@/lib/supabase";
import { computeEloDelta, type Opponent } from "@/lib/game/elo";
import type { RoundReview } from "@/lib/game/reviews";
import type { RoundSetup } from "@/lib/game/roundSetup";

export interface AccountGameInput {
  mode: "solo" | "multiplayer";
  review: RoundReview;
  setup: RoundSetup | null;
  finalBalance: number;
  /** Final equity of every other trader in the round (bots + humans). */
  opponents: { rating?: number; equity: number }[];
  myEquity: number;
  replayId: string | null;
}

export interface AccountGameResult {
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  xpGained: number;
  xpTotal: number;
}

const DEFAULT_RATING = 1200;

export function xpForRound(mode: "solo" | "multiplayer", rank: number, totalPlayers: number, returnPct: number, trades: number): number {
  let xp = 20;
  if (trades > 0) xp += 5;
  if (returnPct > 0) xp += Math.min(50, Math.round(returnPct * 2));
  if (totalPlayers > 1) xp += Math.round(30 * ((totalPlayers - rank) / (totalPlayers - 1)));
  if (rank === 1 && totalPlayers > 1) xp += 20;
  if (mode === "multiplayer") xp += 15;
  return Math.max(0, xp);
}

/**
 * Record a finished round on the signed-in account. The database trigger on
 * user_game_history rolls it into user_profiles (games, wins, ELO, XP).
 * Returns null when nobody is signed in.
 */
export async function saveAccountGame(input: AccountGameInput): Promise<AccountGameResult | null> {
  if (!supabase) return null;
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("elo_rating, xp")
    .eq("id", userId)
    .maybeSingle();
  const eloBefore = profile?.elo_rating ?? DEFAULT_RATING;
  const xpBefore = profile?.xp ?? 0;

  const opponents: Opponent[] = input.opponents.map((o) => ({
    rating: o.rating ?? DEFAULT_RATING,
    score: input.myEquity > o.equity ? 1 : input.myEquity < o.equity ? 0 : 0.5,
  }));
  const eloAfter = Math.max(100, eloBefore + computeEloDelta(eloBefore, opponents));
  const s = input.review.summary;
  const xpGained = xpForRound(input.mode, s.rank, s.totalPlayers, s.returnPct, s.trades);

  const { error } = await supabase.from("user_game_history").insert({
    user_id: userId,
    mode: input.mode,
    market_id: input.review.marketId,
    market_label: input.review.marketLabel,
    seed: input.review.seed,
    rank: s.rank,
    return_pct: s.returnPct,
    profit: s.profit,
    trades: s.trades,
    final_balance: input.finalBalance,
    elo_before: eloBefore,
    elo_after: eloAfter,
    elo_change: eloAfter - eloBefore,
    xp_gained: xpGained,
    total_players: s.totalPlayers,
    replay_id: input.replayId,
    review_json: { ...input.review, summary: { ...s, eloDelta: eloAfter - eloBefore } },
    setup_json: input.setup,
  });
  if (error) throw error;

  return { eloBefore, eloAfter, eloChange: eloAfter - eloBefore, xpGained, xpTotal: xpBefore + xpGained };
}
