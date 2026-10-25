import { LESSONS, TRACKS, type TrackId, lessonsForTrack } from "./curriculum";

export interface AcademyProgress {
  completedLessons: Record<string, { at: string; xp: number }>;
  xp: number;
  quizCorrect: Record<string, string[]>; // lessonId → question ids answered correctly
}

const KEY = "tradr.academy.v1";

export function defaultAcademyProgress(): AcademyProgress {
  return { completedLessons: {}, xp: 0, quizCorrect: {} };
}

export function loadAcademyProgress(): AcademyProgress {
  if (typeof window === "undefined") return defaultAcademyProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultAcademyProgress();
    const p = JSON.parse(raw) as AcademyProgress;
    return {
      ...defaultAcademyProgress(),
      ...p,
      completedLessons: p.completedLessons ?? {},
      quizCorrect: p.quizCorrect ?? {},
    };
  } catch {
    return defaultAcademyProgress();
  }
}

export function saveAcademyProgress(p: AcademyProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota */
  }
}

export function isLessonComplete(p: AcademyProgress, lessonId: string): boolean {
  return Boolean(p.completedLessons[lessonId]);
}

export function completeLesson(p: AcademyProgress, lessonId: string): AcademyProgress {
  if (p.completedLessons[lessonId]) return p;
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return p;
  const next: AcademyProgress = {
    ...p,
    xp: p.xp + lesson.xp,
    completedLessons: {
      ...p.completedLessons,
      [lessonId]: { at: new Date().toISOString(), xp: lesson.xp },
    },
  };
  saveAcademyProgress(next);
  return next;
}

export function trackCompletion(p: AcademyProgress, trackId: TrackId): { done: number; total: number } {
  const list = lessonsForTrack(trackId);
  const done = list.filter((l) => isLessonComplete(p, l.id)).length;
  return { done, total: list.length };
}

export function isTrackUnlocked(p: AcademyProgress, trackId: TrackId): boolean {
  const track = TRACKS.find((t) => t.id === trackId);
  if (!track?.requires) return true;
  const { done } = trackCompletion(p, track.requires.trackId);
  return done >= track.requires.lessons;
}

export function nextLessonId(p: AcademyProgress): string | null {
  for (const track of TRACKS) {
    if (!isTrackUnlocked(p, track.id)) continue;
    for (const lesson of lessonsForTrack(track.id)) {
      if (!isLessonComplete(p, lesson.id)) return lesson.id;
    }
  }
  return null;
}

export function recordQuizCorrect(p: AcademyProgress, lessonId: string, questionId: string): AcademyProgress {
  const prev = p.quizCorrect[lessonId] ?? [];
  if (prev.includes(questionId)) return p;
  const next: AcademyProgress = {
    ...p,
    quizCorrect: { ...p.quizCorrect, [lessonId]: [...prev, questionId] },
  };
  saveAcademyProgress(next);
  return next;
}
