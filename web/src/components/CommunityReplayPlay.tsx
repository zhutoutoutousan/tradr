"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GameView, { type MarketOption } from "@/components/GameView";
import type { GameConfig } from "@/hooks/useGame";
import type { RoundResult } from "@/hooks/useGame";
import type { Candle } from "@/lib/sim/types";
import {
  buildCommunityReplayConfig,
  communityReplayBanner,
  resolveRoundSetup,
} from "@/lib/game/communityReplay";
import { fetchCommunityGame, type CommunityGame } from "@/lib/game/anonymousGames";
import { saveAnonymousGame } from "@/lib/game/anonymousGames";

interface Dataset {
  id: string;
  name: string;
  kind: string;
  candles: Candle[];
}

export default function CommunityReplayPlay({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [game, setGame] = useState<CommunityGame | null>(null);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    fetch("/data/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: MarketOption[]) => setMarkets(list))
      .catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCommunityGame(gameId)
      .then((g) => {
        if (!cancelled) setGame(g);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this gallery run.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, attempt]);

  const setup = useMemo(() => (game ? resolveRoundSetup(game) : null), [game]);

  useEffect(() => {
    if (!setup || setup.instrumentId === "synthetic") {
      setDataset(null);
      return;
    }
    let cancelled = false;
    setLoadingMarket(true);
    fetch(`/data/${setup.instrumentId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${setup.instrumentId}`);
        return r.json();
      })
      .then((d: Dataset) => {
        if (!cancelled) setDataset(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingMarket(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setup]);

  const config: GameConfig | null = useMemo(() => {
    if (!game || !setup) return null;
    try {
      if (setup.instrumentId === "synthetic") return buildCommunityReplayConfig(game, setup);
      if (dataset && dataset.id === setup.instrumentId) {
        return buildCommunityReplayConfig(game, setup, dataset.candles);
      }
      return null;
    } catch {
      return null;
    }
  }, [game, setup, dataset]);

  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      if (!setup) return;
      saveAnonymousGame(result, setup, game?.mode ?? "solo").catch((err) => {
        console.warn("community save failed", err);
      });
    },
    [setup, game?.mode],
  );

  const handleReplay = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  const handleContinue = useCallback(() => {
    router.push(`/community/${encodeURIComponent(gameId)}`);
  }, [router, gameId]);

  if (loading) {
    return (
      <Shell gameId={gameId}>
        <p className="text-slate-500">Loading gallery replay…</p>
      </Shell>
    );
  }

  if (error || !game || !setup || !config) {
    return (
      <Shell gameId={gameId}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
          <p className="text-slate-300">{error ?? "This gallery run could not be loaded for replay."}</p>
          <Link
            href={`/community/${encodeURIComponent(gameId)}`}
            className="mt-4 inline-block text-sm font-semibold text-sky-300 hover:text-sky-200"
          >
            ← Back to replay
          </Link>
        </div>
      </Shell>
    );
  }

  if (loadingMarket) {
    return (
      <Shell gameId={gameId}>
        <p className="text-slate-500">Loading market data…</p>
      </Shell>
    );
  }

  const key = `${gameId}-${attempt}`;

  return (
    <div className="min-h-[100dvh] bg-slate-950">
      <div className="border-b border-violet-500/30 bg-violet-500/10 px-4 py-2 text-center text-sm text-violet-100">
        {communityReplayBanner(game)} — trade live while the original run replays as{" "}
        <span className="font-semibold text-violet-200">Peer trader</span> alongside the bots.
        <Link
          href={`/community/${encodeURIComponent(gameId)}`}
          className="ml-3 font-semibold text-violet-200 underline hover:text-white"
        >
          Watch only
        </Link>
      </div>
      <GameView
        key={key}
        config={config}
        setup={setup}
        markets={markets}
        replayBanner={communityReplayBanner(game)}
        onReplay={handleReplay}
        onRoundEnd={handleRoundEnd}
        onContinue={handleContinue}
      />
    </div>
  );
}

function Shell({ gameId, children }: { gameId: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-emerald-400">
            ◆ Tradr
          </Link>
          <Link href={`/community/${encodeURIComponent(gameId)}`} className="text-sm text-slate-400 hover:text-slate-200">
            Back
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}