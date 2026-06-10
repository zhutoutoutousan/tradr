"use client";

import Link from "next/link";
import type { RoundResult } from "@/hooks/useGame";

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function LandingIntro({
  result,
  onPlayAgain,
  onTutorial,
  onChangeMode,
}: {
  result: RoundResult | null;
  onPlayAgain: () => void;
  onTutorial?: () => void;
  onChangeMode?: () => void;
}) {
  const won = result?.rank === 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-emerald-400">◆ Tradr</span>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/community"
              className="rounded-lg border border-sky-500/50 px-3 py-1.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/10"
            >
              Community gallery
            </Link>
            {onTutorial && (
              <button
                data-testid="landing-tutorial"
                onClick={onTutorial}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Tutorial
              </button>
            )}
            {onChangeMode && (
              <button
                data-testid="landing-change-mode"
                onClick={onChangeMode}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Change mode
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {result && (
          <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Last round</p>
            <h2 className={`mt-1 text-2xl font-bold ${won ? "text-emerald-400" : "text-slate-100"}`}>
              {won ? "You beat the bots!" : `Finished ${ORDINAL[result.rank] ?? `#${result.rank}`}`}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{result.review.marketLabel}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                label="Return"
                value={`${result.summary.returnPct >= 0 ? "+" : ""}${result.summary.returnPct.toFixed(1)}%`}
                up={result.summary.returnPct >= 0}
              />
              <MiniStat label="P&L" value={money(result.summary.profit)} up={result.summary.profit >= 0} />
              <MiniStat
                label="ELO"
                value={`${result.eloAfter} (${result.eloDelta >= 0 ? "+" : ""}${result.eloDelta})`}
                up={result.eloDelta >= 0}
              />
              <MiniStat label="Trades" value={`${result.summary.trades}`} />
            </div>
          </section>
        )}

        <section className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Trade against <span className="text-emerald-400">roguelike bots</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
            Tradr is a fast-paced trading game. Every round throws you into a random market with a random timeframe
            and indicator stack — compete for 3 minutes, review your chart like MT5, and climb the ELO ladder.
          </p>
          <button
            data-testid="landing-play-again"
            onClick={onPlayAgain}
            className="mt-8 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-bold text-slate-950 hover:bg-emerald-400"
          >
            Play again — new random setup
          </button>
        </section>

        <section className="mt-14 grid gap-6 sm:grid-cols-3">
          <Feature
            title="Random every round"
            text="Instrument, timeframe (5m–1D), and indicators like SMA, EMA, RSI, MACD, and Bollinger are rolled fresh each game."
          />
          <Feature
            title="Roguelike bot field"
            text="Six bots spawn with randomized strategies and parameters, matched to your ELO. No two rounds feel the same."
          />
          <Feature
            title="Review & improve"
            text="After each round, inspect entry/exit markers on the chart, read your deal list, and save runs when registered."
          />
        </section>

        <section className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-slate-200">How a round works</h3>
          <ol className="mt-4 space-y-3 text-sm text-slate-400">
            <li>
              <span className="font-semibold text-slate-300">1. Random setup</span> — market, candle speed, and chart
              indicators are chosen for you.
            </li>
            <li>
              <span className="font-semibold text-slate-300">2. Trade live</span> — long, short, or close with keys or
              mouse. Right-click always closes; it never flips your position.
            </li>
            <li>
              <span className="font-semibold text-slate-300">3. Use power-ups</span> — freeze bots, double leverage, peek
              the next move, slow time, or arm a hedge shield.
            </li>
            <li>
              <span className="font-semibold text-slate-300">4. Climb ELO</span> — finish above bots to gain rating;
              tougher opponents await at higher ranks.
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="font-semibold text-emerald-300">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </div>
  );
}

function MiniStat({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>{value}</div>
    </div>
  );
}
