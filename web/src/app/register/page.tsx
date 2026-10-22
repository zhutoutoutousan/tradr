"use client";

import { useState } from "react";
import Link from "next/link";
import { authService } from "@/lib/auth/supabase-auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isLogin) {
        // Login
        const { error } = await authService.signIn({
          email,
          password,
        });
        if (error) throw new Error(error.message);
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = "/play";
        }, 1000);
      } else {
        // Register
        if (!username) {
          throw new Error("Username is required");
        }
        const { error } = await authService.signUp({
          email,
          password,
          username,
          displayName: username,
        });
        if (error) throw new Error(error.message);
        setSuccess("Registration successful! Check your email to confirm.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Early Supporter Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="text-3xl">💎</span>
            <h2 className="text-2xl font-bold text-amber-300">Early Supporter Benefit</h2>
          </div>
          <p className="text-center text-amber-100">
            Register <strong>now</strong> and get <strong className="text-amber-200">lifetime free access</strong> to all future premium features!
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-amber-500/10 p-3 text-center">
              <div className="font-bold text-amber-300">Today</div>
              <div className="text-amber-200">100% Free</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-center">
              <div className="font-bold text-amber-300">Future</div>
              <div className="text-amber-200">All Features Free</div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-amber-200/80">
            When we launch paid features, original users keep everything for free. Forever.
          </p>
        </div>

        {/* Auth Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
          <Link href="/" className="text-sm font-bold text-emerald-400">
            ◆ Tradr
          </Link>
          <h1 className="mt-4 text-2xl font-bold">
            {isLogin ? "Welcome Back" : "Create Your Account"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isLogin 
              ? "Login to access your saved progress and ELO rating"
              : "Register for free and never pay for future features"
            }
          </p>

          <form onSubmit={handleAuth} className="mt-6 space-y-4">
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
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm text-slate-300">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="trader123"
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  title="Only letters, numbers and underscores"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Please wait..." : isLogin ? "Login" : "Register (Free)"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {success}
            </p>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-400 hover:text-emerald-400"
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            No payment required. Always free.{" "}
            <Link href="/play" className="text-emerald-400 hover:underline">
              Continue as guest
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
