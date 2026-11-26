import { RNG } from "./rng";
import { ARCHETYPES, type Strategy } from "./strategies";

// A fully-realized competitor for one round: a tuned strategy plus the cosmetic
// identity and the leverage/rating that make the field feel alive.
export interface BotSpec {
  id: string;
  name: string;
  color: string;
  blurb: string;
  exposure: number; // notional multiple of balance per trade
  rating: number; // implied ELO, used for matchmaking + game-over scoring
  strategy: Strategy;
}

export const BASE_ELO = 1000;

// Procedural surnames so each randomized bot reads like a rival quant desk.
const SURNAMES = [
  "Volkov", "Mecha", "Quanta", "Nakamoto", "Petrov", "Vega", "Orion", "Nyx",
  "Zephyr", "Cypher", "Ada", "Kraken", "Helix", "Nova", "Rho", "Sigma",
  "Tesser", "Goliath", "Mirage", "Drift", "Apex", "Onyx",
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

// Maps a player rating to a 0..1 difficulty knob (≈800 ELO -> 0, ≈2000 -> 1).
export function difficultyForElo(playerElo: number): number {
  return clamp((playerElo - 800) / 1200, 0, 1);
}

// Build the roguelike field for a round. Seeded by the round seed so a given
// seed always reproduces the same opponents; tuned by the player's ELO so the
// field gets tougher (bigger size, sharper params, higher rating) as you climb.
export function generateBots(seed: number, playerElo: number = BASE_ELO, count = 6): BotSpec[] {
  const r = new RNG((seed ^ 0x9e3779b9) >>> 0);
  const difficulty = difficultyForElo(playerElo);
  const order = r.shuffle(ARCHETYPES);
  const usedSurnames = new Set<string>();

  const bots: BotSpec[] = [];
  for (let i = 0; i < count; i++) {
    const arch = order[i % order.length];
    const params = arch.roll(r);

    // Tougher fields lever up more aggressively.
    const baseExp = 1.2 + difficulty * 1.6; // 1.2 .. 2.8
    const exposure = Math.round(baseExp * r.range(0.7, 1.3) * 10) / 10;

    // Implied rating: a spread around the player, nudged up with difficulty.
    const rating = Math.round(playerElo + r.range(-160, 160) + (difficulty - 0.5) * 140);

    let surname = r.pick(SURNAMES);
    for (let tries = 0; usedSurnames.has(surname) && tries < 8; tries++) surname = r.pick(SURNAMES);
    usedSurnames.add(surname);

    const hue = (arch.hue + r.int(-14, 14) + 360) % 360;
    const color = hsl(hue, 68, 62);
    const id = `bot-${i}-${arch.key}`;
    const name = `${arch.name(params)} ${surname}`;
    const blurb = arch.blurb(params);

    bots.push({
      id,
      name,
      color,
      blurb,
      exposure: clamp(exposure, 0.8, 3.5),
      rating: clamp(rating, 600, 2400),
      strategy: { id, name, color, blurb, onBar: arch.make(params) },
    });
  }
  return bots;
}
