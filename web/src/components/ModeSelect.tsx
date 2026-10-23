"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import ClearSWButton from "@/components/ClearSWButton";
import { authService, type UserProfile } from "@/lib/auth/supabase-auth";

export type GameMode = "solo" | "challenge" | "multiplayer" | "local-multiplayer";

export default function ModeSelect({ onPick }: { onPick: (mode: GameMode) => void }) {
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { session } = await authService.getSession();
      if (session?.user) {
        setUser(session.user);
        const userProfile = await authService.ensureUserProfile(session.user);
        setProfile(userProfile);
      }
    };
    checkAuth();

    const unsubscribe = authService.onAuthStateChange((authUser) => {
      setUser(authUser);
      if (authUser) {
        authService.ensureUserProfile(authUser).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div
      className={
        isMobile
          ? "grid min-h-[100dvh] w-full grid-rows-[repeat(5,1fr)_auto] bg-slate-950 text-slate-100"
          : "grid min-h-[100dvh] w-full grid-cols-3 grid-rows-[1fr_1fr_auto] bg-slate-950 text-slate-100"
      }
    >
      <ClearSWButton />
      <button
        type="button"
        data-testid="mode-solo"
        onClick={() => onPick("solo")}
        className={`group flex flex-col items-center justify-center gap-4 p-6 text-center transition active:bg-slate-900 sm:p-8 ${
          isMobile ? "border-b border-slate-800" : "border-r border-b border-slate-800"
        }`}
      >
        <div className="text-5xl">🎯</div>
        <div>
          <h2 className="text-2xl font-extrabold text-emerald-400 sm:text-3xl">Quick Race</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
            3-minute race vs roguelike bots. Random market every round.
          </p>
        </div>
        <span className="rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-emerald-400">
          Play solo
        </span>
      </button>

      <button
        type="button"
        data-testid="mode-challenge"
        onClick={() => onPick("challenge")}
        className={`group flex flex-col items-center justify-center gap-4 p-6 text-center transition active:bg-slate-900 sm:p-8 ${
          isMobile ? "border-b border-slate-800" : "border-r border-b border-slate-800"
        }`}
      >
        <div className="text-5xl">🏆</div>
        <div>
          <h2 className="text-2xl font-extrabold text-amber-400 sm:text-3xl">Challenge Mode</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
            Story & Challenge levels. Unlock powerups & achievements!
          </p>
        </div>
        <span className="rounded-full bg-amber-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-amber-400">
          Play Levels
        </span>
      </button>

      <button
        type="button"
        data-testid="mode-multiplayer"
        onClick={() => onPick("multiplayer")}
        className={`group flex flex-col items-center justify-center gap-4 p-6 text-center transition active:bg-slate-900 sm:p-8 ${
          isMobile ? "border-b border-slate-800" : "border-b border-slate-800"
        }`}
      >
        <div className="text-5xl">⚔️</div>
        <div>
          <h2 className="text-2xl font-extrabold text-sky-400 sm:text-3xl">Online Multiplayer</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
            Race friends online. Create or join a room.
          </p>
        </div>
        <span className="rounded-full bg-sky-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-sky-400">
          Play online
        </span>
      </button>

      <button
        type="button"
        data-testid="mode-local-multiplayer"
        onClick={() => onPick("local-multiplayer")}
        className={`group flex flex-col items-center justify-center gap-4 p-6 text-center transition active:bg-slate-900 sm:p-8 ${
          isMobile ? "border-b border-slate-800" : "border-r border-slate-800"
        }`}
      >
        <div className="text-5xl">✈️</div>
        <div>
          <h2 className="text-2xl font-extrabold text-violet-400 sm:text-3xl">Local Multiplayer</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
            Play offline with someone nearby. Perfect for airplane!
          </p>
        </div>
        <span className="rounded-full bg-violet-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-violet-400">
          Play local
        </span>
      </button>

      {/* Login/Register or Profile Card */}
      {user && profile ? (
        <Link
          href="/profile"
          className={`group flex flex-col items-center justify-center gap-4 p-6 text-center transition hover:bg-slate-900 sm:p-8 ${
            isMobile ? "border-b border-slate-800" : "border-slate-800"
          }`}
        >
          <div className="text-5xl">👤</div>
          <div>
            <h2 className="text-2xl font-extrabold text-purple-400 sm:text-3xl">
              {profile.display_name || profile.username}
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
              ELO: {profile.elo_rating} · {profile.total_games} Spiele · {((profile.total_wins / Math.max(profile.total_games, 1)) * 100).toFixed(0)}% Siegesrate
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className={profile.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                Gewinn: {profile.total_profit >= 0 ? '+' : ''}{profile.total_profit.toFixed(0)}
              </span>
            </div>
          </div>
          <span className="rounded-full bg-purple-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-purple-400">
            Mein Profil
          </span>
        </Link>
      ) : (
        <Link
          href="/register"
          className={`group flex flex-col items-center justify-center gap-4 p-6 text-center transition hover:bg-slate-900 sm:p-8 ${
            isMobile ? "border-b border-slate-800" : "border-slate-800"
          }`}
        >
          <div className="text-5xl">🔐</div>
          <div>
            <h2 className="text-2xl font-extrabold text-rose-400 sm:text-3xl">Login / Register</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
              Save your progress, track stats & compete on leaderboards.
            </p>
            <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 mx-auto max-w-xs">
              <p className="text-xs text-amber-300 font-semibold">
                💎 Early Supporter: Free Forever!
              </p>
            </div>
          </div>
          <span className="rounded-full bg-rose-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-rose-400">
            Login
          </span>
        </Link>
      )}

      <div className="col-span-full px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
        <p className="text-xs text-slate-600">
          ◆ Tradr — tap a mode to start
          <span className="ml-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-500/80">
            v3.8.2-sentry
          </span>
        </p>
      </div>
    </div>
  );
}
