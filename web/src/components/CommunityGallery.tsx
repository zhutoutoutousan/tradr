"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchCommunityGamesPage,
  formatTimeAgo,
  type CommunityGame,
} from "@/lib/game/anonymousGames";

type Filter = "all" | "peers" | "yours";

const PAGE_SIZE = 24;

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function mergeGames(prev: CommunityGame[], next: CommunityGame[]) {
  const seen = new Set(prev.map((g) => g.id));
  const added = next.filter((g) => !seen.has(g.id));
  return added.length ? [...prev, ...added] : prev;
}

export default function CommunityGallery() {
  const [games, setGames] = useState<CommunityGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const cursorRef = useRef<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fetchingMoreRef = useRef(false);

  const loadPage = useCallback(async (cursor?: string | null) => {
    const page = await fetchCommunityGamesPage(PAGE_SIZE, cursor);
    setGames((prev) => (cursor ? mergeGames(prev, page.games) : page.games));
    cursorRef.current = page.nextCursor;
    setHasMore(page.hasMore);
    return page;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cursorRef.current = null;
    loadPage(null)
      .catch(() => {
        if (!cancelled) setGames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || fetchingMoreRef.current || !hasMore) return;
        fetchingMoreRef.current = true;
        setLoadingMore(true);
        loadPage(cursorRef.current)
          .catch(() => {})
          .finally(() => {
            fetchingMoreRef.current = false;
            setLoadingMore(false);
          });
      },
      { rootMargin: "240px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, loadingMore, hasMore, loadPage, games.length]);

  const filtered = useMemo(() => {
    if (filter === "peers") return games.filter((g) => !g.isMine);
    if (filter === "yours") return games.filter((g) => g.isMine);
    return games;
  }, [games, filter]);

  const peerCount = games.filter((g) => !g.isMine).length;
  const yoursCount = games.filter((g) => g.isMine).length;

  const countLabel = (n: number) => (hasMore && filter === "all" ? `${n}+` : String(n));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Peer matches</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl">Community gallery</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Browse anonymous solo rounds from other traders. Open any match to replay their chart and deal list.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} testId="gallery-filter-all">
            All ({countLabel(games.length)})
          </FilterBtn>
          <FilterBtn active={filter === "peers"} onClick={() => setFilter("peers")} testId="gallery-filter-peers">
            Peers ({hasMore ? `${peerCount}+` : peerCount})
          </FilterBtn>
          <FilterBtn active={filter === "yours"} onClick={() => setFilter("yours")} testId="gallery-filter-yours">
            Yours ({yoursCount})
          </FilterBtn>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading community runs…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
          <p className="text-slate-300">
            {filter === "yours"
              ? "You have not saved any runs yet."
              : filter === "peers"
                ? "No peer runs yet — be the first after finishing a solo round."
                : "No community runs yet."}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Finish a solo round and it is saved anonymously for the gallery.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
          >
            Play a round
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((g) => (
              <Link
                key={g.id}
                href={`/community/${encodeURIComponent(g.id)}`}
                data-testid="gallery-card"
                className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-500/40 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-100 group-hover:text-sky-200">{g.marketLabel}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTimeAgo(g.createdAt)} · {g.mode}
                    </p>
                  </div>
                  {g.isMine && (
                    <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      You
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Rank" value={`#${g.rank}`} />
                  <Stat
                    label="Return"
                    value={`${g.returnPct >= 0 ? "+" : ""}${g.returnPct.toFixed(1)}%`}
                    up={g.returnPct >= 0}
                  />
                  <Stat label="Trades" value={`${g.trades}`} />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <span className={g.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>{money(g.profit)} P&L</span>
                  <span className="font-semibold text-sky-300 group-hover:text-sky-200">Watch replay →</span>
                </div>
              </Link>
            ))}
          </div>

          <div ref={loadMoreRef} className="mt-8 flex justify-center py-4">
            {loadingMore && <p className="text-sm text-slate-500">Loading more runs…</p>}
            {!loadingMore && hasMore && (
              <button
                type="button"
                onClick={() => {
                  if (fetchingMoreRef.current) return;
                  fetchingMoreRef.current = true;
                  setLoadingMore(true);
                  loadPage(cursorRef.current)
                    .catch(() => {})
                    .finally(() => {
                      fetchingMoreRef.current = false;
                      setLoadingMore(false);
                    });
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Load more
              </button>
            )}
            {!hasMore && games.length > PAGE_SIZE && (
              <p className="text-sm text-slate-500">All {games.length} runs loaded.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        active ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`font-mono text-sm font-semibold ${
          up === undefined ? "text-slate-200" : up ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
