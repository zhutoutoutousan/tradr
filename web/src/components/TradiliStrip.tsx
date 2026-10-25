"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCommunityGamesPage, type CommunityGame } from "@/lib/game/anonymousGames";

function shortLabel(label: string): string {
  // "UnitedHealth (UNH) · 1H" / "JPMorgan (JPM) · room 4KB…" → keep ticker-ish bit
  const paren = label.match(/\(([^)]+)\)/);
  if (paren) {
    const rest = label.split("·").slice(1).join("·").trim();
    return rest ? `${paren[1]} · ${rest}` : paren[1];
  }
  return label.length > 22 ? `${label.slice(0, 20)}…` : label;
}

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
      className="col-span-full w-full min-w-0 max-w-full overflow-hidden border-t border-rose-500/20 bg-gradient-to-r from-slate-950 via-rose-950/30 to-slate-950 px-3 py-2.5 sm:px-4 sm:py-3"
      data-testid="tradili-strip"
    >
      <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-400">Tradili</p>
          <p className="truncate text-sm font-bold text-slate-100">
            <span className="sm:hidden">Race tapes & danmaku</span>
            <span className="hidden sm:inline">Race tapes · danmaku · MT5 deal lines</span>
          </p>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            Watch past player & bot races — chat and deals stay on the tape.
          </p>
        </div>
        <Link
          href="/tradili"
          data-testid="tradili-strip-open"
          className="shrink-0 rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-rose-400 sm:px-4 sm:text-sm"
        >
          Open
          <span className="hidden sm:inline"> Tradili</span>
          <span aria-hidden> →</span>
        </Link>
      </div>

      {games.length > 0 ? (
        <div className="mx-auto mt-2 w-full max-w-6xl min-w-0 sm:mt-3">
          <div
            className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {games.map((g) => (
              <Link
                key={g.id}
                href={`/tradili/${encodeURIComponent(g.id)}`}
                className="w-[132px] shrink-0 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 transition hover:border-rose-500/40 sm:w-[160px] sm:px-3 sm:py-2"
                data-testid="tradili-strip-card"
              >
                <p className="truncate text-[11px] font-semibold text-slate-200 sm:text-xs">
                  {shortLabel(g.marketLabel)}
                </p>
                <p
                  className={`mt-0.5 font-mono text-xs font-bold sm:mt-1 sm:text-sm ${
                    g.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {g.returnPct >= 0 ? "+" : ""}
                  {g.returnPct.toFixed(1)}%
                  <span className="ml-1.5 text-[10px] font-normal text-slate-500">#{g.rank}</span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
