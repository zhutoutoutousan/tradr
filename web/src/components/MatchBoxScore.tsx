"use client";

import type { RoundReview } from "@/lib/game/reviews";
import { standingName } from "@/lib/game/matchStats";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Basketball/football-style match sheet for a Tradili race tape. */
export default function MatchBoxScore({ review }: { review: RoundReview }) {
  const s = review.summary;
  const stats = review.matchStats;
  const standings = review.standings ?? [];
  const chat = review.chat ?? [];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50" data-testid="match-box-score">
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-400">Tradili · box score</p>
        <h3 className="mt-0.5 font-bold text-white">{review.marketLabel}</h3>
        <p className="text-xs text-slate-500">
          {stats?.mode ?? "solo"} · field {(stats?.fieldSize ?? s.totalPlayers) || "—"} ·{" "}
          {stats?.totalDeals ?? review.trades.length} deals
          {stats?.chatCount ? ` · ${stats.chatCount} chat` : chat.length ? ` · ${chat.length} chat` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        <Award label="MVP" value={standingName(review, stats?.mvpId)} hint="Best return" />
        <Award label="Volume" value={standingName(review, stats?.volumeKingId)} hint="Most trades" />
        <Award label="Sharp" value={standingName(review, stats?.sharpId)} hint="Win rate" />
        <Award
          label="You"
          value={`#${s.rank}`}
          hint={`${s.returnPct >= 0 ? "+" : ""}${s.returnPct.toFixed(1)}% · ${money(s.profit)}`}
        />
      </div>

      {standings.length > 0 ? (
        <div className="border-t border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Trader</th>
                <th className="px-3 py-2 text-right">Return</th>
                <th className="px-3 py-2 text-right">Deals</th>
              </tr>
            </thead>
            <tbody>
              {[...standings]
                .sort((a, b) => b.equity - a.equity)
                .map((row, i) => (
                  <tr key={row.id} className="border-t border-slate-800/80">
                    <td className="px-3 py-2 font-mono text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: row.color }} />
                      <span className={row.kind === "bot" ? "text-slate-400" : "text-slate-100"}>{row.name}</span>
                      {row.kind === "bot" ? (
                        <span className="ml-1 text-[10px] uppercase text-slate-600">bot</span>
                      ) : null}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        row.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {row.returnPct >= 0 ? "+" : ""}
                      {row.returnPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">{row.trades}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
          Legacy tape — standings not stored. New races record the full field.
        </p>
      )}

      {chat.length > 0 ? (
        <div className="max-h-36 overflow-y-auto border-t border-slate-800 px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-400">Race chat</p>
          {chat.map((m, i) => (
            <p key={m.id ?? i} className="text-xs text-slate-400">
              <span className="font-semibold" style={{ color: m.color ?? "#c084fc" }}>
                {m.name}
              </span>
              : {m.text}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Award({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="truncate text-sm font-bold text-amber-200">{value}</p>
      <p className="truncate text-[10px] text-slate-600">{hint}</p>
    </div>
  );
}
