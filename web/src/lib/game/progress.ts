// Player Progress System: Track challenge completion, XP, and unlocks
// Supports both local (localStorage) and cloud (Supabase) storage with migration

import { defaultProfile, loadProfile, saveProfile, type Profile } from "./profile";

export interface ChallengeProgress {
  completedLevels: Record<string, number>; // levelId → stars (0-3)
  xp: number;
  level: number; // Player level based on XP
  unlockedPowerups: string[];
  unlockedAchievements: string[];
  unlockedTitles: string[];
}

export interface PlayerProgress extends Profile {
  challenges: ChallengeProgress;
}

const PROGRESS_KEY = "tradr.progress.v1";

export function defaultProgress(): PlayerProgress {
  return {
    ...defaultProfile(),
    challenges: {
      completedLevels: {},
      xp: 0,
      level: 1,
      unlockedPowerups: [],
      unlockedAchievements: [],
      unlockedTitles: [],
    }
  };
}

export function loadProgress(): PlayerProgress {
  if (typeof window === "undefined") return defaultProgress();
  
  try {
    // Load existing profile
    const profile = loadProfile();
    
    // Load challenge progress
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      return {
        ...profile,
        challenges: defaultProgress().challenges
      };
    }
    
    const progress = JSON.parse(raw) as PlayerProgress;
    
    // Merge with profile to ensure backward compatibility
    return {
      ...profile,
      ...progress,
      challenges: {
        ...defaultProgress().challenges,
        ...(progress.challenges || {})
      }
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  if (typeof window === "undefined") return;
  
  try {
    // Save profile (for backward compatibility)
    const profile: Profile = {
      elo: progress.elo,
      bestElo: progress.bestElo,
      roundsPlayed: progress.roundsPlayed,
      firstPlaces: progress.firstPlaces,
      bestReturnPct: progress.bestReturnPct,
      bestRoundProfit: progress.bestRoundProfit,
      unlocked: progress.unlocked,
    };
    saveProfile(profile);
    
    // Save full progress
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore quota / privacy-mode errors
  }
}

export function completeChallengeLevel(
  progress: PlayerProgress,
  levelId: string,
  stars: number,
  xp: number,
  unlocks?: string[]
): PlayerProgress {
  const currentStars = progress.challenges.completedLevels[levelId] || 0;
  
  // Only update if new stars are better
  if (stars <= currentStars) {
    return progress;
  }
  
  const newProgress: PlayerProgress = {
    ...progress,
    challenges: {
      ...progress.challenges,
      completedLevels: {
        ...progress.challenges.completedLevels,
        [levelId]: stars
      },
      xp: progress.challenges.xp + xp,
      level: calculateLevel(progress.challenges.xp + xp),
      unlockedPowerups: [
        ...progress.challenges.unlockedPowerups,
        ...(unlocks?.filter(u => u.startsWith("powerup_")) || [])
      ],
      unlockedAchievements: [
        ...progress.challenges.unlockedAchievements,
        ...(unlocks?.filter(u => u.startsWith("achievement_")) || [])
      ],
      unlockedTitles: [
        ...progress.challenges.unlockedTitles,
        ...(unlocks?.filter(u => u.startsWith("title_")) || [])
      ]
    }
  };
  
  // Remove duplicates
  newProgress.challenges.unlockedPowerups = Array.from(new Set(newProgress.challenges.unlockedPowerups));
  newProgress.challenges.unlockedAchievements = Array.from(new Set(newProgress.challenges.unlockedAchievements));
  newProgress.challenges.unlockedTitles = Array.from(new Set(newProgress.challenges.unlockedTitles));
  
  saveProgress(newProgress);
  return newProgress;
}

export function calculateLevel(xp: number): number {
  // XP curve: level 1 = 0, level 2 = 100, level 3 = 300, etc.
  // Formula: level = 1 + floor(sqrt(xp / 50))
  return 1 + Math.floor(Math.sqrt(xp / 50));
}

export function xpForNextLevel(currentLevel: number): number {
  // Reverse of calculateLevel formula
  const nextLevel = currentLevel + 1;
  return (nextLevel - 1) ** 2 * 50;
}

export function xpProgress(xp: number, level: number): { current: number; required: number; percentage: number } {
  const currentLevelXp = (level - 1) ** 2 * 50;
  const nextLevelXp = level ** 2 * 50;
  const required = nextLevelXp - currentLevelXp;
  const current = xp - currentLevelXp;
  const percentage = Math.min(100, (current / required) * 100);
  
  return { current, required, percentage };
}

// Migration helper: Merge local progress with cloud data
export interface CloudProgress {
  user_id: string;
  completed_levels: Record<string, number>;
  xp: number;
  level: number;
  unlocked_powerups: string[];
  unlocked_achievements: string[];
  unlocked_titles: string[];
  elo_rating: number;
  best_elo: number;
  rounds_played: number;
  first_places: number;
  best_return_pct: number;
  best_round_profit: number;
  updated_at: string;
}

export function migrateLocalToCloud(local: PlayerProgress, cloud: CloudProgress | null): PlayerProgress {
  if (!cloud) {
    // No cloud data, use local
    return local;
  }
  
  // Merge: take the best of both
  const merged: PlayerProgress = {
    elo: Math.max(local.elo, cloud.elo_rating),
    bestElo: Math.max(local.bestElo, cloud.best_elo),
    roundsPlayed: Math.max(local.roundsPlayed, cloud.rounds_played),
    firstPlaces: Math.max(local.firstPlaces, cloud.first_places),
    bestReturnPct: Math.max(local.bestReturnPct, cloud.best_return_pct),
    bestRoundProfit: Math.max(local.bestRoundProfit, cloud.best_round_profit),
    unlocked: Array.from(new Set([...local.unlocked, ...cloud.unlocked_achievements])),
    challenges: {
      completedLevels: mergeLevels(local.challenges.completedLevels, cloud.completed_levels),
      xp: Math.max(local.challenges.xp, cloud.xp),
      level: Math.max(local.challenges.level, cloud.level),
      unlockedPowerups: Array.from(new Set([...local.challenges.unlockedPowerups, ...cloud.unlocked_powerups])),
      unlockedAchievements: Array.from(new Set([...local.challenges.unlockedAchievements, ...cloud.unlocked_achievements])),
      unlockedTitles: Array.from(new Set([...local.challenges.unlockedTitles, ...cloud.unlocked_titles])),
    }
  };
  
  return merged;
}

function mergeLevels(
  local: Record<string, number>,
  cloud: Record<string, number>
): Record<string, number> {
  const merged: Record<string, number> = { ...local };
  
  for (const [levelId, stars] of Object.entries(cloud)) {
    merged[levelId] = Math.max(merged[levelId] || 0, stars);
  }
  
  return merged;
}

export function cloudProgressToLocal(cloud: CloudProgress): PlayerProgress {
  return {
    elo: cloud.elo_rating,
    bestElo: cloud.best_elo,
    roundsPlayed: cloud.rounds_played,
    firstPlaces: cloud.first_places,
    bestReturnPct: cloud.best_return_pct,
    bestRoundProfit: cloud.best_round_profit,
    unlocked: cloud.unlocked_achievements,
    challenges: {
      completedLevels: cloud.completed_levels,
      xp: cloud.xp,
      level: cloud.level,
      unlockedPowerups: cloud.unlocked_powerups,
      unlockedAchievements: cloud.unlocked_achievements,
      unlockedTitles: cloud.unlocked_titles,
    }
  };
}

export function localProgressToCloud(local: PlayerProgress, userId: string): Partial<CloudProgress> {
  return {
    user_id: userId,
    completed_levels: local.challenges.completedLevels,
    xp: local.challenges.xp,
    level: local.challenges.level,
    unlocked_powerups: local.challenges.unlockedPowerups,
    unlocked_achievements: local.challenges.unlockedAchievements,
    unlocked_titles: local.challenges.unlockedTitles,
    elo_rating: local.elo,
    best_elo: local.bestElo,
    rounds_played: local.roundsPlayed,
    first_places: local.firstPlaces,
    best_return_pct: local.bestReturnPct,
    best_round_profit: local.bestRoundProfit,
    updated_at: new Date().toISOString(),
  };
}
