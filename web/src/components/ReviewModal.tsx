"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReviewChart from "@/components/ReviewChart";
import {
  accountEmail,
  isRegistered,
  isReviewSaved,
  register,
  saveReview,
  type RoundReview,
} from "@/lib/game/reviews";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ReviewModal({ review, onClose }: { review: RoundReview; onClose: () => void }) {
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const s = review.summary;

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

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_300px]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
            <ReviewChart candles={review.candles} trades={review.trades} focusIdx={focusIdx} height={380} />
            <p className="mt-2 px-1 text-xs text-slate-500">
              Entry/exit arrows on chart. Green/red line = win/loss. Click a deal to focus.
            </p>
          </div>

          <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="border-b border-slate-800 px-3 py-2 text-sm font-semibold text-slate-300">
              Deal list ({review.trades.length})
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {review.trades.length === 0 ? (
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
                    {review.trades.map((t, i) => {
                      const focused = focusIdx === i;
                      return (
                        <tr
                          key={i}
                          onClick={() => setFocusIdx(focused ? null : i)}
                          className={`cursor-pointer border-t border-slate-800/80 ${focused ? "bg-emerald-500/10" : "hover:bg-slate-800/50"}`}
                        >
                          <td className="px-2 py-2 font-mono text-slate-500">{i + 1}</td>
                          <td className={`px-2 py-2 font-semibold uppercase ${t.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
                            {t.side}
                          </td>
                          <td className="px-2 py-2 font-mono tabular-nums">{t.entry.toFixed(2)}</td>
                          <td className="px-2 py-2 font-mono tabular-nums">{t.exit.toFixed(2)}</td>
                          <td className={`px-2 py-2 text-right font-mono tabular-nums ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
