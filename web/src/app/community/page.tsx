"use client";

import Link from "next/link";
import CommunityGallery from "@/components/CommunityGallery";

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-emerald-400">
            ◆ Tradr
          </Link>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Play
            </Link>
            <Link
              href="/multiplayer"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Multiplayer
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 pb-16">
        <CommunityGallery />
      </main>
    </div>
  );
}
