"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReviewPanel from "@/components/ReviewPanel";
import {
  accountEmail,
  isRegistered,
  isReviewSaved,
  register,
  saveReview,
} from "@/lib/game/reviews";
import { fetchCommunityGame, formatTimeAgo, type CommunityGame } from "@/lib/game/anonymousGames";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CommunityMatchPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [game, setGame] = useState<CommunityGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetchCommunityGame(id)
      .then((g) => {
        if (!cancelled) setGame(g);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!game) return;
    setSaved(isReviewSaved(game.review.id));
    setEmail(accountEmail() ?? "");
  }, [game]);

  const handleSave = () => {
    if (!game) return;
    if (!isRegistered()) {
      setGateOpen(true);
      return;
    }
    const ok = saveReview(game.review);
    setSaved(ok);
    setMsg(ok ? "Run saved to your history." : "Could not save (storage full).");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!game || !email.trim()) return;
    register(email);
    setGateOpen(false);
    const ok = saveReview(game.review);
    setSaved(ok);
    setMsg(ok ? "Registered and run saved." : "Registered. Could not save run.");
  };

  if (loading) {
    return (
      <Shell>
        <p className="text-slate-500">Loading match replay…</p>
      </Shell>
    );
  }

  if (!game) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
          <p className="text-slate-300">This community run could not be found.</p>
          <Link href="/community" className="mt-4 inline-block text-sm font-semibold text-sky-300 hover:text-sky-200">
            ← Back to gallery
          </Link>
        </div>
      </Shell>
    );
  }

  const s = game.review.summary;

  return (
    <Shell>
      <Link href="/community" className="text-sm font-semibold text-sky-300 hover:text-sky-200">
        ← Back to gallery
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Peer match replay</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">{game.marketLabel}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {formatTimeAgo(game.createdAt)} · #{s.rank} · {game.trades} trades ·{" "}
            <span className={game.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {game.returnPct >= 0 ? "+" : ""}
              {game.returnPct.toFixed(1)}%
            </span>
            {" · "}
            <span className={game.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>{money(game.profit)}</span>
            {game.isMine && (
              <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">Your run</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {!saved ? (
            <button
              data-testid="review-save"
              onClick={handleSave}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500"
            >
              Save run
            </button>
          ) : (
            <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              Saved
            </span>
          )}
        </div>
      </div>

      {msg && <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-2 text-sm text-slate-300">{msg}</p>}

      <div className="mt-6">
        <ReviewPanel review={game.review} chartHeight={420} />
      </div>

      {gateOpen && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-sm text-slate-300">Register to save runs to your review history.</p>
          <form onSubmit={handleRegister} className="mt-3 flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Register & save
            </button>
            <Link
              href="/register"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-emerald-300 hover:bg-slate-800"
            >
              Go Pro
            </Link>
          </form>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-emerald-400">
            ◆ Tradr
          </Link>
          <Link href="/community" className="text-sm text-slate-400 hover:text-slate-200">
            Gallery
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-16">{children}</main>
    </div>
  );
}
