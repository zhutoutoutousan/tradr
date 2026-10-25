"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTrack,
  isLessonComplete,
  isTrackUnlocked,
  lessonsForTrack,
  loadAcademyProgress,
  type AcademyProgress,
  type TrackId,
} from "@/lib/academy";
import AcademyShell from "./AcademyShell";

export default function TrackView({ trackId }: { trackId: string }) {
  const track = getTrack(trackId);
  const [progress, setProgress] = useState<AcademyProgress | null>(null);

  useEffect(() => {
    setProgress(loadAcademyProgress());
  }, []);

  if (!track) {
    return (
      <AcademyShell title="Track not found">
        <Link href="/academy" className="text-amber-300 hover:underline">
          ← Academy hub
        </Link>
      </AcademyShell>
    );
  }

  if (!progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading…</div>
    );
  }

  const unlocked = isTrackUnlocked(progress, track.id as TrackId);
  const lessons = lessonsForTrack(track.id as TrackId);

  return (
    <AcademyShell title={`${track.icon} ${track.title}`} subtitle={track.blurb}>
      <Link href="/academy" className="mb-6 inline-block text-sm text-slate-400 hover:text-amber-300">
        ← All tracks
      </Link>

      {!unlocked ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This track is locked. Finish the required earlier lessons first.
        </p>
      ) : (
        <ol className="space-y-3">
          {lessons.map((lesson) => {
            const done = isLessonComplete(progress, lesson.id);
            return (
              <li key={lesson.id}>
                <Link
                  href={`/academy/lessons/${lesson.id}`}
                  data-testid={`academy-lesson-${lesson.id}`}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-4 transition ${
                    done
                      ? "border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50"
                      : "border-slate-800 bg-slate-900/50 hover:border-amber-500/40"
                  }`}
                >
                  <div>
                    <p className="text-xs font-mono text-slate-500">
                      #{lesson.order} · {lesson.kind} · ~{lesson.minutes}m · +{lesson.xp} XP
                    </p>
                    <h3 className="mt-1 font-semibold text-white">{lesson.title}</h3>
                    <p className="text-sm text-slate-400">{lesson.summary}</p>
                  </div>
                  <span className={`text-sm font-semibold ${done ? "text-emerald-400" : "text-amber-300"}`}>
                    {done ? "Done" : "Open →"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </AcademyShell>
  );
}
