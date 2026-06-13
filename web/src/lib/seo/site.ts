export const SITE_NAME = "Tradr";

export const DEFAULT_TITLE =
  "Tradr — Free Browser Trading Game vs Algorithmic Bots";

export const DEFAULT_DESCRIPTION =
  "Tradr is a free browser trading game. Trade live candlestick charts in 3-minute races against RSI, EMA, and Darvas-style algorithmic bots. Solo, multiplayer rooms, and a community gallery with replay and play-alongside mode. Paper trading simulation—not financial advice.";

export const DEFAULT_KEYWORDS = [
  "trading game",
  "browser trading game",
  "paper trading game",
  "algorithmic trading bots",
  "trading simulator",
  "multiplayer trading game",
  "free trading game",
  "candlestick chart game",
  "Tradr",
  "tradr.it.com",
];

export const BRAND = {
  emerald: "#34d399",
  slate950: "#020617",
  slate900: "#0f172a",
  sky: "#38bdf8",
} as const;

/** Canonical production URL; override with NEXT_PUBLIC_SITE_URL in env. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = raw && raw.length > 0 ? raw : "https://tradr.it.com";
  return url.replace(/\/$/, "");
}

export const SOCIAL_HANDLE = "@tradr";