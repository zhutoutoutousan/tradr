"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchCommunityGamesPage,
  formatTimeAgo,
  type CommunityGame,
} from "@/lib/game/anonymousGames";
import type { FeedItem } from "@/lib/tradili/parseFeed";

type Tab = "races" | "news" | "blogs" | "papers" | "all";

const PAGE_SIZE = 24;

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function mergeGames(prev: CommunityGame[], next: CommunityGame[]) {
  const seen = new Set(prev.map((g) => g.id));
  const added = next.filter((g) => !seen.has(g.id));
  return added.length ? [...prev, ...added] : prev;
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return formatTimeAgo(new Date(t).toISOString());
}

/** Bilibili / YouTube-style Tradili home: races + finance news + arXiv papers. */
export default function TradiliFeed() {
  const [tab, setTab] = useState<Tab>("races");
  const [games, setGames] = useState<CommunityGame[]>([]);
  const [news, setNews] = useState<FeedItem[]>([]);
  const [blogs, setBlogs] = useState<FeedItem[]>([]);
  const [papers, setPapers] = useState<FeedItem[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "peers" | "yours">("all");
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
    setLoadingGames(true);
    cursorRef.current = null;
    loadPage(null)
      .catch(() => {
        if (!cancelled) setGames([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingGames(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  useEffect(() => {
    let cancelled = false;
    setLoadingInfo(true);
    fetch("/api/tradili/feed", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { news?: FeedItem[]; blogs?: FeedItem[]; papers?: FeedItem[] }) => {
        if (cancelled) return;
        setNews(Array.isArray(data.news) ? data.news : []);
        setBlogs(Array.isArray(data.blogs) ? data.blogs : []);
        setPapers(Array.isArray(data.papers) ? data.papers : []);
      })
      .catch(() => {
        if (!cancelled) {
          setNews([]);
          setBlogs([]);
          setPapers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInfo(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "races" && tab !== "all") return;
    if (loadingGames || loadingMore || !hasMore) return;
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
  }, [tab, loadingGames, loadingMore, hasMore, loadPage, games.length]);

  const filteredGames = useMemo(() => {
    if (filter === "peers") return games.filter((g) => !g.isMine);
    if (filter === "yours") return games.filter((g) => g.isMine);
    return games;
  }, [games, filter]);

  const showRaces = tab === "races" || tab === "all";
  const showNews = tab === "news" || tab === "all";
  const showBlogs = tab === "blogs" || tab === "all";
  const showPapers = tab === "papers" || tab === "all";

  return (
    <div className="min-w-0" data-testid="tradili-feed">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400">Tradili</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl">Race tapes &amp; market feed</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Race tapes, free finance RSS, quant blogs (Quantocracy / Robot Wealth / …), and arXiv q-fin papers.
          </p>
        </div>
      </div>

      <div
        className="sticky top-0 z-10 -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2"
        data-testid="tradili-tabs"
      >
        {(
          [
            ["races", `Races${games.length ? ` · ${games.length}${hasMore ? "+" : ""}` : ""}`],
            ["news", `Markets${news.length ? ` · ${news.length}` : ""}`],
            ["blogs", `Quant blogs${blogs.length ? ` · ${blogs.length}` : ""}`],
            ["papers", `Papers${papers.length ? ` · ${papers.length}` : ""}`],
            ["all", "For you"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`tradili-tab-${id}`}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === id ? "bg-rose-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showRaces ? (
        <section className="mb-10" data-testid="tradili-races">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Battle replays</h2>
            <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-0.5">
              {(["all", "peers", "yours"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize ${
                    filter === f ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loadingGames ? (
            <p className="text-sm text-slate-500">Loading race tapes…</p>
          ) : filteredGames.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
              <p className="text-slate-300">No race tapes yet.</p>
              <p className="mt-1 text-sm text-slate-500">Finish a solo round — it lands here anonymously.</p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
              >
                Play a round
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredGames.map((g) => (
                <RaceCard key={g.id} game={g} />
              ))}
            </div>
          )}
          <div ref={loadMoreRef} className="mt-6 flex justify-center py-2">
            {loadingMore && <p className="text-sm text-slate-500">Loading more…</p>}
          </div>
        </section>
      ) : null}

      {showNews ? (
        <section className="mb-10" data-testid="tradili-news">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Finance desk</h2>
            <p className="text-[11px] text-slate-600">BBC · MarketWatch · CNBC · free RSS</p>
          </div>
          {loadingInfo ? (
            <p className="text-sm text-slate-500">Pulling headlines…</p>
          ) : news.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-sm text-slate-500">
              News feed unavailable right now — race tapes still work offline.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {news.slice(0, tab === "all" ? 8 : 24).map((item) => (
                <InfoRow key={item.id} item={item} accent="sky" />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {showBlogs ? (
        <section className="mb-10" data-testid="tradili-blogs">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Quant blogs</h2>
            <p className="text-[11px] text-slate-600">Quantocracy · Robot Wealth · QuantInsti · Alpha Architect</p>
          </div>
          {loadingInfo ? (
            <p className="text-sm text-slate-500">Pulling blog feeds…</p>
          ) : blogs.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-sm text-slate-500">
              Quant blog RSS unavailable right now — papers tab still works.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {blogs.slice(0, tab === "all" ? 8 : 24).map((item) => (
                <InfoRow key={item.id} item={item} accent="emerald" />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {showPapers ? (
        <section className="mb-6" data-testid="tradili-papers">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Research rack</h2>
            <p className="text-[11px] text-slate-600">arXiv q-fin · RSS + API</p>
          </div>
          <a
            href="https://arxiv.org/abs/2610.30891"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 to-slate-900/60 px-3 py-3 transition hover:border-rose-400/50"
            data-testid="tradili-featured-paper"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-300">Featured · Academy Planet</p>
            <p className="mt-1 text-sm font-semibold text-white">
              Equilibria and Learning in Competitive Market Making
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Onger &amp; Foscari · arXiv:2610.30891 — PSNE, volatility-scaled spreads, no-regret learning. Also on{" "}
              <span className="text-rose-300">/academy/planet</span>.
            </p>
          </a>
          {loadingInfo ? (
            <p className="text-sm text-slate-500">Fetching papers…</p>
          ) : papers.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-sm text-slate-500">
              Live arXiv feed unavailable — featured paper above still works.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {papers.slice(0, tab === "all" ? 6 : 12).map((item) => (
                <InfoRow key={item.id} item={item} accent="amber" />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function RaceCard({ game: g }: { game: CommunityGame }) {
  const hue = hashHue(g.marketLabel + g.id);
  const up = g.returnPct >= 0;
  return (
    <article
      data-testid="gallery-card"
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition hover:border-rose-500/40 hover:bg-slate-900"
    >
      <Link href={`/tradili/${encodeURIComponent(g.id)}`} className="relative block aspect-video overflow-hidden">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 50% 12%) 55%, #0b1220)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.06) 14px, rgba(255,255,255,0.06) 15px)",
          }}
        />
        <div className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
          {g.mode}
        </div>
        <div
          className={`absolute bottom-2 right-2 rounded-md px-2 py-1 font-mono text-sm font-bold tabular-nums ${
            up ? "bg-emerald-500/90 text-slate-950" : "bg-rose-500/90 text-white"
          }`}
        >
          {up ? "+" : ""}
          {g.returnPct.toFixed(1)}%
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg">▶ Watch</span>
        </div>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <Link href={`/tradili/${encodeURIComponent(g.id)}`} className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-100 group-hover:text-rose-200">{g.marketLabel}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatTimeAgo(g.createdAt)} · #{g.rank} · {g.trades} deals
            {g.isMine ? " · you" : ""}
          </p>
        </Link>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            href={`/tradili/${encodeURIComponent(g.id)}`}
            className="rounded-lg border border-slate-700 px-2 py-1.5 text-center text-[11px] font-semibold text-rose-300 hover:bg-slate-800"
          >
            Watch tape
          </Link>
          <Link
            href={`/tradili/${encodeURIComponent(g.id)}/play`}
            data-testid={`gallery-play-${g.id}`}
            className="rounded-lg bg-violet-600 px-2 py-1.5 text-center text-[11px] font-bold text-white hover:bg-violet-500"
          >
            Play along
          </Link>
        </div>
        <p className={`text-[11px] font-mono ${up ? "text-emerald-400" : "text-rose-400"}`}>{money(g.profit)} P&L</p>
      </div>
    </article>
  );
}

function InfoRow({ item, accent }: { item: FeedItem; accent: "sky" | "amber" | "emerald" }) {
  const badge =
    accent === "sky"
      ? "bg-sky-500/15 text-sky-300"
      : accent === "emerald"
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-amber-500/15 text-amber-300";
  const testId =
    item.kind === "news" ? "tradili-news-item" : item.kind === "blog" ? "tradili-blog-item" : "tradili-paper-item";
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block min-w-0 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-3 transition hover:border-slate-600 hover:bg-slate-900"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${badge}`}>{item.source}</span>
        {item.publishedAt ? <span className="text-[10px] text-slate-600">{formatWhen(item.publishedAt)}</span> : null}
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-100">{item.title}</p>
      {item.summary ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.summary}</p> : null}
    </a>
  );
}
