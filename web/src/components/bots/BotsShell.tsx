"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/bots", label: "My bots", exact: true },
  { href: "/bots/lab", label: "Lab" },
  { href: "/academy", label: "Academy" },
];

export default function BotsShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-emerald-400">
              ◆ Tradr
            </Link>
            <span className="hidden text-slate-600 sm:inline">/</span>
            <span className="text-sm font-semibold text-fuchsia-300">Bot Factory</span>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 px-3 py-1.5 text-sm font-semibold text-fuchsia-200"
                      : "rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Play
            </Link>
            <Link
              href="/profile"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
