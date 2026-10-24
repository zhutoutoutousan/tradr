"use client";

import { Suspense } from "react";
import RequireAuth from "@/components/bots/RequireAuth";
import BotLabClient from "@/components/bots/BotLabClient";

export default function BotLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">Loading lab…</div>
      }
    >
      <RequireAuth>
        <BotLabClient />
      </RequireAuth>
    </Suspense>
  );
}
