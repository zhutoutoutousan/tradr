"use client";

import {
  LANGS,
  SUGGESTED_PAIRS,
  langMeta,
  type AcademyLangSettings,
  type LangCode,
} from "@/lib/academy/polyglot";

export default function LangPairSettings({
  value,
  onChange,
  compact,
}: {
  value: AcademyLangSettings;
  onChange: (next: AcademyLangSettings) => void;
  compact?: boolean;
}) {
  const set = (patch: Partial<AcademyLangSettings>) => {
    let primary = patch.primary ?? value.primary;
    let target = patch.target ?? value.target;
    if (target === primary) {
      target = primary === "en" ? "de" : "en";
    }
    onChange({
      primary,
      target,
      dual: patch.dual ?? value.dual,
    });
  };

  const selectCls =
    "rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200";

  return (
    <div
      data-testid="academy-lang-settings"
      className={
        compact
          ? "rounded-xl border border-cyan-500/25 bg-slate-900/50 p-4"
          : "rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/80 via-[#0a1628] to-slate-950 p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400">
            Polyglot · 语言对
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-white">
            {langMeta(value.primary).native} · {langMeta(value.target).native}
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            Primary = gloss / explanations. Target = language you acquire. Quant concepts stay the job —
            foreign lemmas ride as dual subtitles.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={value.dual}
            data-testid="academy-lang-dual"
            onChange={(e) => set({ dual: e.target.checked })}
            className="rounded border-slate-600"
          />
          Dual columns
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Primary
          <select
            className={selectCls}
            value={value.primary}
            data-testid="academy-lang-primary"
            onChange={(e) => set({ primary: e.target.value as LangCode })}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.native}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Target
          <select
            className={selectCls}
            value={value.target}
            data-testid="academy-lang-target"
            onChange={(e) => set({ target: e.target.value as LangCode })}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code} disabled={l.code === value.primary}>
                {l.flag} {l.native}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!compact ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_PAIRS.map((p) => {
            const active = p.primary === value.primary && p.target === value.target;
            return (
              <button
                key={`${p.primary}-${p.target}`}
                type="button"
                data-testid={`academy-lang-pair-${p.primary}-${p.target}`}
                onClick={() => set({ primary: p.primary, target: p.target })}
                className={
                  active
                    ? "rounded-md border border-cyan-400/60 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-100"
                    : "rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-slate-200"
                }
              >
                {p.blurb}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
