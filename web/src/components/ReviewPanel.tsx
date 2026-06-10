"use client";

import { useState } from "react";
import ReviewChart from "@/components/ReviewChart";
import type { RoundReview } from "@/lib/game/reviews";

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
  const trades = review.trades ?? [];
  const candles = review.candles ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
        <ReviewChart candles={candles} trades={trades} focusIdx={focusIdx} height={chartHeight} />
        <p className="mt-2 px-1 text-xs text-slate-500">
          Drag or scroll to pan the chart. Entry/exit arrows show each deal; green/red line = win/loss. Click a deal to
          focus.
        </p>
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-950/40 lg:max-h-[420px]">
        <div className="border-b border-slate-800 px-3 py-2 text-sm font-semibold text-slate-300">
          Deal list ({trades.length})
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {trades.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No closed trades this round.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Side</th>
                  <th className="px-2 py-1.5">Entry</th>
                  <th className="px-2 py-1.5">Exit</th>
                  <th className="px-2 py-1.5 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => {
                  const focused = focusIdx === i;
                  return (
                    <tr
                      key={i}
                      onClick={() => setFocusIdx(focused ? null : i)}
                      className={`cursor-pointer border-t border-slate-800/80 ${focused ? "bg-emerald-500/10" : "hover:bg-slate-800/50"}`}
                    >
                      <td className="px-2 py-2 font-mono text-slate-500">{i + 1}</td>
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
  );
}
