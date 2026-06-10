"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReviewPanel from "@/components/ReviewPanel";
import {
  accountEmail,
  isRegistered,
  isReviewSaved,
  register,
  saveReview,
  type RoundReview,
} from "@/lib/game/reviews";

export default function ReviewModal({ review, onClose }: { review: RoundReview; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const s = review.summary ?? {
    rank: 0,
    returnPct: 0,
    profit: 0,
    trades: 0,
    wins: 0,
    totalPlayers: 0,
    eloDelta: 0,
  };

  useEffect(() => {
    setSaved(isReviewSaved(review.id));
    setEmail(accountEmail() ?? "");
  }, [review.id]);

  const handleSave = () => {
    if (!isRegistered()) {
      setGateOpen(true);
      return;
    }
    const ok = saveReview(review);
    setSaved(ok);
    setMsg(ok ? "Run saved to your history." : "Could not save (storage full).");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    register(email);
    setGateOpen(false);
    const ok = saveReview(review);
    setSaved(ok);
    setMsg(ok ? "Registered and run saved." : "Registered. Could not save run.");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Round review</p>
            <h2 className="text-lg font-bold text-slate-100">
              {review.marketLabel}
              <span className="ml-2 text-sm font-normal text-slate-400">
                #{s.rank} · {s.returnPct >= 0 ? "+" : ""}
                {s.returnPct.toFixed(1)}%
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!saved ? (
              <button data-testid="review-save" onClick={handleSave} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">
                Save run
              </button>
            ) : (
              <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Saved</span>
            )}
            <button data-testid="review-close" onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Close
            </button>
          </div>
        </div>

        {msg && <p className="border-b border-slate-800 bg-slate-950/50 px-4 py-2 text-sm text-slate-300">{msg}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ReviewPanel review={review} chartHeight={380} />
        </div>

        {gateOpen && (
          <div className="border-t border-slate-800 bg-slate-950/80 p-4">
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
              <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
                Register & save
              </button>
              <Link href="/register" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-emerald-300 hover:bg-slate-800">
                Go Pro
              </Link>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
