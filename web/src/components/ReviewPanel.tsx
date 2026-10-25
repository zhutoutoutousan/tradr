"use client";

import { useMemo, useState } from "react";
import ReviewChart from "@/components/ReviewChart";
import MatchBoxScore from "@/components/MatchBoxScore";
import { reviewDealsForChart, type RoundReview } from "@/lib/game/reviews";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ReviewPanel({
  review,
  chartHeight = 380,
}: {
  review: RoundReview;
  chartHeight?: number;
}) {
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "player" | "bot">("all");
  const candles = review.candles ?? [];
  const deals = useMemo(() => {
    const all = reviewDealsForChart(review);
    if (filter === "player") return all.filter((t) => t.traderKind !== "bot");
    if (filter === "bot") return all.filter((t) => t.traderKind === "bot");
    return all;
  }, [review, filter]);

  return (
    <div className="space-y-4">
      <MatchBoxScore review={review} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
          <ReviewChart candles={candles} trades={deals} focusIdx={focusIdx} height={chartHeight} />
          <p className="mt-2 px-1 text-xs text-slate-500">
            MT5-style tape: arrows at entry/exit, dashed connector. Bot deals are lighter. Click a deal to focus.
          </p>
        </div>

        <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-950/40 lg:max-h-[420px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <span className="text-sm font-semibold text-slate-300">Deals ({deals.length})</span>
            <div className="flex gap-1">
              {(["all", "player", "bot"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setFocusIdx(null);
                  }}
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    filter === f ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {deals.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No closed trades this round.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Who</th>
                    <th className="px-2 py-1.5">Side</th>
                    <th className="px-2 py-1.5">Entry</th>
                    <th className="px-2 py-1.5">Exit</th>
                    <th className="px-2 py-1.5 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((t, i) => {
                    const focused = focusIdx === i;
                    return (
                      <tr
                        key={`${t.traderId ?? "p"}-${i}`}
                        onClick={() => setFocusIdx(focused ? null : i)}
                        className={`cursor-pointer border-t border-slate-800/80 ${focused ? "bg-emerald-500/10" : "hover:bg-slate-800/50"}`}
                      >
                        <td className="px-2 py-2">
                          <span
                            className="mr-1 inline-block h-2 w-2 rounded-full"
                            style={{ background: t.color ?? "#94a3b8" }}
                          />
                          <span className="text-slate-300">{(t.traderName ?? "You").split(" ")[0]}</span>
                        </td>
                        <td
                          className={`px-2 py-2 font-semibold uppercase ${t.side === "long" ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {t.side}
                        </td>
                        <td className="px-2 py-2 font-mono tabular-nums">{t.entry.toFixed(2)}</td>
                        <td className="px-2 py-2 font-mono tabular-nums">{t.exit.toFixed(2)}</td>
                        <td
                          className={`px-2 py-2 text-right font-mono tabular-nums ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {t.pnl >= 0 ? "+" : ""}
                          {money(t.pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
