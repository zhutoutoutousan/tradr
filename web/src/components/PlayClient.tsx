"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GameView, { type MarketOption } from "@/components/GameView";
import TutorialModal from "@/components/TutorialModal";
import LandingIntro from "@/components/LandingIntro";
import ModeSelect, { type GameMode } from "@/components/ModeSelect";
import MultiplayerJoin from "@/components/MultiplayerJoin";
import type { GameConfig, RoundResult } from "@/hooks/useGame";
import type { Candle } from "@/lib/sim/types";
import { pickRoundSetup, type RoundSetup } from "@/lib/game/roundSetup";
import { saveAnonymousGame } from "@/lib/game/anonymousGames";

const TUTORIAL_KEY = "tradr.tutorial.v1";

interface Dataset {
  id: string;
  name: string;
  kind: string;
  candles: Candle[];
}

type Phase = "boot" | "mode" | "tutorial" | "playing" | "postgame";

function newSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

export default function PlayClient() {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("boot");
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [seed, setSeed] = useState(0);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [setup, setSetup] = useState<RoundSetup | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setSeed(newSeed());
    setReady(true);
    setPhase("mode");
  }, []);

  useEffect(() => {
    fetch("/data/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: MarketOption[]) => setMarkets(list))
      .catch(() => setMarkets([]));
  }, []);

  useEffect(() => {
    if (!ready || gameMode !== "solo") return;
    setSetup(pickRoundSetup(seed, markets));
  }, [seed, markets, ready, gameMode]);

  useEffect(() => {
    if (!setup || setup.instrumentId === "synthetic") {
      setDataset(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/data/${setup.instrumentId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${setup.instrumentId}`);
        return r.json();
      })
      .then((d: Dataset) => {
        if (!cancelled) setDataset(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setup]);

  const pickMode = useCallback((mode: GameMode) => {
    setGameMode(mode);
    if (mode === "multiplayer") return;
    const seen = localStorage.getItem(TUTORIAL_KEY);
    setPhase(seen ? "playing" : "tutorial");
  }, []);

  const finishTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, "1");
    setShowTutorial(false);
    setPhase("playing");
  }, []);

  const handleReplay = useCallback(() => {
    setSeed(newSeed());
    setPhase("playing");
    setGameMode("solo");
  }, []);

  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      setLastResult(result);
      if (setup) {
        saveAnonymousGame(result, setup, "solo").catch((err) => {
          console.warn("community save failed", err);
        });
      }
    },
    [setup],
  );

  const handleContinue = useCallback(() => {
    setPhase("postgame");
  }, []);

  const backToMode = useCallback(() => {
    setGameMode(null);
    setPhase("mode");
  }, []);

  const config: GameConfig | null = useMemo(() => {
    if (!setup) return null;
    if (setup.instrumentId === "synthetic") return { kind: "synthetic", seed, setup };
    if (dataset && dataset.id === setup.instrumentId)
      return { kind: "historical", id: dataset.id, label: dataset.name, candles: dataset.candles, seed, setup };
    return null;
  }, [setup, dataset, seed]);

  if (gameMode === "multiplayer") {
    return <MultiplayerJoin onBack={backToMode} />;
  }

  if (!ready || phase === "boot") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  if (phase === "mode") {
    return <ModeSelect onPick={pickMode} />;
  }

  if (phase === "postgame") {
    return (
      <>
        {showTutorial && <TutorialModal onStart={() => setShowTutorial(false)} />}
        <LandingIntro
          result={lastResult}
          onPlayAgain={handleReplay}
          onTutorial={() => setShowTutorial(true)}
          onChangeMode={backToMode}
        />
      </>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-slate-300">
        <p className="text-rose-400">{error}</p>
        <button onClick={handleReplay} className="rounded-lg bg-slate-800 px-4 py-3 hover:bg-slate-700">
          Try another random market
        </button>
      </div>
    );
  }

  const waiting = gameMode === "solo" && (!config || loading);
  if (waiting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">
        Rolling random market setup…
      </div>
    );
  }

  const key = config!.kind === "synthetic" ? `syn-${seed}` : `hist-${config!.id}-${seed}`;

  if (phase === "tutorial") {
    return <TutorialModal onStart={finishTutorial} />;
  }

  return (
    <>
      {showTutorial && <TutorialModal onStart={() => setShowTutorial(false)} />}
      <GameView
        key={key}
        config={config!}
        setup={setup!}
        markets={markets}
        onReplay={handleReplay}
        onRoundEnd={handleRoundEnd}
        onContinue={handleContinue}
        onOpenTutorial={() => setShowTutorial(true)}
      />
    </>
  );
}
