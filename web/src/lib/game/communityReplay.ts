import type { GameConfig } from "@/hooks/useGame";
import type { Candle } from "@/lib/sim/types";
import type { CommunityGame } from "@/lib/game/anonymousGames";
import type { RoundSetup } from "@/lib/game/roundSetup";
import type { GhostBotSpec } from "@/lib/sim/ghostReplay";

const DEFAULT_SETUP: RoundSetup = {
  instrumentId: "synthetic",
  timeframe: "1h",
  ticksPerBar: 9,
  timeframeLabel: "1H",
  indicators: [
    { kind: "ema", period: 21, label: "EMA(21)", color: "#a78bfa" },
    { kind: "rsi", period: 14, label: "RSI(14)", color: "#22d3ee" },
  ],
};

export function resolveRoundSetup(game: CommunityGame): RoundSetup {
  if (game.setup) return game.setup;
  return {
    ...DEFAULT_SETUP,
    instrumentId: game.review.marketId || DEFAULT_SETUP.instrumentId,
  };
}

export function buildGhostBotSpec(game: CommunityGame): GhostBotSpec {
  const s = game.review.summary;
  const sign = s.returnPct >= 0 ? "+" : "";
  return {
    id: `ghost-${game.id}`,
    name: "Peer trader",
    color: "#fb7185",
    blurb: `Gallery replay · ${sign}${s.returnPct.toFixed(1)}% · ${game.trades} trades`,
    trades: game.review.trades,
  };
}

export function buildCommunityReplayConfig(
  game: CommunityGame,
  setup: RoundSetup,
  candles?: Candle[],
): GameConfig {
  const seed = game.review.seed;
  const ghost = buildGhostBotSpec(game);
  if (setup.instrumentId === "synthetic") {
    return { kind: "synthetic", seed, setup, ghost };
  }
  if (!candles?.length) throw new Error("missing_market_data");
  const label = game.review.marketLabel.split(" · ")[0] ?? setup.instrumentId;
  return {
    kind: "historical",
    id: setup.instrumentId,
    label,
    candles,
    seed,
    setup,
    ghost,
  };
}

export function communityReplayBanner(game: CommunityGame): string {
  return `Gallery replay · ${game.marketLabel}`;
}