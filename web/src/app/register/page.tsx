"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <Link href="/" className="text-sm font-bold text-emerald-400">
          ◆ Tradr
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Register & unlock Pro</h1>
        <p className="mt-1 text-sm text-slate-400">
          Save your runs, climb global leaderboards and unlock new bots. $9/month, cancel anytime.
        </p>

        <form onSubmit={handleUpgrade} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Redirecting to checkout…" : "Continue to payment"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Payments are processed securely by Stripe. You can also{" "}
          <Link href="/play" className="text-emerald-400 hover:underline">
            keep playing for free
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
