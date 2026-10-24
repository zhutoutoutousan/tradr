"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authService } from "@/lib/auth/supabase-auth";
import { authReturnUrl, peekAuthNext, resolveAuthNext, safeNextPath, stashAuthNext } from "@/lib/bots/authRedirect";

function RegisterPageInner() {
  const searchParams = useSearchParams();
  const nextFromUrl = searchParams.get("next");
  const nextPath = safeNextPath(nextFromUrl ?? peekAuthNext(), "/play");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(Boolean(nextFromUrl));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (nextFromUrl) stashAuthNext(authReturnUrl(safeNextPath(nextFromUrl, "/play")));
  }, [nextFromUrl]);

  async function handleOAuth(provider: 'github' | 'google') {
    setLoading(true);
    setError(null);
    
    try {
      const returnTo = authReturnUrl(nextPath);
      stashAuthNext(returnTo);
      const { error } = await authService.signInWithOAuth(provider, { next: returnTo });
      if (error) throw new Error(error.message);
      // OAuth will redirect, no need to set success message
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed");
      setLoading(false);
    }
  }

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
          window.location.href = resolveAuthNext(nextFromUrl, nextPath);
        }, 1000);
      } else {
        // Register
        if (!username) {
          throw new Error("Username is required");
        }
        const { user, session, error } = await authService.signUp({
          email,
          password,
          username,
          displayName: username,
        });
        if (error) throw new Error(error.message);
        
        // Check if email confirmation is required
        if (user && !session) {
          setSuccess("✅ Registration successful! Please check your email to verify your account.");
        } else if (user && session) {
          setSuccess("Registration successful! Redirecting...");
          setTimeout(() => {
            window.location.href = resolveAuthNext(nextFromUrl, nextPath);
          }, 1000);
        }
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
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuth('github')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-800 py-2.5 font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Continue with GitHub
              </button>
              
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-800 py-2.5 font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900/60 px-3 text-slate-500">Or continue with email</span>
                </div>
              </div>
            </div>

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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading…</div>
      }
    >
      <RegisterPageInner />
    </Suspense>
  );
}
