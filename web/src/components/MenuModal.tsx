"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { loadProfile, type Profile } from "@/lib/game/profile";
import { deleteReview, isRegistered, loadReviews, type RoundReview } from "@/lib/game/reviews";
import { fetchCommunityGames, type CommunityGame } from "@/lib/game/anonymousGames";

type Tab = "play" | "community" | "achievements" | "history" | "pro";

export default function MenuModal({
  onClose,
  onOpenReview,
  onOpenTutorial,
}: {
  onClose: () => void;
  onOpenReview?: (review: RoundReview) => void;
  onOpenTutorial?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("play");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<RoundReview[]>([]);
  const [community, setCommunity] = useState<CommunityGame[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setHistory(loadReviews());
  }, []);

  useEffect(() => {
    if (tab !== "community") return;
    let cancelled = false;
    setCommunityLoading(true);
    fetchCommunityGames(30)
      .then((games) => {
        if (!cancelled) {
          const others = games.filter((g) => !g.isMine);
          const mine = games.filter((g) => g.isMine);
          setCommunity([...others, ...mine]);
        }
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const unlocked = new Set(profile?.unlocked ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-emerald-400">◆ Tradr</span>
            {profile && (
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-mono text-slate-300">
                ELO {profile.elo}
              </span>
            )}
          </div>
          <button data-testid="menu-close" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
            ✕ Close
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-800 px-3 pt-3">
          <TabBtn active={tab === "play"} testId="menu-tab-play" onClick={() => setTab("play")}>How to play</TabBtn>
          <TabBtn active={tab === "community"} testId="menu-tab-community" onClick={() => setTab("community")}>
            Community
          </TabBtn>
          <TabBtn active={tab === "achievements"} testId="menu-tab-achievements" onClick={() => setTab("achievements")}>
            Achievements
          </TabBtn>
          <TabBtn active={tab === "history"} testId="menu-tab-history" onClick={() => setTab("history")}>
            History
          </TabBtn>
          <TabBtn active={tab === "pro"} testId="menu-tab-pro" onClick={() => setTab("pro")}>Go Pro</TabBtn>
        </div>

        <div className="p-5">
          {tab === "play" && (
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                Each round is a <span className="font-semibold text-slate-100">3-minute race</span> against a fresh field
                of roguelike trading bots. Start flat, trade the live chart, and finish above as many bots as you can to
                climb the ELO ladder.
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li><kbd>B</kbd> / <kbd>S</kbd> / <kbd>C</kbd> — Long, Short, Close</li>
                <li>Mouse: left long · right close (never flips) · middle short</li>
                <li><kbd>Space</kbd> pause · <kbd>1</kbd>–<kbd>4</kbd> speed (1x–20x)</li>
                <li><kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> <kbd>T</kbd> — power-ups: Freeze, Leverage, Insider Tip, Slow-Mo, Hedge Shield</li>
              </ul>
              <p className="text-slate-400">
                Each round rolls a random instrument, timeframe (5m–1D), and indicator stack. Bots are randomly generated
                and matched to your ELO. Win to rank up; the higher you climb, the tougher the field.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                {onOpenTutorial && (
                  <button
                    onClick={onOpenTutorial}
                    className="rounded-lg border border-violet-500/60 px-4 py-2 font-semibold text-violet-300 hover:bg-violet-500/10"
                  >
                    Open full tutorial
                  </button>
                )}
                <Link href="/multiplayer" className="rounded-lg border border-emerald-500/60 px-4 py-2 font-semibold text-emerald-300 hover:bg-emerald-500/10">
                  ⚔ Multiplayer race
                </Link>
              </div>
            </div>
          )}

          {tab === "community" && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-400">
                Recent rounds from other traders — tap to watch their chart and deal list.
              </p>
              {communityLoading ? (
                <p className="text-slate-500">Loading community runs…</p>
              ) : community.length === 0 ? (
                <p className="text-slate-500">
                  No community runs yet. Finish a solo round and it will be saved anonymously for stats.
                </p>
              ) : (
                <ul className="space-y-2">
                  {community.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenReview?.(g.review)}
                        className="min-w-0 flex-1 text-left active:text-emerald-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{g.marketLabel}</span>
                          {g.isMine && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">You</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {timeAgo(g.createdAt)} · #{g.rank} · {g.trades} trades ·{" "}
                          <span className={g.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {g.returnPct >= 0 ? "+" : ""}
                            {g.returnPct.toFixed(1)}%
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenReview?.(g.review)}
                        className="shrink-0 rounded-lg border border-sky-500/50 px-2.5 py-1.5 text-xs font-semibold text-sky-300"
                      >
                        Watch
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "achievements" && (
            <div>
              <p className="mb-3 text-sm text-slate-400">
                {unlocked.size} / {ACHIEVEMENTS.length} unlocked
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ACHIEVEMENTS.map((a) => {
                  const got = unlocked.has(a.id);
                  return (
                    <div
                      key={a.id}
                      className={`flex items-start gap-2 rounded-lg border p-3 ${
                        got ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-950/40"
                      }`}
                    >
                      <span className={got ? "text-amber-400" : "text-slate-600"}>{got ? "★" : "☆"}</span>
                      <div>
                        <div className={`text-sm font-semibold ${got ? "text-slate-100" : "text-slate-400"}`}>
                          {a.name}
                        </div>
                        <div className="text-xs text-slate-500">{a.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3 text-sm">
              {!isRegistered() ? (
                <p className="text-slate-400">
                  Register to save runs to your review history. You can still review the last round from the game-over screen.
                </p>
              ) : history.length === 0 ? (
                <p className="text-slate-400">No saved runs yet. Finish a round and tap &quot;Save run&quot; in review.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenReview?.(r)}
                        className="min-w-0 flex-1 text-left hover:text-emerald-300"
                      >
                        <div className="font-semibold text-slate-200">{r.marketLabel}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(r.createdAt).toLocaleString()} · #{r.summary.rank} · {r.summary.trades} trades ·{" "}
                          {r.summary.returnPct >= 0 ? "+" : ""}
                          {r.summary.returnPct.toFixed(1)}%
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteReview(r.id);
                          setHistory(loadReviews());
                        }}
                        className="text-xs text-slate-500 hover:text-rose-400"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "pro" && (
            <div className="space-y-4 text-sm text-slate-300">
              <h3 className="text-xl font-bold text-slate-100">Tradr Pro — $9/mo</h3>
              <p className="text-slate-400">Play free forever in your browser. Upgrade to keep your climb permanent.</p>
              <ul className="space-y-2">
                {["Saved review history & deal lists", "Cloud-saved ELO, stats & achievements", "Global leaderboards", "Private multiplayer rooms"].map(
                  (f) => (
                    <li key={f} className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      {f}
                    </li>
                  ),
                )}
              </ul>
              <Link
                href="/register"
                className="mt-2 block rounded-lg bg-emerald-500 py-2.5 text-center font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Register &amp; upgrade
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TabBtn({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
        active ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
