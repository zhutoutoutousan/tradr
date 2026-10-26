"use client";

import {
  langMeta,
  pickPairTexts,
  type AcademyLangSettings,
  type PolyglotUnit,
} from "@/lib/academy/polyglot";

export default function BilingualPanel({
  units,
  settings,
  title = "Dual subtitles · 双语对照",
}: {
  units: PolyglotUnit[];
  settings: AcademyLangSettings;
  title?: string;
}) {
  if (!units.length || !settings.dual) return null;

  const primaryMeta = langMeta(settings.primary);
  const targetMeta = langMeta(settings.target);

  return (
    <section data-testid="academy-bilingual-panel" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-cyan-200">{title}</h2>
        <p className="text-[11px] text-slate-500">
          {primaryMeta.flag} {primaryMeta.native} · {targetMeta.flag} {targetMeta.native}
        </p>
      </div>
      <ul className="space-y-2">
        {units.map((unit) => {
          const pair = pickPairTexts(unit, settings);
          return (
            <li
              key={unit.id}
              data-testid={`academy-bilingual-unit-${unit.id}`}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60"
            >
              <p className="border-b border-slate-800/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {pair.concept}
              </p>
              <div className="grid gap-0 sm:grid-cols-2">
                <div className="border-b border-slate-800/60 px-3 py-3 sm:border-b-0 sm:border-r">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-500/80">
                    {primaryMeta.native}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-200">{pair.primary}</p>
                </div>
                <div className="bg-cyan-500/[0.04] px-3 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90">
                    {targetMeta.native}
                  </p>
                  <p className="text-sm leading-relaxed text-cyan-50/95">{pair.target}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
