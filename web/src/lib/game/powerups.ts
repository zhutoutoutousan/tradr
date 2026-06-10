// Active, consumable power-ups the player triggers during a round. Timing is
// driven in "play time" (wall-clock while the round is running and unpaused),
// so durations and cooldowns respect pause and the fast-forward speed.

export type PowerupId = "freeze" | "leverage" | "tip" | "slowmo" | "shield";

export interface PowerupDef {
  id: PowerupId;
  name: string;
  short: string;
  hotkey: string;
  description: string;
  charges: number; // uses per round
  cooldownMs: number; // lockout after each use
  durationMs: number; // 0 = instant / until-consumed
  color: string;
}

export const POWERUPS: PowerupDef[] = [
  {
    id: "freeze",
    name: "Freeze",
    short: "FRZ",
    hotkey: "Q",
    description: "Freeze every bot for 10s — they hold and make no new moves.",
    charges: 2,
    cooldownMs: 8000,
    durationMs: 10000,
    color: "#38bdf8",
  },
  {
    id: "leverage",
    name: "Leverage x2",
    short: "2X",
    hotkey: "W",
    description: "Double your position size for 12s. High risk, high reward.",
    charges: 2,
    cooldownMs: 9000,
    durationMs: 12000,
    color: "#f59e0b",
  },
  {
    id: "tip",
    name: "Insider Tip",
    short: "TIP",
    hotkey: "E",
    description: "Reveal which way the next candle is headed for 6s.",
    charges: 3,
    cooldownMs: 6000,
    durationMs: 6000,
    color: "#a78bfa",
  },
  {
    id: "slowmo",
    name: "Slow-Mo",
    short: "SLO",
    hotkey: "R",
    description: "Slow the market to a crawl for 8s for precise entries.",
    charges: 2,
    cooldownMs: 8000,
    durationMs: 8000,
    color: "#2dd4bf",
  },
  {
    id: "shield",
    name: "Hedge Shield",
    short: "SHD",
    hotkey: "T",
    description: "Your next losing trade is fully refunded.",
    charges: 1,
    cooldownMs: 0,
    durationMs: 0,
    color: "#f472b6",
  },
];

export const POWERUPS_BY_ID = new Map(POWERUPS.map((p) => [p.id, p]));
