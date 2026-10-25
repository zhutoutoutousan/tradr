"use client";

import { Suspense } from "react";
import RequireAuth from "@/components/bots/RequireAuth";
import StoryCampaign from "@/components/academy/StoryCampaign";

export default function AcademyStoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading campaign…</div>
      }
    >
      <RequireAuth>
        <StoryCampaign />
      </RequireAuth>
    </Suspense>
  );
}
