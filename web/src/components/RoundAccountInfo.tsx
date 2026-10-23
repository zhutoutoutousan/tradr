"use client";

import Link from "next/link";
import type { AccountGameResult } from "@/lib/game/accountHistory";
import { calculateLevel } from "@/lib/game/progress";
import { replayUrl } from "@/lib/replay/storage";

export default function RoundAccountInfo({
  replayId,
  accountResult,
}: {
  replayId: string | null;
  accountResult: AccountGameResult | null;
}) {
  if (!replayId && !accountResult) return null;
  const up = (accountResult?.eloChange ?? 0) >= 0;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
      {accountResult ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="account-result">
          <span className="font-semibold text-amber-300">+{accountResult.xpGained} XP</span>
          <span className="text-slate-400">Lv {calculateLevel(accountResult.xpTotal)}</span>
          <span className="font-mono text-slate-300">
            ELO {accountResult.eloBefore} → {accountResult.eloAfter}{" "}
            <span className={up ? "text-emerald-400" : "text-rose-400"}>
              ({up ? "+" : ""}
              {accountResult.eloChange})
            </span>
          </span>
        </div>
      ) : (
        <span className="text-xs text-slate-500">Sign in to keep XP and match history</span>
      )}
      {replayId && (
        <Link
          href={replayUrl(replayId)}
          data-testid="watch-replay"
          className="rounded-lg border border-fuchsia-500/60 bg-fuchsia-500/10 px-3 py-1.5 font-semibold text-fuchsia-300 hover:bg-fuchsia-500/20"
        >
          ▶ Watch replay
        </Link>
      )}
    </div>
  );
}
