"use client";

import type { PowerupView } from "@/hooks/useGame";
import type { PowerupId } from "@/lib/game/powerups";

export default function PowerupBar({
  powerups,
  onActivate,
  disabled,
}: {
  powerups: PowerupView[];
  onActivate: (id: PowerupId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {powerups.map((p) => {
        const usable = p.ready && !disabled;
        return (
          <button
            key={p.id}
            onClick={() => onActivate(p.id)}
            disabled={!usable}
            title={`${p.name} (${p.hotkey}) — ${p.description}`}
            className={`relative flex flex-col items-center gap-0.5 overflow-hidden rounded-lg border px-1 py-2 text-center transition-colors ${
              p.active
                ? "border-2"
                : usable
                  ? "border-slate-700 bg-slate-800/70 hover:bg-slate-700"
                  : "border-slate-800 bg-slate-900/60 opacity-50"
            }`}
            style={p.active ? { borderColor: p.color, background: `${p.color}22` } : undefined}
          >
            {/* Cooldown sweep */}
            {p.cooldownPct > 0 && (
              <span
                className="absolute inset-x-0 bottom-0 bg-slate-950/70"
                style={{ height: `${p.cooldownPct * 100}%` }}
              />
            )}
            <span className="relative z-10 text-xs font-bold tracking-wide" style={{ color: p.color }}>
              {p.short}
            </span>
            <span className="relative z-10 text-[10px] leading-tight text-slate-400">{p.name}</span>
            <span className="relative z-10 flex items-center gap-1 text-[10px] text-slate-500">
              <kbd className="rounded bg-slate-700/70 px-1 text-slate-300">{p.hotkey}</kbd>
              <span className="font-mono">x{p.charges}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
