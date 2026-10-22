// Challenge Mode System: 闯关模式
// Defines levels, objectives, and progression for Story & Challenge modes

export type ChallengeType = "story" | "challenge";

export interface ChallengeObjective {
  type: "profit" | "return_pct" | "trades" | "time" | "rank" | "no_loss";
  target: number;
  description: string;
}

export interface ChallengeLevelConfig {
  durationMs: number;
  startingCash: number;
  botCount: number;
  difficulty: number; // 0-1, bot skill level
}

export interface ChallengeLevel {
  id: string;
  type: ChallengeType;
  level: number;
  title: string;
  description: string;
  objectives: ChallengeObjective[];
  config: ChallengeLevelConfig;
  unlockRequirement?: {
    levelId: string; // Must complete this level first
    stars?: number; // Minimum stars required
  };
  rewards: {
    stars: number; // Max stars achievable
    xp: number;
    unlocks?: string[]; // Achievement or powerup IDs
  };
}

// Story Mode: Tutorial-style progression (教程式关卡)
export const STORY_LEVELS: ChallengeLevel[] = [
  {
    id: "story-1-basics",
    type: "story",
    level: 1,
    title: "📚 Trading Basics",
    description: "Learn to buy low and sell high. Complete your first trade.",
    objectives: [
      {
        type: "trades",
        target: 1,
        description: "完成1次交易 (Complete 1 trade)"
      },
      {
        type: "profit",
        target: 100,
        description: "赚取 $100 利润 (Earn $100 profit)"
      }
    ],
    config: {
      durationMs: 60_000, // 1 minute
      startingCash: 10_000,
      botCount: 3,
      difficulty: 0.3,
    },
    rewards: {
      stars: 3,
      xp: 100,
      unlocks: ["achievement_first_trade"]
    }
  },
  {
    id: "story-2-timing",
    type: "story",
    level: 2,
    title: "⏰ Perfect Timing",
    description: "Learn to time your entries and exits.",
    objectives: [
      {
        type: "return_pct",
        target: 5,
        description: "达到 5% 回报率 (Achieve 5% return)"
      },
      {
        type: "rank",
        target: 1,
        description: "排名第一 (Finish 1st place)"
      }
    ],
    config: {
      durationMs: 90_000, // 1.5 minutes
      startingCash: 10_000,
      botCount: 5,
      difficulty: 0.4,
    },
    unlockRequirement: {
      levelId: "story-1-basics",
      stars: 1
    },
    rewards: {
      stars: 3,
      xp: 150,
      unlocks: ["powerup_freeze"]
    }
  },
  {
    id: "story-3-volatility",
    type: "story",
    level: 3,
    title: "🌊 Riding Volatility",
    description: "Master trading in volatile markets.",
    objectives: [
      {
        type: "return_pct",
        target: 10,
        description: "达到 10% 回报率 (Achieve 10% return)"
      },
      {
        type: "no_loss",
        target: 1,
        description: "不要亏损 (Don't lose money)"
      }
    ],
    config: {
      durationMs: 120_000, // 2 minutes
      startingCash: 10_000,
      botCount: 7,
      difficulty: 0.5,
    },
    unlockRequirement: {
      levelId: "story-2-timing",
      stars: 1
    },
    rewards: {
      stars: 3,
      xp: 200,
      unlocks: ["powerup_slowmo"]
    }
  },
  {
    id: "story-4-pressure",
    type: "story",
    level: 4,
    title: "🔥 Under Pressure",
    description: "Keep your cool when the market moves fast.",
    objectives: [
      {
        type: "profit",
        target: 2000,
        description: "赚取 $2,000 (Earn $2,000)"
      },
      {
        type: "rank",
        target: 1,
        description: "排名第一 (Finish 1st)"
      }
    ],
    config: {
      durationMs: 150_000, // 2.5 minutes
      startingCash: 10_000,
      botCount: 10,
      difficulty: 0.6,
    },
    unlockRequirement: {
      levelId: "story-3-volatility",
      stars: 2
    },
    rewards: {
      stars: 3,
      xp: 250,
      unlocks: ["powerup_leverage"]
    }
  },
  {
    id: "story-5-master",
    type: "story",
    level: 5,
    title: "🏆 Trading Master",
    description: "Prove yourself against the best bots.",
    objectives: [
      {
        type: "return_pct",
        target: 20,
        description: "达到 20% 回报率 (Achieve 20% return)"
      },
      {
        type: "rank",
        target: 1,
        description: "排名第一 (Finish 1st)"
      },
      {
        type: "time",
        target: 180_000,
        description: "坚持 3 分钟 (Survive 3 minutes)"
      }
    ],
    config: {
      durationMs: 180_000, // 3 minutes (normal game)
      startingCash: 10_000,
      botCount: 15,
      difficulty: 0.7,
    },
    unlockRequirement: {
      levelId: "story-4-pressure",
      stars: 2
    },
    rewards: {
      stars: 3,
      xp: 500,
      unlocks: ["achievement_story_complete", "powerup_shield"]
    }
  }
];

// Challenge Mode: Harder, specific objectives (挑战关卡)
export const CHALLENGE_LEVELS: ChallengeLevel[] = [
  {
    id: "challenge-quick-profit",
    type: "challenge",
    level: 1,
    title: "💰 Quick Profit",
    description: "Make $1,000 in 60 seconds",
    objectives: [
      {
        type: "profit",
        target: 1000,
        description: "1分钟内赚取 $1,000 (Earn $1,000 in 1 minute)"
      }
    ],
    config: {
      durationMs: 60_000,
      startingCash: 5_000,
      botCount: 8,
      difficulty: 0.6,
    },
    unlockRequirement: {
      levelId: "story-3-volatility",
      stars: 1
    },
    rewards: {
      stars: 3,
      xp: 300,
    }
  },
  {
    id: "challenge-perfect-timing",
    type: "challenge",
    level: 2,
    title: "🎯 Perfect Timing",
    description: "Win with only 3 trades",
    objectives: [
      {
        type: "trades",
        target: 3,
        description: "只用 3 次交易 (Use only 3 trades)"
      },
      {
        type: "rank",
        target: 1,
        description: "排名第一 (Finish 1st)"
      }
    ],
    config: {
      durationMs: 120_000,
      startingCash: 10_000,
      botCount: 12,
      difficulty: 0.65,
    },
    unlockRequirement: {
      levelId: "story-4-pressure",
      stars: 2
    },
    rewards: {
      stars: 3,
      xp: 400,
      unlocks: ["achievement_perfect_trader"]
    }
  },
  {
    id: "challenge-high-roller",
    type: "challenge",
    level: 3,
    title: "🎲 High Roller",
    description: "Achieve 50% return",
    objectives: [
      {
        type: "return_pct",
        target: 50,
        description: "达到 50% 回报率 (Achieve 50% return)"
      }
    ],
    config: {
      durationMs: 180_000,
      startingCash: 10_000,
      botCount: 15,
      difficulty: 0.7,
    },
    unlockRequirement: {
      levelId: "story-5-master",
      stars: 2
    },
    rewards: {
      stars: 3,
      xp: 600,
      unlocks: ["achievement_high_roller"]
    }
  },
  {
    id: "challenge-gauntlet",
    type: "challenge",
    level: 4,
    title: "⚔️ The Gauntlet",
    description: "Beat 20 bots in 3 minutes",
    objectives: [
      {
        type: "rank",
        target: 1,
        description: "战胜 20 个机器人 (Beat 20 bots)"
      },
      {
        type: "return_pct",
        target: 30,
        description: "达到 30% 回报率 (Achieve 30% return)"
      }
    ],
    config: {
      durationMs: 180_000,
      startingCash: 10_000,
      botCount: 20,
      difficulty: 0.75,
    },
    unlockRequirement: {
      levelId: "challenge-high-roller",
      stars: 2
    },
    rewards: {
      stars: 3,
      xp: 800,
      unlocks: ["achievement_gauntlet_winner", "powerup_tip"]
    }
  },
  {
    id: "challenge-impossible",
    type: "challenge",
    level: 5,
    title: "👑 Impossible",
    description: "The ultimate challenge. Good luck.",
    objectives: [
      {
        type: "rank",
        target: 1,
        description: "排名第一 (Finish 1st)"
      },
      {
        type: "return_pct",
        target: 100,
        description: "达到 100% 回报率 (Double your money)"
      },
      {
        type: "no_loss",
        target: 1,
        description: "完美表现 (Perfect run - no losses)"
      }
    ],
    config: {
      durationMs: 180_000,
      startingCash: 10_000,
      botCount: 25,
      difficulty: 0.9,
    },
    unlockRequirement: {
      levelId: "challenge-gauntlet",
      stars: 3
    },
    rewards: {
      stars: 3,
      xp: 2000,
      unlocks: ["achievement_impossible", "title_trading_god"]
    }
  }
];

export const ALL_LEVELS = [...STORY_LEVELS, ...CHALLENGE_LEVELS];

export function getChallengeById(id: string): ChallengeLevel | undefined {
  return ALL_LEVELS.find((c) => c.id === id);
}

export function getAvailableLevels(completedLevels: Record<string, number>): ChallengeLevel[] {
  return ALL_LEVELS.filter((level) => {
    if (!level.unlockRequirement) return true;
    
    const requiredLevel = completedLevels[level.unlockRequirement.levelId];
    if (requiredLevel === undefined) return false;
    
    if (level.unlockRequirement.stars && requiredLevel < level.unlockRequirement.stars) {
      return false;
    }
    
    return true;
  });
}

export function calculateStars(level: ChallengeLevel, result: {
  profit: number;
  returnPct: number;
  rank: number;
  trades: number;
  survivedMs: number;
}): number {
  let completedObjectives = 0;
  
  for (const obj of level.objectives) {
    let completed = false;
    
    switch (obj.type) {
      case "profit":
        completed = result.profit >= obj.target;
        break;
      case "return_pct":
        completed = result.returnPct >= obj.target;
        break;
      case "trades":
        completed = result.trades <= obj.target;
        break;
      case "time":
        completed = result.survivedMs >= obj.target;
        break;
      case "rank":
        completed = result.rank <= obj.target;
        break;
      case "no_loss":
        completed = result.profit >= 0;
        break;
    }
    
    if (completed) completedObjectives++;
  }
  
  // Stars based on objectives completed
  const totalObjectives = level.objectives.length;
  if (completedObjectives === 0) return 0;
  if (completedObjectives === totalObjectives) return 3;
  if (completedObjectives >= totalObjectives * 0.66) return 2;
  return 1;
}
