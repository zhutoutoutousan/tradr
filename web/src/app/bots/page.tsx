"use client";

import { Suspense } from "react";
import RequireAuth from "@/components/bots/RequireAuth";
import BotsHomeClient from "@/components/bots/BotsHomeClient";

export default function BotsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading…</div>
      }
    >
      <RequireAuth>
        <BotsHomeClient />
      </RequireAuth>
    </Suspense>
  );
}
