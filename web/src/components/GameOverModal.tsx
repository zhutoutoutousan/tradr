"use client";

import type { RoundResult } from "@/hooks/useGame";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

export default function GameOverModal({
  result,
  onReplay,
  onMenu,
  onReview,
  onContinue,
}: {
  result: RoundResult;
  onReplay: () => void;
  onMenu: () => void;
  onReview: () => void;
  onContinue?: () => void;
}) {
  const { standings, rank, summary, eloBefore, eloAfter, eloDelta, newAchievements } = result;
  const won = rank === 1;
  const winRate = summary.trades > 0 ? (summary.wins / summary.trades) * 100 : 0;
  const eloUp = eloDelta >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" data-testid="game-over-modal">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500" data-testid="game-over-label">Round over</p>
          <h2 className={`mt-1 text-3xl font-extrabold ${won ? "text-emerald-400" : "text-slate-100"}`}>
            {won ? "You beat the bots!" : `You finished ${ORDINAL[rank] ?? `#${rank}`}`}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {ORDINAL[rank] ?? `#${rank}`} of {summary.totalPlayers} traders
          </p>
        </div>

        {/* ELO */}
        <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 py-3">
          <span className="text-sm text-slate-400">ELO</span>
          <span className="font-mono text-lg text-slate-300">{eloBefore}</span>
          <span className="text-slate-500">{"->"}</span>
          <span className="font-mono text-2xl font-bold text-slate-100">{eloAfter}</span>
          <span className={`font-mono text-sm font-semibold ${eloUp ? "text-emerald-400" : "text-rose-400"}`}>
            {eloUp ? "+" : ""}
            {eloDelta}
          </span>
        </div>

        {/* Round stats */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Stat
            label="Return"
            value={`${summary.returnPct >= 0 ? "+" : ""}${summary.returnPct.toFixed(1)}%`}
            tone={summary.returnPct >= 0 ? "up" : "down"}
          />
          <Stat label="P&L" value={money(summary.profit)} tone={summary.profit >= 0 ? "up" : "down"} />
          <Stat label="Trades" value={`${summary.trades}`} />
          <Stat label="Win rate" value={`${winRate.toFixed(0)}%`} />
        </div>

        {/* Achievements unlocked this round */}
        {newAchievements.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Achievement{newAchievements.length > 1 ? "s" : ""} unlocked
            </p>
            <ul className="space-y-1.5">
              {newAchievements.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400">★</span>
                  <span>
                    <span className="font-semibold text-slate-100">{a.name}</span>
                    <span className="text-slate-400"> — {a.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Final leaderboard */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Final standings</p>
          <div className="space-y-1">
            {standings.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                  t.kind === "player" ? "bg-emerald-500/10" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-4 font-mono text-xs text-slate-500">{i + 1}</span>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
                  <span className={`truncate ${t.kind === "player" ? "font-bold text-emerald-300" : "text-slate-300"}`}>
                    {t.name}
                  </span>
                </div>
                <span className={`font-mono tabular-nums ${t.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.returnPct >= 0 ? "+" : ""}
                  {t.returnPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            data-testid="game-over-menu"
            onClick={onMenu}
            className="flex-1 rounded-lg border border-slate-700 py-3 font-semibold text-slate-200 hover:bg-slate-800"
          >
            Menu
          </button>
          <button
            data-testid="game-over-review"
            onClick={onReview}
            className="flex-1 rounded-lg border border-sky-500/60 bg-sky-500/10 py-3 font-semibold text-sky-300 hover:bg-sky-500/20"
          >
            Review
          </button>
          {onContinue && (
            <button
              data-testid="game-over-continue"
              onClick={onContinue}
              className="flex-1 rounded-lg border border-violet-500/60 bg-violet-500/10 py-3 font-semibold text-violet-300 hover:bg-violet-500/20"
            >
              Continue
            </button>
          )}
          <button
            data-testid="game-over-replay"
            onClick={onReplay}
            className="flex-[2] rounded-lg bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400"
          >
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`font-mono text-sm font-semibold tabular-nums ${
          tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-slate-200"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
