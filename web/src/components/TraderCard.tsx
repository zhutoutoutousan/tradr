import type { TraderView } from "@/hooks/useGame";

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function TraderCard({ t, rank }: { t: TraderView; rank: number }) {
  const positive = t.returnPct >= 0;
  const winRate = t.trades > 0 ? (t.wins / t.trades) * 100 : 0;
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        t.kind === "player" ? "border-emerald-500/60 bg-emerald-500/5" : "border-slate-700/60 bg-slate-800/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-slate-500 w-5 shrink-0">#{rank}</span>
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: t.color }} />
          <span className="font-semibold truncate">{t.name}</span>
          {t.position && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                t.position.side === "long" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {t.position.side}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-semibold tabular-nums">{money(t.equity)}</div>
          <div className={`text-xs font-mono tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
            {positive ? "+" : ""}
            {t.returnPct.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
        <div>
          <div className="text-slate-500">Trades</div>
          <div className="font-mono text-slate-300">{t.trades}</div>
        </div>
        <div>
          <div className="text-slate-500">Win rate</div>
          <div className="font-mono text-slate-300">{winRate.toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-slate-500">Max DD</div>
          <div className="font-mono text-slate-300">{t.maxDrawdownPct.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
