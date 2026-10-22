"use client";

import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import ClearSWButton from "@/components/ClearSWButton";

export type GameMode = "solo" | "challenge" | "multiplayer" | "local-multiplayer";

export default function ModeSelect({ onPick }: { onPick: (mode: GameMode) => void }) {
  const isMobile = useIsMobile();

  return (
    <div className="relative min-h-[100dvh] bg-slate-950">
      {/* Top Bar with Login */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-400">◆ Tradr</span>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
              v3.1.0-offline
            </span>
          </div>
          <Link
            href="/register"
            className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
          >
            🔐 Login
          </Link>
        </div>
      </div>

      <ClearSWButton />
      
      {/* Mode Selection Grid */}
      <div
        className={
          isMobile
            ? "grid min-h-[100dvh] w-full grid-rows-[auto_1fr_1fr_1fr_1fr_auto] pt-[52px] text-slate-100"
            : "grid min-h-[100dvh] w-full grid-cols-2 grid-rows-[auto_1fr_1fr_auto] pt-[52px] text-slate-100"
        }
      >
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
          isMobile ? "border-b border-slate-800" : "border-b border-slate-800"
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
          isMobile ? "border-b border-slate-800" : "border-r border-slate-800"
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
          isMobile ? "" : ""
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

      <p className="col-span-full px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-slate-600">
        ◆ Tradr — tap a mode to start
        <span className="ml-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-500/80">
          v3.1.0-offline
        </span>
      </p>
      </div>
    </div>
  );
}
