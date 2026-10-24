"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  backtest,
  BUILTIN_STRATEGIES,
  FormulaError,
  StrategyError,
  type BacktestResult,
  type StrategyDef,
} from "@/lib/strategy";
import { loadInstrumentIndex, loadMarketText, parseMarket, type InstrumentOption } from "@/lib/sim/marketData";
import { getDraft, saveDraft } from "@/lib/bots/drafts";
import BotsShell from "./BotsShell";

const BLANK: StrategyDef = {
  v: 1,
  name: "Untitled bot",
  blurb: "Edit the formulas, pick a market, run a backtest.",
  when: "bar >= 30",
  long: "cross_above(ema(close, 10), ema(close, 30))",
  short: "cross_below(ema(close, 10), ema(close, 30))",
  exitLong: "cross_below(ema(close, 10), ema(close, 30))",
  exitShort: "cross_above(ema(close, 10), ema(close, 30))",
  slPct: 0.03,
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function EquitySpark({ equity }: { equity: number[] }) {
  const pts = useMemo(() => {
    if (equity.length < 2) return "";
    const min = Math.min(...equity);
    const max = Math.max(...equity);
    const span = max - min || 1;
    const w = 320;
    const h = 72;
    return equity
      .map((v, i) => {
        const x = (i / (equity.length - 1)) * w;
        const y = h - ((v - min) / span) * (h - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [equity]);

  if (!pts) return null;
  const up = equity[equity.length - 1] >= equity[0];
  return (
    <svg viewBox="0 0 320 72" className="h-20 w-full" role="img" aria-label="Equity curve">
      <polyline
        fill="none"
        stroke={up ? "#34d399" : "#f87171"}
        strokeWidth="2"
        points={pts}
      />
    </svg>
  );
}

export default function BotLabClient() {
  const search = useSearchParams();
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<StrategyDef>(BLANK);
  const [instruments, setInstruments] = useState<InstrumentOption[]>([]);
  const [marketId, setMarketId] = useState("aapl");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    const template = search.get("template");
    const draft = search.get("draft");
    if (draft) {
      const d = getDraft(draft);
      if (d) {
        setDraftId(d.id);
        setStrategy(d.strategy);
        return;
      }
    }
    if (template && BUILTIN_STRATEGIES[template]) {
      setDraftId(null);
      setStrategy({ ...BUILTIN_STRATEGIES[template] });
      return;
    }
    setDraftId(null);
    setStrategy(BLANK);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    loadInstrumentIndex().then((list) => {
      if (cancelled) return;
      setInstruments(list);
      setMarketId((cur) => (list.some((i) => i.id === cur) ? cur : list[0]?.id ?? cur));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = useCallback(<K extends keyof StrategyDef>(key: K, value: StrategyDef[K]) => {
    setStrategy((s) => ({ ...s, [key]: value }));
    setSaveMsg(null);
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const text = await loadMarketText(marketId, 12_000);
      const data = text ? parseMarket(text) : null;
      if (!data?.candles?.length) throw new Error(`Could not load market ${marketId}`);
      const kind = instruments.find((i) => i.id === marketId)?.kind;
      const barsPerYear = kind === "crypto" ? 365 : 252;
      const res = backtest(strategy, data.candles, { barsPerYear, feeBps: 1 });
      setResult(res);
    } catch (err) {
      const msg =
        err instanceof FormulaError || err instanceof StrategyError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [strategy, marketId, instruments]);

  const onSave = useCallback(() => {
    const out = saveDraft(strategy, draftId ?? undefined);
    if (!out.ok) {
      setSaveMsg(out.error);
      return;
    }
    setDraftId(out.draft.id);
    setSaveMsg("Saved to this device (private).");
    router.replace(`/bots/lab?draft=${encodeURIComponent(out.draft.id)}`);
  }, [strategy, draftId, router]);

  const formulaFields: { key: keyof StrategyDef; label: string; rows?: number }[] = [
    { key: "when", label: "when (warmup gate)", rows: 2 },
    { key: "long", label: "long entry", rows: 3 },
    { key: "short", label: "short entry", rows: 3 },
    { key: "exitLong", label: "exit long", rows: 2 },
    { key: "exitShort", label: "exit short", rows: 2 },
  ];

  return (
    <BotsShell
      title="Strategy Lab"
      subtitle="Edit Alpha101-style formulas, backtest on daily history. Block editor and cloud save come next."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
            <input
              data-testid="bot-lab-name"
              value={strategy.name}
              onChange={(e) => setField("name", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Blurb</span>
            <input
              value={strategy.blurb ?? ""}
              onChange={(e) => setField("blurb", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-fuchsia-500/60"
            />
          </label>

          {formulaFields.map(({ key, label, rows }) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
              <textarea
                data-testid={`bot-lab-${key}`}
                value={(strategy[key] as string | undefined) ?? ""}
                onChange={(e) => setField(key, e.target.value || undefined)}
                rows={rows ?? 2}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-emerald-200 outline-none focus:border-fuchsia-500/60"
              />
            </label>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">slPct</span>
              <input
                value={strategy.slPct ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (!v) setField("slPct", undefined);
                  else if (/^-?\d+(\.\d+)?$/.test(v)) setField("slPct", Number(v));
                  else setField("slPct", v);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white outline-none focus:border-fuchsia-500/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">tpPct</span>
              <input
                value={strategy.tpPct ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (!v) setField("tpPct", undefined);
                  else if (/^-?\d+(\.\d+)?$/.test(v)) setField("tpPct", Number(v));
                  else setField("tpPct", v);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-white outline-none focus:border-fuchsia-500/60"
              />
            </label>
          </div>

          {strategy.let && Object.keys(strategy.let).length > 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">let bindings</p>
              <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                {Object.entries(strategy.let).map(([k, v]) => (
                  <li key={k}>
                    <span className="text-fuchsia-300">{k}</span> = {v}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-600">Editable let-block editor comes with the block factory.</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Market</span>
              <select
                data-testid="bot-lab-market"
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500/60"
              >
                {instruments.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.kind})
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="bot-lab-run"
                disabled={running}
                onClick={run}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {running ? "Running…" : "Run backtest"}
              </button>
              <button
                type="button"
                data-testid="bot-lab-save"
                onClick={onSave}
                className="rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 px-4 py-2.5 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20"
              >
                Save
              </button>
            </div>
            {saveMsg ? <p className="mt-2 text-xs text-slate-400">{saveMsg}</p> : null}
            {error ? (
              <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" data-testid="bot-lab-error">
                {error}
              </p>
            ) : null}
          </div>

          {result ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4" data-testid="bot-lab-result">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Results</h2>
              <EquitySpark equity={result.equity} />
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Total return</dt>
                  <dd className={`font-semibold ${result.metrics.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {pct(result.metrics.totalReturn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Sharpe</dt>
                  <dd className="font-semibold text-white">{result.metrics.sharpe.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Max DD</dt>
                  <dd className="font-semibold text-amber-300">{pct(result.metrics.maxDrawdown)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Win rate</dt>
                  <dd className="font-semibold text-white">{pct(result.metrics.winRate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Trades</dt>
                  <dd className="font-semibold text-white">{result.metrics.trades}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Fees</dt>
                  <dd className="font-semibold text-slate-300">{money(result.metrics.fees)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-slate-600">
                Fill at next open · 1 bps/side · final equity {money(result.equity[result.equity.length - 1] ?? 0)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
              Run a backtest to see return, Sharpe, drawdown and the equity curve.
            </div>
          )}
        </div>
      </div>
    </BotsShell>
  );
}
