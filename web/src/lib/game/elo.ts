// Single-player ELO: at the end of a round the final leaderboard is scored as a
// mini multiplayer match. The player plays one "game" against every bot (win =
// finished above it, draw = tie) and the rating is nudged by the sum of those
// pairwise results.

const K = 12; // per-opponent K-factor; with ~6 bots the round swing stays sane

export interface Opponent {
  rating: number;
  score: number; // 1 win, 0.5 tie, 0 loss
}

// Standard ELO expected score of A against B.
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// Net rating change for the player across all opponents this round.
export function computeEloDelta(playerElo: number, opponents: Opponent[], k = K): number {
  let delta = 0;
  for (const o of opponents) delta += k * (o.score - expectedScore(playerElo, o.rating));
  return Math.round(delta);
}

// Turn final equities into pairwise scores vs each bot.
export function opponentsFromStandings(
  playerEquity: number,
  bots: { rating: number; equity: number }[],
): Opponent[] {
  return bots.map((b) => ({
    rating: b.rating,
    score: playerEquity > b.equity ? 1 : playerEquity < b.equity ? 0 : 0.5,
  }));
}
