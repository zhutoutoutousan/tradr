"use client";

import { useMemo, useState } from "react";
import { SYNTHETIC, type InstrumentOption, type PickMode } from "@/lib/sim/marketData";

const KIND_LABELS: Record<string, { en: string; de: string }> = {
  stock: { en: "Stocks", de: "Aktien" },
  crypto: { en: "Crypto", de: "Krypto" },
  forex: { en: "Forex", de: "Devisen" },
  commodity: { en: "Commodities", de: "Rohstoffe" },
};
const KIND_ORDER = ["stock", "crypto", "forex", "commodity"];

/**
 * Lobby market picker. Everyone votes; when the race starts the host draws a
 * market with probability proportional to its votes. The host can instead
 * pick alone.
 */
export function MarketVote({
  instruments,
  voteCounts,
  myVote,
  onVote,
  pickMode,
  onPickMode,
  isHost,
  disabled,
  local,
}: {
  instruments: InstrumentOption[];
  voteCounts: Record<string, number>;
  myVote: string | null;
  onVote: (id: string) => void;
  pickMode: PickMode;
  onPickMode: (m: PickMode) => void;
  isHost: boolean;
  disabled?: boolean;
  local?: boolean;
}) {
  const t = (en: string, de: string) => (local ? de : en);
  const [query, setQuery] = useState("");
  const names = useMemo(() => {
    const m: Record<string, string> = { [SYNTHETIC]: t("Random (synthetic)", "Zufall (synthetisch)") };
    for (const i of instruments) m[i.id] = i.name;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instruments, local]);

  const total = Object.values(voteCounts).reduce((s, n) => s + n, 0);
  const ranked = Object.entries(voteCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const canVote = !disabled && (pickMode === "vote" || isHost);

  const q = query.trim().toLowerCase();
  const groups: [string, InstrumentOption[]][] = [];
  const byKind: Record<string, InstrumentOption[]> = {};
  for (const i of instruments) {
    if (q && !i.name.toLowerCase().includes(q) && !i.id.includes(q)) continue;
    (byKind[i.kind] ??= []).push(i);
  }
  for (const k of [...KIND_ORDER, ...Object.keys(byKind).filter((k) => !KIND_ORDER.includes(k))]) {
    if (byKind[k]?.length) groups.push([k, byKind[k]]);
  }

  const chip = (id: string, label: string) => {
    const n = voteCounts[id] ?? 0;
    const mine = myVote === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onVote(id)}
        disabled={!canVote}
        data-testid={`vote-${id}`}
        aria-pressed={mine}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed ${
          mine
            ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
            : "border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500 disabled:opacity-60"
        }`}
      >
        <span className="truncate">{label}</span>
        {n > 0 && <span className="rounded bg-slate-950/60 px-1 font-mono text-[10px] text-emerald-300">{n}</span>}
      </button>
    );
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-left" data-testid="market-vote">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">{t("Market", "Markt")}</span>
        {isHost ? (
          <div className="flex overflow-hidden rounded-md border border-slate-700 text-[11px]">
            {(["vote", "host"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => onPickMode(m)}
                data-testid={`pick-mode-${m}`}
                className={`px-2 py-1 ${pickMode === m ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400 hover:bg-slate-800"}`}
              >
                {m === "vote" ? t("🗳️ Vote", "🗳️ Abstimmung") : t("👑 I pick", "👑 Ich wähle")}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            {pickMode === "vote" ? t("🗳️ Vote", "🗳️ Abstimmung") : t("👑 Host picks", "👑 Host wählt")}
          </span>
        )}
      </div>

      <div className="mb-2 min-h-[1.25rem] text-xs text-slate-400" data-testid="vote-summary">
        {ranked.length === 0 ? (
          pickMode === "vote" ? (
            t("No votes yet: a random real market will be drawn.", "Noch keine Stimmen: ein zufälliger echter Markt wird gezogen.")
          ) : (
            t("The host hasn't picked yet: random market.", "Der Host hat noch nichts gewählt: zufälliger Markt.")
          )
        ) : pickMode === "host" ? (
          <span>
            {t("Host's pick: ", "Wahl des Hosts: ")}
            <span className="font-semibold text-emerald-300">{names[ranked[0][0]] ?? ranked[0][0]}</span>
          </span>
        ) : (
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            {ranked.slice(0, 5).map(([id, n]) => (
              <span key={id}>
                <span className="text-slate-200">{names[id] ?? id}</span>{" "}
                <span className="font-mono text-emerald-300">{Math.round((n / total) * 100)}%</span>
              </span>
            ))}
            <span className="text-slate-500">{t("· chance to be drawn", "· Chance gezogen zu werden")}</span>
          </span>
        )}
      </div>

      {instruments.length > 8 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search market…", "Markt suchen…")}
          className="mb-2 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs outline-none focus:border-emerald-500"
        />
      )}

      <div className="max-h-36 space-y-2 sm:max-h-44 overflow-y-auto pr-1">
        {instruments.length === 0 && (
          <div className="text-xs text-slate-500">{t("Loading markets…", "Lade Märkte…")}</div>
        )}
        {groups.map(([kind, opts]) => (
          <div key={kind}>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
              {KIND_LABELS[kind] ? t(KIND_LABELS[kind].en, KIND_LABELS[kind].de) : kind}
            </div>
            <div className="flex flex-wrap gap-1">{opts.map((o) => chip(o.id, o.name))}</div>
          </div>
        ))}
        {!q && <div className="flex flex-wrap gap-1">{chip(SYNTHETIC, names[SYNTHETIC])}</div>}
      </div>
    </div>
  );
}
