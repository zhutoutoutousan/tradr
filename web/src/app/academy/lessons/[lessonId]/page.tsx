"use client";

import { Suspense, use } from "react";
import RequireAuth from "@/components/bots/RequireAuth";
import LessonView from "@/components/academy/LessonView";

export default function AcademyLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading lesson…</div>
      }
    >
      <RequireAuth>
        <LessonView lessonId={lessonId} />
      </RequireAuth>
    </Suspense>
  );
}
