// Round review (复盘): full candle series + deal list (交割单) for post-round chart replay.
// Everyone can review the last round; saving to history requires registration.
//
// Backward compatibility: v1 reviews only had player `trades`. v2 adds optional
// allTrades / standings / chat / matchStats. Readers must tolerate missing fields.

import type { Candle } from "@/lib/sim/types";

export type TraderKind = "player" | "bot" | "human";

export interface DealTrade {
  side: "long" | "short";
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  returnPct: number;
  openBar: number;
  closeBar: number;
  openDate?: string;
  closeDate?: string;
  /** Present on v2 allTrades (and optional on player trades). */
  traderId?: string;
  traderName?: string;
  traderKind?: TraderKind;
  color?: string;
}

export interface ReviewSummary {
  returnPct: number;
  profit: number;
  trades: number;
  wins: number;
  rank: number;
  totalPlayers: number;
  eloDelta: number;
}

export interface ReviewStanding {
  id: string;
  name: string;
  color: string;
  kind: TraderKind;
  equity: number;
  returnPct: number;
  trades: number;
  wins: number;
}

export interface ReviewChatMsg {
  /** Candle bar time when known; otherwise relative ms / tick. */
  t: number;
  name: string;
  text: string;
  color?: string;
  id?: string;
}

export interface MatchStats {
  durationMs?: number;
  marketLabel: string;
  mode: string;
  fieldSize: number;
  totalDeals: number;
  playerDeals: number;
  botDeals: number;
  chatCount: number;
  /** Best return */
  mvpId?: string;
  /** Most closed trades */
  volumeKingId?: string;
  /** Best win rate (≥2 trades) */
  sharpId?: string;
}

export interface RoundReview {
  /** Omit or 1 = legacy player-only trades; 2 = enriched tape. */
  v?: 1 | 2;
  id: string;
  createdAt: number;
  marketId: string;
  marketLabel: string;
  seed: number;
  candles: Candle[];
  /** Player closed deals — kept player-only for ghost/play-alongside BC. */
  trades: DealTrade[];
  /** Player + bots (+ humans). Chart/box-score prefer this when present. */
  allTrades?: DealTrade[];
  standings?: ReviewStanding[];
  chat?: ReviewChatMsg[];
  matchStats?: MatchStats;
  summary: ReviewSummary;
}

const HISTORY_KEY = "tradr.reviews.v1";
const ACCOUNT_KEY = "tradr.account.email";
const MAX_SAVED = 30;

export function isRegistered(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(ACCOUNT_KEY));
}

export function accountEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCOUNT_KEY);
}

export function register(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_KEY, email.trim().toLowerCase());
}

export function loadReviews(): RoundReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RoundReview[];
  } catch {
    return [];
  }
}

export function saveReview(review: RoundReview): boolean {
  if (typeof window === "undefined") return false;
  if (!isRegistered()) return false;
  const list = loadReviews().filter((r) => r.id !== review.id);
  list.unshift(review);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
    return true;
  } catch {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
      return true;
    } catch {
      return false;
    }
  }
}

export function deleteReview(id: string): void {
  if (typeof window === "undefined") return;
  const list = loadReviews().filter((r) => r.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function isReviewSaved(id: string): boolean {
  return loadReviews().some((r) => r.id === id);
}

/** Deals for MT5-style chart: prefer allTrades, fall back to player trades. */
export function reviewDealsForChart(review: RoundReview): DealTrade[] {
  if (Array.isArray(review.allTrades) && review.allTrades.length > 0) return review.allTrades;
  return Array.isArray(review.trades) ? review.trades : [];
}
