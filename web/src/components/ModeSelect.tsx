"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import ClearSWButton from "@/components/ClearSWButton";
import TradiliStrip from "@/components/TradiliStrip";
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

  const tilePad = isMobile
    ? "gap-2 px-4 py-4"
    : "gap-4 p-6 sm:p-8";
  const tileTitle = isMobile ? "text-xl" : "text-2xl sm:text-3xl";
  const tileIcon = isMobile ? "text-3xl" : "text-5xl";
  const tileBody = isMobile ? "mt-1 max-w-[18rem] text-xs" : "mx-auto mt-2 max-w-xs text-sm sm:text-base";
  const tileCta = isMobile
    ? "rounded-full px-5 py-2.5 text-sm font-bold"
    : "rounded-full px-6 py-3 text-base font-bold";

  return (
    <div
      className={
        isMobile
          ? "flex min-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-slate-950 text-slate-100"
          : "grid min-h-[100dvh] w-full max-w-[100vw] grid-cols-3 grid-rows-[1fr_1fr_auto_auto] overflow-x-hidden bg-slate-950 text-slate-100"
      }
    >
      <ClearSWButton />
      <button
        type="button"
        data-testid="mode-solo"
        onClick={() => onPick("solo")}
        className={`group flex min-w-0 flex-col items-center justify-center text-center transition active:bg-slate-900 ${tilePad} ${
          isMobile ? "min-h-[22vh] border-b border-slate-800" : "border-r border-b border-slate-800"
        }`}
      >
        <div className={tileIcon}>🎯</div>
        <div className="min-w-0 px-1">
          <h2 className={`font-extrabold text-emerald-400 ${tileTitle}`}>Quick Race</h2>
          <p className={`text-slate-400 ${tileBody}`}>
            {isMobile ? "3-min race vs roguelike bots." : "3-minute race vs roguelike bots. Random market every round."}
          </p>
        </div>
        <span className={`bg-emerald-500 text-slate-950 group-hover:bg-emerald-400 ${tileCta}`}>
          Play solo
        </span>
      </button>

      <Link
        href="/academy"
        data-testid="mode-challenge"
        className={`group flex min-w-0 flex-col items-center justify-center text-center transition hover:bg-slate-900 ${tilePad} ${
          isMobile ? "min-h-[22vh] border-b border-slate-800" : "border-r border-b border-slate-800"
        }`}
      >
        <div className={tileIcon}>🎓</div>
        <div className="min-w-0 px-1">
          <h2 className={`font-extrabold text-amber-400 ${tileTitle}`}>Tradr Academy</h2>
          <p className={`text-slate-400 ${tileBody}`}>
            {isMobile
              ? "Quant + AI lessons. Login required."
              : "Quant + AI-agent lessons, Story campaign, Bot Lab drills. Login required."}
          </p>
        </div>
        <span className={`bg-amber-500 text-slate-950 group-hover:bg-amber-400 ${tileCta}`}>
          Enter Academy
        </span>
      </Link>

      <button
        type="button"
        data-testid="mode-multiplayer"
        onClick={() => onPick("multiplayer")}
        className={`group flex min-w-0 flex-col items-center justify-center text-center transition active:bg-slate-900 ${tilePad} ${
          isMobile ? "min-h-[22vh] border-b border-slate-800" : "border-b border-slate-800"
        }`}
      >
        <div className={tileIcon}>⚔️</div>
        <div className="min-w-0 px-1">
          <h2 className={`font-extrabold text-sky-400 ${tileTitle}`}>Online Multiplayer</h2>
          <p className={`text-slate-400 ${tileBody}`}>
            {isMobile ? "Race friends online." : "Race friends online. Create or join a room."}
          </p>
        </div>
        <span className={`bg-sky-500 text-slate-950 group-hover:bg-sky-400 ${tileCta}`}>
          Play online
        </span>
      </button>

      <button
        type="button"
        data-testid="mode-local-multiplayer"
        onClick={() => onPick("local-multiplayer")}
        className={`group flex min-w-0 flex-col items-center justify-center text-center transition active:bg-slate-900 ${tilePad} ${
          isMobile ? "min-h-[22vh] border-b border-slate-800" : "border-r border-b border-slate-800"
        }`}
      >
        <div className={tileIcon}>✈️</div>
        <div className="min-w-0 px-1">
          <h2 className={`font-extrabold text-violet-400 ${tileTitle}`}>Local Multiplayer</h2>
          <p className={`text-slate-400 ${tileBody}`}>
            {isMobile ? "Play nearby / offline." : "Play offline with someone nearby. Perfect for airplane!"}
          </p>
        </div>
        <span className={`bg-violet-500 text-slate-950 group-hover:bg-violet-400 ${tileCta}`}>
          Play local
        </span>
      </button>

      <Link
        href="/bots"
        data-testid="mode-bots"
        className={`group flex min-w-0 flex-col items-center justify-center text-center transition hover:bg-slate-900 ${tilePad} ${
          isMobile ? "min-h-[22vh] border-b border-slate-800" : "border-r border-b border-slate-800"
        }`}
      >
        <div className={tileIcon}>🤖</div>
        <div className="min-w-0 px-1">
          <h2 className={`font-extrabold text-fuchsia-400 ${tileTitle}`}>Bot Factory</h2>
          <p className={`text-slate-400 ${tileBody}`}>
            {isMobile ? "Formulas & backtests. Login required." : "Write formulas, backtest on history. Login required."}
          </p>
        </div>
        <span className={`bg-fuchsia-500 text-slate-950 group-hover:bg-fuchsia-400 ${tileCta}`}>
          Open factory
        </span>
      </Link>

      {user && profile ? (
        <Link
          href="/profile"
          className={`group flex min-w-0 flex-col items-center justify-center text-center transition hover:bg-slate-900 ${tilePad} ${
            isMobile ? "min-h-[22vh] border-b border-slate-800" : "border-b border-slate-800"
          }`}
        >
          <div className={tileIcon}>👤</div>
          <div className="min-w-0 px-1">
            <h2 className={`truncate font-extrabold text-purple-400 ${tileTitle}`}>
              {profile.display_name || profile.username}
            </h2>
            <p className={`truncate text-slate-400 ${tileBody}`}>
              ELO {profile.elo_rating}
              {isMobile ? (
                <>
                  {" "}
                  · {profile.total_games}g ·{" "}
                  {((profile.total_wins / Math.max(profile.total_games, 1)) * 100).toFixed(0)}%
                </>
              ) : (
                <>
                  {" "}
                  · {profile.total_games} Spiele ·{" "}
                  {((profile.total_wins / Math.max(profile.total_games, 1)) * 100).toFixed(0)}% Siegesrate
                </>
              )}
            </p>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-500 sm:mt-3">
              <span className={profile.total_profit >= 0 ? "text-green-400" : "text-red-400"}>
                Gewinn: {profile.total_profit >= 0 ? "+" : ""}
                {profile.total_profit.toFixed(0)}
              </span>
            </div>
          </div>
          <span className={`bg-purple-500 text-slate-950 group-hover:bg-purple-400 ${tileCta}`}>
            Mein Profil
          </span>
        </Link>
      ) : (
        <Link
          href="/register"
          className={`group flex min-w-0 flex-col items-center justify-center text-center transition hover:bg-slate-900 ${tilePad} ${
            isMobile ? "min-h-[22vh] border-b border-slate-800" : "border-b border-slate-800"
          }`}
        >
          <div className={tileIcon}>🔐</div>
          <div className="min-w-0 px-1">
            <h2 className={`font-extrabold text-rose-400 ${tileTitle}`}>Login / Register</h2>
            <p className={`text-slate-400 ${tileBody}`}>
              {isMobile ? "Save progress & climb the ladder." : "Save your progress, track stats & compete on leaderboards."}
            </p>
            <div className="mx-auto mt-2 max-w-xs rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 sm:mt-3 sm:py-2">
              <p className="text-[11px] font-semibold text-amber-300 sm:text-xs">💎 Early Supporter: Free Forever!</p>
            </div>
          </div>
          <span className={`bg-rose-500 text-slate-950 group-hover:bg-rose-400 ${tileCta}`}>
            Login
          </span>
        </Link>
      )}

      <TradiliStrip />

      <div className="col-span-full w-full min-w-0 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center sm:px-4 sm:py-3">
        <p className="truncate text-[11px] text-slate-600 sm:text-xs">
          ◆ Tradr — tap a mode to start
          <span className="ml-2 inline-block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-500/80">
            v3.12.4-host-sync
          </span>
        </p>
      </div>
    </div>
  );
}
