import type { ChallengeLevel } from "@/lib/game/challenges";

const KEY = "tradr.academy.pendingChallenge";

export interface PendingChallenge {
  levelId: string;
  title: string;
  durationMs: number;
  botCount: number;
  difficulty: number;
  startingCash: number;
  returnTo: string;
}

export function stashChallenge(level: ChallengeLevel, returnTo = "/academy/story"): void {
  const payload: PendingChallenge = {
    levelId: level.id,
    title: level.title,
    durationMs: level.config.durationMs,
    botCount: level.config.botCount,
    difficulty: level.config.difficulty,
    startingCash: level.config.startingCash,
    returnTo,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekChallenge(): PendingChallenge | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingChallenge;
  } catch {
    return null;
  }
}

export function takeChallenge(): PendingChallenge | null {
  const v = peekChallenge();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return v;
}

export function challengePlayHref(levelId: string): string {
  // Root hosts PlayClient; /play redirects here and must keep ?level=
  return `/?level=${encodeURIComponent(levelId)}`;
}
