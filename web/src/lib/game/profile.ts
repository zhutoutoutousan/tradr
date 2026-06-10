// Local, offline player profile: ELO, lifetime stats and unlocked achievements.
// Persisted to localStorage so it survives reloads without any backend.

import { BASE_ELO } from "@/lib/sim/botFactory";

export interface Profile {
  elo: number;
  bestElo: number;
  roundsPlayed: number;
  firstPlaces: number; // rounds finished #1
  bestReturnPct: number;
  bestRoundProfit: number; // best single-round $ gain
  unlocked: string[]; // achievement ids
}

const KEY = "tradr.profile.v1";

export function defaultProfile(): Profile {
  return {
    elo: BASE_ELO,
    bestElo: BASE_ELO,
    roundsPlayed: 0,
    firstPlaces: 0,
    bestReturnPct: 0,
    bestRoundProfit: 0,
    unlocked: [],
  };
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    return { ...defaultProfile(), ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore quota / privacy-mode errors
  }
}
