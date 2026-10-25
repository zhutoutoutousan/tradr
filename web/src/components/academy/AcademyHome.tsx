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
          <li>Learn a concept in a track</li>
          <li>Encode it in Bot Factory Lab (templates from Signals / Alpha Craft)</li>
          <li>Stress-test in Story / Challenge races</li>
          <li>Keep, kill, or iterate — agent development with a human in the chair</li>
        </ol>
      </section>
    </AcademyShell>
  );
}
