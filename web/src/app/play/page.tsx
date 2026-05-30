"use client";

import { useEffect, useMemo, useState } from "react";
import GameView, { type MarketOption } from "@/components/GameView";
import type { GameConfig } from "@/hooks/useGame";
import type { Candle } from "@/lib/sim/types";

interface Dataset {
  id: string;
  name: string;
  kind: string;
  candles: Candle[];
}

export default function PlayPage() {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [selectedId, setSelectedId] = useState("synthetic");
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the list of available real markets once.
  useEffect(() => {
    fetch("/data/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: MarketOption[]) => setMarkets(list))
      .catch(() => setMarkets([]));
  }, []);

  // Load candles when a real market is selected.
  useEffect(() => {
    if (selectedId === "synthetic") {
      setDataset(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/data/${selectedId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${selectedId}`);
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
  }, [selectedId]);

  const config: GameConfig | null = useMemo(() => {
    if (selectedId === "synthetic") return { kind: "synthetic", seed };
    if (dataset && dataset.id === selectedId)
      return { kind: "historical", id: dataset.id, label: dataset.name, candles: dataset.candles };
    return null;
  }, [selectedId, dataset, seed]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
        <p className="text-rose-400">{error}</p>
        <button onClick={() => setSelectedId("synthetic")} className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700">
          Back to synthetic market
        </button>
      </div>
    );
  }

  if (!config || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading {selectedId === "synthetic" ? "market" : selectedId.toUpperCase()}…
      </div>
    );
  }

  // Remount GameView on market change so the engine fully resets.
  const key = config.kind === "synthetic" ? `syn-${seed}` : `hist-${config.id}`;
  return (
    <GameView key={key} config={config} markets={markets} selectedId={selectedId} onSelect={setSelectedId} />
  );
}
