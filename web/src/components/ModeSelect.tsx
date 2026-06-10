"use client";

import { useIsMobile } from "@/hooks/useIsMobile";

export type GameMode = "solo" | "multiplayer";

export default function ModeSelect({ onPick }: { onPick: (mode: GameMode) => void }) {
  const isMobile = useIsMobile();

  return (
    <div
      className={
        isMobile
          ? "grid min-h-[100dvh] w-full grid-rows-[1fr_1fr_auto] bg-slate-950 text-slate-100"
          : "grid min-h-[100dvh] w-full grid-cols-2 grid-rows-[1fr_auto] bg-slate-950 text-slate-100"
      }
    >
      <button
        type="button"
        data-testid="mode-solo"
        onClick={() => onPick("solo")}
        className={`group flex flex-col items-center justify-center gap-4 p-6 text-center transition active:bg-slate-900 sm:p-8 ${
          isMobile ? "border-b border-slate-800" : "border-r border-slate-800"
        }`}
      >
        <div className="text-5xl">🎯</div>
        <div>
          <h2 className="text-2xl font-extrabold text-emerald-400 sm:text-3xl">Single player</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
            3-minute race vs roguelike bots. Random market, timeframe, and indicators every round.
          </p>
        </div>
        <span className="rounded-full bg-emerald-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-emerald-400">
          Play solo
        </span>
      </button>

      <button
        type="button"
        data-testid="mode-multiplayer"
        onClick={() => onPick("multiplayer")}
        className="group flex flex-col items-center justify-center gap-4 p-6 text-center transition active:bg-slate-900 sm:p-8"
      >
        <div className="text-5xl">⚔️</div>
        <div>
          <h2 className="text-2xl font-extrabold text-sky-400 sm:text-3xl">Multiplayer</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400 sm:text-base">
            Race friends on the same live chart. Create or join a room in seconds.
          </p>
        </div>
        <span className="rounded-full bg-sky-500 px-6 py-3 text-base font-bold text-slate-950 group-hover:bg-sky-400">
          Play multiplayer
        </span>
      </button>

      <p className="col-span-full px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-slate-600">
        ◆ Tradr — tap a side to start
      </p>
    </div>
  );
}
