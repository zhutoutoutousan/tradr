"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCommunityGamesPage, type CommunityGame } from "@/lib/game/anonymousGames";

/** Homepage race-tape strip — Tradili (Tradr × Bilibili × YouTube). */
export default function TradiliStrip() {
  const [games, setGames] = useState<CommunityGame[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCommunityGamesPage(6, null)
      .then((page) => {
        if (!cancelled) setGames(page.games);
      })
      .catch(() => {
        if (!cancelled) setGames([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="col-span-full border-t border-rose-500/20 bg-gradient-to-r from-slate-950 via-rose-950/30 to-slate-950 px-4 py-3"
      data-testid="tradili-strip"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400">Tradili</p>
          <p className="text-sm font-bold text-slate-100 sm:text-base">
            Race tapes · danmaku · MT5 deal lines
          </p>
          <p className="text-xs text-slate-500">
            Watch past player & bot races — chat and deals stay on the tape.
          </p>
        </div>
        <Link
          href="/tradili"
          data-testid="tradili-strip-open"
          className="shrink-0 rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-rose-400"
        >
          Open Tradili →
        </Link>
      </div>

      {games.length > 0 ? (
        <div className="mx-auto mt-3 flex max-w-6xl gap-2 overflow-x-auto pb-1">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/tradili/${encodeURIComponent(g.id)}`}
              className="min-w-[160px] max-w-[200px] shrink-0 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 transition hover:border-rose-500/40"
              data-testid="tradili-strip-card"
            >
              <p className="truncate text-xs font-semibold text-slate-200">{g.marketLabel}</p>
              <p
                className={`mt-1 font-mono text-sm font-bold ${
                  g.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {g.returnPct >= 0 ? "+" : ""}
                {g.returnPct.toFixed(1)}%
                <span className="ml-2 text-[10px] font-normal text-slate-500">#{g.rank}</span>
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
