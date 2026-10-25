"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  completeLesson,
  getLesson,
  getTrack,
  isLessonComplete,
  loadAcademyProgress,
  stashChallenge,
  type AcademyProgress,
} from "@/lib/academy";
import { getChallengeById } from "@/lib/game/challenges";
import AcademyShell from "./AcademyShell";
import QuizBlock from "./QuizBlock";

export default function LessonView({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId);
  const router = useRouter();
  const [progress, setProgress] = useState<AcademyProgress | null>(null);

  useEffect(() => {
    setProgress(loadAcademyProgress());
  }, []);

  if (!lesson) {
    return (
      <AcademyShell title="Lesson not found">
        <Link href="/academy" className="text-amber-300 hover:underline">
          ← Hub
        </Link>
      </AcademyShell>
    );
  }

  if (!progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading…</div>
    );
  }

  const track = getTrack(lesson.trackId);
  const done = isLessonComplete(progress, lesson.id);

  const markDone = () => {
    setProgress(completeLesson(progress, lesson.id));
  };

  const startStory = () => {
    if (!lesson.storyLevelId) return;
    const level = getChallengeById(lesson.storyLevelId);
    if (!level) return;
    stashChallenge(level, `/academy/lessons/${lesson.id}`);
    router.push(`/?level=${encodeURIComponent(level.id)}`);
  };

  return (
    <AcademyShell
      title={lesson.title}
      subtitle={`${track?.title ?? lesson.trackId} · ${lesson.kind} · ~${lesson.minutes} min · +${lesson.xp} XP`}
    >
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href={`/academy/tracks/${lesson.trackId}`} className="text-slate-400 hover:text-amber-300">
          ← {track?.title ?? "Track"}
        </Link>
        {done ? (
          <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
            Completed
          </span>
        ) : null}
      </div>

      <article className="space-y-6">
        {lesson.sections.map((s, i) => (
          <section key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            {s.heading ? <h2 className="mb-2 text-lg font-bold text-white">{s.heading}</h2> : null}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{s.body}</p>
          </section>
        ))}

        {lesson.quiz?.length ? (
          <section>
            <h2 className="mb-3 text-lg font-bold text-amber-200">Check your understanding</h2>
            {done ? (
              <p className="text-sm text-emerald-400">Quiz already cleared for this lesson.</p>
            ) : (
              <QuizBlock questions={lesson.quiz} onAllCorrect={markDone} />
            )}
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {lesson.botLabHref ? (
            <Link
              href={lesson.botLabHref}
              data-testid="academy-open-lab"
              className="rounded-lg bg-fuchsia-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-fuchsia-400"
            >
              Open Bot Lab
            </Link>
          ) : null}
          {lesson.storyLevelId || lesson.kind === "play" ? (
            <button
              type="button"
              data-testid="academy-play-story"
              onClick={() => {
                if (lesson.storyLevelId) startStory();
                else router.push("/academy/story");
              }}
              className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-violet-400"
            >
              {lesson.storyLevelId ? "Play story level" : "Open Story Campaign"}
            </button>
          ) : null}
          {!lesson.quiz?.length && !done ? (
            <button
              type="button"
              data-testid="academy-complete"
              onClick={markDone}
              className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
            >
              Mark complete (+{lesson.xp} XP)
            </button>
          ) : null}
          {done && !lesson.quiz?.length ? (
            <span className="self-center text-sm text-emerald-400">Lesson complete</span>
          ) : null}
        </div>
      </article>
    </AcademyShell>
  );
}
