"use client";

import { Suspense, use } from "react";
import RequireAuth from "@/components/bots/RequireAuth";
import TrackView from "@/components/academy/TrackView";

export default function AcademyTrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading track…</div>
      }
    >
      <RequireAuth>
        <TrackView trackId={trackId} />
      </RequireAuth>
    </Suspense>
  );
}
