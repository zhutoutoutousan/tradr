// Achievement definitions and evaluation. Unlocked ids live in the Profile
// (localStorage); this module is pure logic so it is easy to test.

export interface RoundSummary {
  rank: number; // player final rank (1-based, among player + bots)
  totalPlayers: number;
  returnPct: number;
  profit: number; // realized + unrealized $ vs starting balance
  trades: number;
  wins: number; // winning trades
  losses: number; // losing trades
  maxDrawdownPct: number; // worst peak-to-trough equity dip this round
  minReturnPct: number; // lowest equity return reached during the round
  powerupsUsed: number;
  roundsPlayed: number; // lifetime count including this round
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  check: (s: RoundSummary) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "beat-the-bots",
    name: "Beat the Bots",
    description: "Finish a round in 1st place.",
    check: (s) => s.rank === 1,
  },
  {
    id: "flawless",
    name: "Flawless Victory",
    description: "Finish 1st with zero losing trades.",
    check: (s) => s.rank === 1 && s.trades >= 1 && s.losses === 0,
  },
  {
    id: "podium",
    name: "On the Podium",
    description: "Finish a round in the top 3.",
    check: (s) => s.rank <= 3,
  },
  {
    id: "untouchable",
    name: "Untouchable",
    description: "Close at least 3 trades in a round without a single loss.",
    check: (s) => s.trades >= 3 && s.losses === 0,
  },
  {
    id: "high-roller",
    name: "High Roller",
    description: "Finish a round up +50% or more.",
    check: (s) => s.returnPct >= 50,
  },
  {
    id: "moonshot",
    name: "Moonshot",
    description: "Finish a round up +100% or more.",
    check: (s) => s.returnPct >= 100,
  },
  {
    id: "comeback",
    name: "The Comeback",
    description: "Drop to -20% during a round, then finish in the green.",
    check: (s) => s.minReturnPct <= -20 && s.returnPct > 0,
  },
  {
    id: "iron-stomach",
    name: "Iron Stomach",
    description: "Survive a 30%+ drawdown and still finish profitable.",
    check: (s) => s.maxDrawdownPct >= 30 && s.returnPct > 0,
  },
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    description: "Finish with a 70%+ win rate over 5+ trades.",
    check: (s) => s.trades >= 5 && s.wins / s.trades >= 0.7,
  },
  {
    id: "power-player",
    name: "Power Player",
    description: "Use 3 power-ups in a single round.",
    check: (s) => s.powerupsUsed >= 3,
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Play 10 rounds.",
    check: (s) => s.roundsPlayed >= 10,
  },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

// Returns the achievements that became newly unlocked this round.
export function evaluateAchievements(summary: RoundSummary, alreadyUnlocked: string[]): Achievement[] {
  const have = new Set(alreadyUnlocked);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(summary));
}
