"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import CandleChart from "@/components/CandleChart";
import TraderCard from "@/components/TraderCard";
import { useGame, type GameConfig } from "@/hooks/useGame";

export interface MarketOption {
  id: string;
  name: string;
  kind: string;
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const KIND_LABELS: Record<string, string> = {
  forex: "Forex",
  commodity: "Commodities",
  crypto: "Crypto",
  stock: "Stocks",
};

export default function GameView({
  config,
  markets,
  selectedId,
  onSelect,
}: {
  config: GameConfig;
  markets: MarketOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { snapshot, running, speed, speedIdx, speeds, controls } = useGame(config);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) return;
      switch (e.key.toLowerCase()) {
        case "b":
          controls.long();
          break;
        case "s":
          controls.short();
          break;
        case "c":
          controls.close();
          break;
        case " ":
          e.preventDefault();
          controls.togglePause();
          break;
        case "f":
          controls.cycleSpeed();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          controls.setSpeedIdx(Number(e.key) - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls]);

  const leaderboard = useMemo(() => {
    if (!snapshot) return [];
    return [snapshot.player, ...snapshot.bots].sort((a, b) => b.equity - a.equity);
  }, [snapshot]);

  const botPositions = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.bots
      .filter((b) => b.position)
      .map((b) => ({
        label: b.name.split(" ")[0],
        color: b.color,
        side: b.position!.side,
        entry: b.position!.entry,
      }));
  }, [snapshot]);

  const grouped = useMemo(() => {
    const g: Record<string, MarketOption[]> = {};
    for (const m of markets) (g[m.kind] ??= []).push(m);
    return g;
  }, [markets]);

  if (!snapshot) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading market…</div>;
  }

  const p = snapshot.player;
  const playerRank = leaderboard.findIndex((t) => t.id === "you") + 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold tracking-tight text-emerald-400">
            ◆ Tradr
          </Link>
          <select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
          >
            <option value="synthetic">Random (synthetic)</option>
            {Object.entries(grouped).map(([kind, opts]) => (
              <optgroup key={kind} label={KIND_LABELS[kind] ?? kind}>
                {opts.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span className="hidden text-xs text-slate-500 sm:inline">
            bar {snapshot.bar}
            {snapshot.date ? ` · ${snapshot.date}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={controls.togglePause}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700"
          >
            {running ? "❚❚ Pause" : "▶ Resume"}
          </button>
          <div className="flex items-center overflow-hidden rounded-md border border-slate-700">
            {speeds.map((s, i) => (
              <button
                key={s}
                onClick={() => controls.setSpeedIdx(i)}
                className={`px-2.5 py-1.5 text-sm font-mono ${
                  speedIdx === i ? "bg-emerald-500 text-slate-950" : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <span className="hidden text-xs text-slate-500 md:inline">speed {speed}x</span>
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{snapshot.label}</div>
                <div className="font-mono text-2xl tabular-nums">{snapshot.price.toFixed(snapshot.price < 10 ? 4 : 2)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Your equity</div>
                <div className="font-mono text-xl tabular-nums">{money(p.equity)}</div>
                <div className={`font-mono text-sm ${p.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {p.returnPct >= 0 ? "+" : ""}
                  {p.returnPct.toFixed(2)}%
                </div>
              </div>
            </div>
            <CandleChart candles={snapshot.candles} position={p.position} botPositions={botPositions} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="grid grid-cols-3 gap-3">
              <button onClick={controls.long} className="rounded-lg bg-emerald-600 py-3 font-bold hover:bg-emerald-500">
                Long <span className="opacity-60">(B)</span>
              </button>
              <button onClick={controls.short} className="rounded-lg bg-rose-600 py-3 font-bold hover:bg-rose-500">
                Short <span className="opacity-60">(S)</span>
              </button>
              <button onClick={controls.close} className="rounded-lg bg-slate-700 py-3 font-bold hover:bg-slate-600">
                Close <span className="opacity-60">(C)</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Stat label="Balance" value={money(p.balance)} />
              <Stat
                label="Open P&L"
                value={`${p.unrealized >= 0 ? "+" : ""}${money(p.unrealized)}`}
                tone={p.unrealized >= 0 ? "up" : "down"}
              />
              <Stat
                label="Position"
                value={p.position ? `${p.position.side.toUpperCase()} @ ${p.position.entry.toFixed(2)}` : "Flat"}
              />
              <Stat label="Trades" value={`${p.trades}`} />
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">
            Shortcuts: <kbd>B</kbd> long · <kbd>S</kbd> short · <kbd>C</kbd> close · <kbd>Space</kbd> pause ·{" "}
            <kbd>F</kbd> fast-forward · <kbd>1–4</kbd> speed
          </p>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-300">
              Leaderboard
              <span className="ml-2 font-normal text-slate-500">you are #{playerRank}</span>
            </h2>
            <div className="space-y-2">
              {leaderboard.map((t, i) => (
                <TraderCard key={t.id} t={t} rank={i + 1} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
            <p className="mb-1 font-semibold text-slate-300">The bots</p>
            <p>
              Each bot runs a strategy ported from the MT5 <code>cluster-latest</code> expert advisor — RSI scalping,
              Darvas box breakouts and EMA slope/distance — trading the same feed you see. Pick a real market above to
              replay 5 years of daily history, or stay on the synthetic feed.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`font-mono tabular-nums ${
          tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-slate-200"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
