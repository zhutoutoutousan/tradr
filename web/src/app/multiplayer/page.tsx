"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MultiplayerJoin from "@/components/MultiplayerJoin";

function JoinPage() {
  const params = useSearchParams();
  const room = (params.get("room") ?? "").toUpperCase();
  const initialSpectate = params.get("spectate") === "1";

  return (
    <div>
      <div className="absolute left-4 top-4 z-10">
        <Link href="/" className="text-sm font-bold text-emerald-400">
          ◆ Tradr
        </Link>
      </div>
      <MultiplayerJoin
        initialRoom={room}
        initialSpectate={initialSpectate}
        onBack={() => window.location.assign("/")}
      />
    </div>
  );
}

export default function MultiplayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-400">Loading…</div>
      }
    >
      <JoinPage />
    </Suspense>
  );
}
