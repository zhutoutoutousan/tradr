"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BUILTIN_STRATEGIES } from "@/lib/strategy";
import { deleteDraft, listDrafts, PRIVATE_BOT_LIMIT, type BotDraft } from "@/lib/bots/drafts";
import BotsShell from "./BotsShell";

export default function BotsHomeClient() {
  const [drafts, setDrafts] = useState<BotDraft[]>([]);

  const refresh = useCallback(() => setDrafts(listDrafts()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const builtins = Object.entries(BUILTIN_STRATEGIES);

  return (
    <BotsShell
      title="Bot Factory"
      subtitle="Build formula bots, backtest them on real history, then bring them into races. Private saves are capped at 3 for now (local drafts)."
    >
      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">My bots</h2>
            <p className="text-sm text-slate-500">
              {drafts.length}/{PRIVATE_BOT_LIMIT} private slots used
            </p>
          </div>
          <Link
            href="/bots/lab"
            data-testid="bots-new"
            className="rounded-lg bg-fuchsia-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-fuchsia-400"
          >
            + New in Lab
          </Link>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-8 text-center text-sm text-slate-400">
            No saved bots yet. Open a template in the Lab, run a backtest, then Save.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{d.strategy.name}</h3>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                      private
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {d.strategy.blurb || "Custom formula bot"}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-slate-600">
                    Updated {new Date(d.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/bots/lab?draft=${encodeURIComponent(d.id)}`}
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      deleteDraft(d.id);
                      refresh();
                    }}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-white">Templates</h2>
        <p className="mb-4 text-sm text-slate-500">
          Built-in families from the race engine — same decisions as the hand-written bots.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builtins.map(([key, s]) => (
            <li key={key} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="font-semibold text-emerald-300">{s.name}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-slate-400">{s.blurb}</p>
              <Link
                href={`/bots/lab?template=${encodeURIComponent(key)}`}
                data-testid={`bots-template-${key}`}
                className="mt-4 inline-flex rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                Open in Lab →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </BotsShell>
  );
}
