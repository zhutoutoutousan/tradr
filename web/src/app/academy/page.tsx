"use client";

import { Suspense } from "react";
import RequireAuth from "@/components/bots/RequireAuth";
import AcademyHome from "@/components/academy/AcademyHome";

export default function AcademyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading Academy…</div>
      }
    >
      <RequireAuth>
        <AcademyHome />
      </RequireAuth>
    </Suspense>
  );
}
