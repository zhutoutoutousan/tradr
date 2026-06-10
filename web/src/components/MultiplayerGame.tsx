"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CandleChart from "@/components/CandleChart";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useIsMobile } from "@/hooks/useIsMobile";

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

const KIND_LABELS: Record<string, string> = {
  forex: "Forex",
  commodity: "Commodities",
  crypto: "Crypto",
  stock: "Stocks",
};

// Bump on each deploy so a stale cached build is obvious on every device.
const BUILD_TAG = "v7";

export default function MultiplayerGame({
  room,
  name,
  onLeave,
}: {
  room: string;
  name: string;
  onLeave: () => void;
}) {
  const {
    phase,
    snapshot,
    secondsToStart,
    timeLeftMs,
    playerCount,
    isHost,
    start,
    controls,
    instruments,
    selectedInstrument,
    setInstrument,
    instrumentLoading,
  } = useMultiplayer(room, name);

  const running = phase === "running";
  const finished = phase === "finished";
  const lowTime = running && timeLeftMs <= 30_000;
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 300 : 440;
  const [copied, setCopied] = useState(false);

  function copyInvite() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/multiplayer?room=${encodeURIComponent(room)}` : "";
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !running) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) return;
      if (e.key.toLowerCase() === "b") controls.long();
      if (e.key.toLowerCase() === "s") controls.short();
      if (e.key.toLowerCase() === "c") controls.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls, running]);

  if (phase === "disabled") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-slate-300">
        <p className="text-rose-400">Multiplayer is not configured.</p>
        <p className="max-w-md text-sm text-slate-500">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code>web/.env.local</code> and restart the dev server.
        </p>
        <button onClick={onLeave} className="rounded bg-slate-800 px-4 py-2 hover:bg-slate-700">
          Back
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Connecting to room…</div>;
  }

  const me = snapshot.me;
  const humans = snapshot.leaderboard.filter((r) => !r.isBot);
  const myRank = humans.findIndex((r) => r.isMe) + 1;
  const overallRank = snapshot.leaderboard.findIndex((r) => r.isMe) + 1;
  const humanCount = humans.length;
  const totalRacers = snapshot.leaderboard.length;
  const priceDecimals = snapshot.price < 10 ? 4 : 2;

  const grouped: Record<string, typeof instruments> = {};
  for (const m of instruments) (grouped[m.kind] ??= []).push(m);
  const instrumentPicker = (
    <select
      value={selectedInstrument}
      onChange={(e) => setInstrument(e.target.value)}
      disabled={!isHost || phase !== "lobby"}
      className="rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
    >
      <option value="synthetic">Random (synthetic)</option>
      {Object.entries(grouped).map(([kind, opts]) => (
        <optgroup key={kind} label={KIND_LABELS[kind] ?? kind}>
          {opts.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold tracking-tight text-emerald-400">
            ◆ Tradr
          </Link>
          <span className="rounded bg-slate-800 px-2 py-1 font-mono text-sm text-emerald-300">room {room}</span>
          <span className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-500" title="build version">
            {BUILD_TAG}
          </span>
          <span className="text-xs text-slate-500">
            {playerCount} connected · {humanCount} trader{humanCount === 1 ? "" : "s"} in race
          </span>
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <span
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
                lowTime ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-200"
              }`}
            >
              ⏱ {clock(timeLeftMs)}
            </span>
          )}
          <span className="text-xs text-slate-400">
            {phase === "lobby" && "Lobby · 3 min race"}
            {phase === "countdown" && `Starting in ${secondsToStart}…`}
            {phase === "running" && `Live · bar ${snapshot.bar}`}
            {phase === "finished" && "Race over"}
          </span>
          <button onClick={copyInvite} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            {copied ? "✓ Copied" : "Invite"}
          </button>
          <button onClick={onLeave} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            Leave
          </button>
        </div>
      </header>

      <main className="grid gap-4 p-3 pb-28 sm:p-4 lg:grid-cols-[1fr_340px] lg:pb-4">
        <section className="space-y-4">
          <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-2 sm:p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <div className="text-sm font-semibold">{snapshot.label}</div>
                <div className="font-mono text-xl tabular-nums sm:text-2xl">{snapshot.price.toFixed(priceDecimals)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Your equity</div>
                <div className="font-mono text-lg tabular-nums sm:text-xl">{money(me.equity)}</div>
                <div className={`font-mono text-sm ${me.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {me.returnPct >= 0 ? "+" : ""}
                  {me.returnPct.toFixed(2)}%
                </div>
              </div>
            </div>
            <CandleChart
              candles={snapshot.candles}
              position={me.position ? { ...me.position, size: 0, openBar: 0 } : null}
              botPositions={snapshot.botPositions}
              height={chartHeight}
              enableMouseTrading={!isMobile && running}
              onBuy={controls.long}
              onSell={controls.short}
              onClose={controls.close}
            />

            {phase !== "running" && phase !== "finished" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-950/80 backdrop-blur-sm">
                {phase === "countdown" ? (
                  <div className="text-center">
                    <div className="text-6xl font-extrabold text-emerald-400">{secondsToStart}</div>
                    <div className="mt-2 text-slate-400">Get ready…</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="text-lg font-semibold">Waiting in the lobby</div>
                    <div className="mt-1 max-w-sm text-sm text-slate-400">
                      Share room code <span className="font-mono text-emerald-300">{room}</span> with friends. Everyone
                      trades the exact same market.
                    </div>

                    <div className="mt-4 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        In this room · {humanCount}
                      </div>
                      <div className="space-y-1.5">
                        {humans.map((h) => (
                          <div key={h.id} className="flex items-center gap-2 text-sm">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
                            <span className="truncate">{h.name}</span>
                          </div>
                        ))}
                      </div>
                      {humanCount === 1 && (
                        <div className="mt-2 text-xs text-amber-400/90">
                          Only you so far — send the invite link and have them open it fresh.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-1">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Instrument</span>
                      {instrumentPicker}
                      <span className="h-4 text-xs text-slate-500">
                        {instrumentLoading
                          ? "Loading market data…"
                          : isHost
                            ? "You pick the market for everyone"
                            : "Set by the host"}
                      </span>
                    </div>

                    <button
                      onClick={copyInvite}
                      className="mt-3 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      {copied ? "✓ Invite link copied" : "Copy invite link"}
                    </button>
                    {isHost ? (
                      <button
                        onClick={start}
                        disabled={instrumentLoading}
                        className="mt-4 rounded-lg bg-emerald-500 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        ▶ Start 3-minute race
                      </button>
                    ) : (
                      <div className="mt-4 text-sm text-slate-500">Waiting for the host to start…</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop controls + stats */}
          <div className="hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:block">
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={controls.long}
                disabled={!running}
                className="rounded-lg bg-emerald-600 py-3 font-bold hover:bg-emerald-500 disabled:opacity-40"
              >
                Long <span className="opacity-60">(B)</span>
              </button>
              <button
                onClick={controls.short}
                disabled={!running}
                className="rounded-lg bg-rose-600 py-3 font-bold hover:bg-rose-500 disabled:opacity-40"
              >
                Short <span className="opacity-60">(S)</span>
              </button>
              <button
                onClick={controls.close}
                disabled={!running}
                className="rounded-lg bg-slate-700 py-3 font-bold hover:bg-slate-600 disabled:opacity-40"
              >
                Close <span className="opacity-60">(C)</span>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <Stat label="Balance" value={money(me.balance)} />
              <Stat
                label="Open P&L"
                value={`${me.unrealized >= 0 ? "+" : ""}${money(me.unrealized)}`}
                tone={me.unrealized >= 0 ? "up" : "down"}
              />
              <Stat
                label="Position"
                value={me.position ? `${me.position.side.toUpperCase()} @ ${me.position.entry.toFixed(2)}` : "Flat"}
              />
              <Stat label="Trades" value={`${me.trades}`} />
            </div>
          </div>

          {/* Mobile compact stats strip */}
          <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs lg:hidden">
            <Stat label="Balance" value={money(me.balance)} />
            <Stat
              label="Open P&L"
              value={`${me.unrealized >= 0 ? "+" : ""}${money(me.unrealized)}`}
              tone={me.unrealized >= 0 ? "up" : "down"}
            />
            <Stat label="Position" value={me.position ? me.position.side.toUpperCase() : "Flat"} />
            <Stat label="Trades" value={`${me.trades}`} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-300">
              Live race
              {myRank > 0 && <span className="ml-2 font-normal text-slate-500">you are #{myRank} of {humanCount}</span>}
            </h2>
            <div className="space-y-1.5">
              {snapshot.leaderboard.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 ${
                    r.isMe
                      ? "border-emerald-500/60 bg-emerald-500/5"
                      : r.isBot
                        ? "border-slate-800 bg-slate-800/30"
                        : "border-slate-700/60 bg-slate-800/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 font-mono text-xs text-slate-500">#{i + 1}</span>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    {r.isBot && <span className="shrink-0 text-[10px] uppercase text-slate-600">bot</span>}
                    {r.side && (
                      <span
                        className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold uppercase ${
                          r.side === "long" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {r.side}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm tabular-nums">{money(r.equity)}</div>
                    <div className={`font-mono text-xs tabular-nums ${pct(r.returnPct) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pct(r.returnPct) >= 0 ? "+" : ""}
                      {pct(r.returnPct).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
            Everyone in this room trades the <span className="text-slate-300">same seeded market</span> in a{" "}
            <span className="text-slate-300">3-minute wall-clock race</span> — synchronized so it&apos;s fair between
            human traders and bots.
          </div>
        </aside>
      </main>

      {finished && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" data-testid="mp-game-over">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">3-minute race over</p>
              <h2 className="mt-1 text-3xl font-extrabold text-slate-100">
                {overallRank === 1 ? "You won the race!" : `You finished ${ORDINAL[overallRank] ?? `#${overallRank}`}`}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {ORDINAL[overallRank] ?? `#${overallRank}`} of {totalRacers} · #{myRank} among traders
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat
                label="Return"
                value={`${me.returnPct >= 0 ? "+" : ""}${me.returnPct.toFixed(1)}%`}
                tone={me.returnPct >= 0 ? "up" : "down"}
              />
              <Stat
                label="Equity"
                value={money(me.equity)}
                tone={me.returnPct >= 0 ? "up" : "down"}
              />
              <Stat label="Trades" value={`${me.trades}`} />
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Final standings</p>
              <div className="space-y-1">
                {snapshot.leaderboard.map((r, i) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between rounded px-2 py-1 text-sm ${
                      r.isMe ? "bg-emerald-500/10" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-4 font-mono text-xs text-slate-500">{i + 1}</span>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                      <span className={`truncate ${r.isMe ? "font-bold text-emerald-300" : "text-slate-300"}`}>
                        {r.name}
                      </span>
                      {r.isBot && <span className="text-[10px] uppercase text-slate-600">bot</span>}
                    </div>
                    <span className={`font-mono tabular-nums ${r.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.returnPct >= 0 ? "+" : ""}
                      {r.returnPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={onLeave}
                className="flex-1 rounded-lg border border-slate-700 py-3 font-semibold text-slate-200 hover:bg-slate-800"
              >
                Leave room
              </button>
              <Link
                href="/community"
                className="flex-1 rounded-lg border border-sky-500/60 bg-sky-500/10 py-3 text-center font-semibold text-sky-300 hover:bg-sky-500/20"
              >
                Community gallery
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky trade bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-2 border-t border-slate-800 bg-slate-900/95 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button
          onClick={controls.long}
          disabled={!running}
          className="rounded-lg bg-emerald-600 py-3.5 text-base font-bold active:bg-emerald-500 disabled:opacity-40"
        >
          Long
        </button>
        <button
          onClick={controls.close}
          disabled={!running}
          className="rounded-lg bg-slate-700 py-3.5 text-base font-bold active:bg-slate-600 disabled:opacity-40"
        >
          Close
        </button>
        <button
          onClick={controls.short}
          disabled={!running}
          className="rounded-lg bg-rose-600 py-3.5 text-base font-bold active:bg-rose-500 disabled:opacity-40"
        >
          Short
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`font-mono tabular-nums ${
          tone === "up" ? "text-emerald-400" : tone === "down" ? "text-rose-400" : "text-slate-200"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
