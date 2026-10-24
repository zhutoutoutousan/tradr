"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { safeNextPath, stashAuthNext } from "@/lib/bots/authRedirect";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading || isAuthenticated) return;
    const qs = searchParams.toString();
    const next = safeNextPath(qs ? `${pathname}?${qs}` : pathname, "/bots");
    stashAuthNext(next);
    window.location.href = `/register?next=${encodeURIComponent(next)}`;
  }, [loading, isAuthenticated, pathname, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Checking login…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Redirecting to login…
      </div>
    );
  }

  return <>{children}</>;
}
