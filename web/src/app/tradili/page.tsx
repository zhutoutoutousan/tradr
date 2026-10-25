"use client";

import Link from "next/link";
import TradiliFeed from "@/components/TradiliFeed";

export default function TradiliPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-emerald-400">
              ◆ Tradr
            </Link>
            <span className="hidden text-slate-600 sm:inline">/</span>
            <span className="truncate text-sm font-semibold text-rose-300">Tradili</span>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 sm:px-3 sm:text-sm"
            >
              Play
            </Link>
            <Link
              href="/academy"
              className="rounded-lg border border-amber-500/40 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 sm:px-3 sm:text-sm"
            >
              Academy
            </Link>
            <Link
              href="/bots"
              className="rounded-lg border border-fuchsia-500/40 px-2.5 py-1.5 text-xs text-fuchsia-300 hover:bg-fuchsia-500/10 sm:px-3 sm:text-sm"
            >
              Bots
            </Link>
            <Link
              href="/multiplayer"
              className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 sm:px-3 sm:text-sm"
            >
              Multiplayer
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 sm:py-8">
        <TradiliFeed />
      </main>
    </div>
  );
}
