"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TRACKS,
  getLesson,
  isTrackUnlocked,
  loadAcademyProgress,
  nextLessonId,
  trackCompletion,
  type AcademyProgress,
} from "@/lib/academy";
import AcademyShell from "./AcademyShell";

export default function AcademyHome() {
  const [progress, setProgress] = useState<AcademyProgress | null>(null);

  useEffect(() => {
    setProgress(loadAcademyProgress());
  }, []);

  if (!progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading…</div>
    );
  }

  const nextId = nextLessonId(progress);
  const next = nextId ? getLesson(nextId) : null;
  const doneCount = Object.keys(progress.completedLessons).length;

  return (
    <AcademyShell
      title="Tradr Academy"
      subtitle="Systematic quant + AI-agent training. Lessons unlock Story races and Bot Factory labs — no pay-to-win, no pasted proprietary alphas."
    >
      <Link
        href="/academy/planet"
        data-testid="academy-planet-portal"
        className="group relative mb-8 block overflow-hidden rounded-2xl border border-rose-500/30 bg-[#050814] p-6 transition hover:border-rose-400/50"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 12% 30%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.35), transparent), radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.4), transparent)",
          }}
        />
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl transition group-hover:bg-rose-400/30" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-sky-500/15 blur-2xl" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-rose-400">New · Learning Planet</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            Quant <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-sky-400 bg-clip-text text-transparent">学习星球</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            mindcraft-style knowledge graph — market-making research (arXiv:2610.30891), interview arena, and desk library
            in one orbiting sky.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-rose-500 px-5 py-2 text-sm font-bold text-slate-950 group-hover:bg-rose-400">
            Enter the planet →
          </span>
        </div>
      </Link>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Academy XP</p>
          <p className="mt-1 text-2xl font-bold text-amber-300" data-testid="academy-xp">
            {progress.xp}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Lessons cleared</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {doneCount}
            <span className="text-base font-normal text-slate-500"> / {TRACKS.reduce((n, t) => n + trackCompletion(progress, t.id).total, 0)}</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Continue</p>
          {next ? (
            <Link
              href={`/academy/lessons/${next.id}`}
              data-testid="academy-continue"
              className="mt-1 inline-block text-lg font-bold text-emerald-300 hover:text-emerald-200"
            >
              {next.title} →
            </Link>
          ) : (
            <p className="mt-1 text-lg font-bold text-emerald-300">Curriculum complete</p>
          )}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {TRACKS.map((track) => {
          const unlocked = isTrackUnlocked(progress, track.id);
          const { done, total } = trackCompletion(progress, track.id);
          return (
            <Link
              key={track.id}
              href={unlocked ? `/academy/tracks/${track.id}` : "#"}
              data-testid={`academy-track-${track.id}`}
              aria-disabled={!unlocked}
              onClick={(e) => {
                if (!unlocked) e.preventDefault();
              }}
              className={`rounded-xl border p-5 transition ${
                unlocked
                  ? "border-slate-800 bg-slate-900/60 hover:border-amber-500/40"
                  : "cursor-not-allowed border-slate-900 bg-slate-950/40 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl">{track.icon}</p>
                  <h2 className={`mt-2 text-xl font-extrabold ${track.accent}`}>{track.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{track.blurb}</p>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {done}/{total}
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-500/80"
                  style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                />
              </div>
              {!unlocked && track.requires ? (
                <p className="mt-3 text-xs text-slate-600">
                  Clear {track.requires.lessons} lesson(s) in {track.requires.trackId} first
                </p>
              ) : null}
            </Link>
          );
        })}
      </section>

      <section className="mt-10 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-5">
        <h2 className="font-bold text-white">How the loops connect</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-400">
          <li>Orbit a concept on the Learning Planet (CLAIM + SOURCE)</li>
          <li>Learn it in a track — Quant Desk covers interview + library hygiene</li>
          <li>Encode it in Bot Factory Lab (templates from Signals / Alpha Craft)</li>
          <li>Stress-test in Story / Challenge races</li>
          <li>Keep, kill, or iterate — agent development with a human in the chair</li>
        </ol>
      </section>
    </AcademyShell>
  );
}
