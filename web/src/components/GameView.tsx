"use client";

import { useEffect, useMemo, useState } from "react";
import CandleChart from "@/components/CandleChart";
import TraderCard from "@/components/TraderCard";
import PowerupBar from "@/components/PowerupBar";
import GameOverModal from "@/components/GameOverModal";
import MenuModal from "@/components/MenuModal";
import ReviewModal from "@/components/ReviewModal";
import type { RoundReview } from "@/lib/game/reviews";
import { useGame, type GameConfig, type RoundResult } from "@/hooks/useGame";
import { useIsMobile } from "@/hooks/useIsMobile";
import { loadProfile } from "@/lib/game/profile";
import type { PowerupId } from "@/lib/game/powerups";
import { instrumentLabel, type RoundSetup } from "@/lib/game/roundSetup";

export interface MarketOption {
  id: string;
  name: string;
  kind: string;
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function clock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const POWERUP_KEYS: Record<string, PowerupId> = {
  q: "freeze",
  w: "leverage",
  e: "tip",
  r: "slowmo",
  t: "shield",
};

export default function GameView({
  config,
  setup,
  markets,
  replayBanner,
  onReplay,
  onRoundEnd,
  onContinue,
  onOpenTutorial,
}: {
  config: GameConfig;
  setup: RoundSetup;
  markets: MarketOption[];
  replayBanner?: string;
  onReplay: () => void;
  onRoundEnd?: (result: RoundResult) => void;
  onContinue?: () => void;
  onOpenTutorial?: () => void;
}) {
  const { snapshot, running, speed, speedIdx, speeds, timeLeftMs, gameOver, result, powerups, controls } =
    useGame(config, markets);
  const isMobile = useIsMobile();
  const chartHeight = 440;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<RoundReview | null>(null);
  const [elo, setElo] = useState<number | null>(null);

  useEffect(() => {
    setElo(loadProfile().elo);
  }, []);
  useEffect(() => {
    if (result) {
      setElo(result.eloAfter);
      onRoundEnd?.(result);
    }
  }, [result, onRoundEnd]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) return;
      if (menuOpen || gameOver) return;
      const key = e.key.toLowerCase();
      if (POWERUP_KEYS[key]) {
        controls.activatePowerup(POWERUP_KEYS[key]);
        return;
      }
      switch (key) {
        case "b":
          controls.long();
          break;
        case "s":
          controls.short();
          break;
        case "c":
          controls.close();
          break;
        case " ":
          e.preventDefault();
          controls.togglePause();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          controls.setSpeedIdx(Number(e.key) - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controls, menuOpen, gameOver]);

  const leaderboard = useMemo(() => {
    if (!snapshot) return [];
    return [snapshot.player, ...snapshot.bots].sort((a, b) => b.equity - a.equity);
  }, [snapshot]);

  const botPositions = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.bots
      .filter((b) => b.position)
      .map((b) => ({
        label: b.name.split(" ")[0],
        color: b.color,
        side: b.position!.side,
        entry: b.position!.entry,
      }));
  }, [snapshot]);

  const roundLabel = instrumentLabel(setup.instrumentId, markets);

  if (!snapshot) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading market…</div>;
  }

  const p = snapshot.player;
  const playerRank = leaderboard.findIndex((t) => t.id === "you") + 1;
  const lowTime = timeLeftMs <= 30_000;

  return (
    <div
      className={`w-full bg-slate-950 text-slate-100 ${isMobile ? "flex h-[100dvh] flex-col overflow-hidden" : "min-h-screen"}`}
    >
      <header
        className={`z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 backdrop-blur ${
          isMobile ? "" : "sticky top-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} className="font-bold tracking-tight text-emerald-400 hover:text-emerald-300">
            ◆ Tradr
          </button>
          {elo !== null && (
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300">
              ELO {elo}
            </span>
          )}
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm font-medium text-slate-200">
            {roundLabel}
          </span>
          <span className="rounded-md border border-slate-700/80 bg-slate-800/80 px-2 py-1 font-mono text-xs text-slate-300">
            {setup.timeframeLabel}
          </span>
          {replayBanner && (
            <span className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-200">
              {replayBanner}
            </span>
          )}
          <span className="hidden text-xs text-slate-500 sm:inline">
            bar {snapshot.bar}
            {snapshot.date ? ` · ${snapshot.date}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${
              lowTime ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-200"
            }`}
          >
            ⏱ {clock(timeLeftMs)}
          </span>
          <button
            onClick={controls.togglePause}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700"
          >
            {running ? "❚❚" : "▶"}
          </button>
          <div className="flex items-center overflow-hidden rounded-md border border-slate-700">
            {speeds.map((s, i) => (
              <button
                key={s}
                onClick={() => controls.setSpeedIdx(i)}
                className={`px-2.5 py-1.5 text-sm font-mono ${
                  speedIdx === i ? "bg-emerald-500 text-slate-950" : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            title="Menu"
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700"
          >
            ☰
          </button>
        </div>
      </header>

      <main
        className={
          isMobile
            ? "flex min-h-0 w-full flex-1 flex-col gap-3 px-3 pb-[4.75rem] pt-3"
            : "grid w-full grid-cols-[1fr_360px] gap-4 p-3 sm:p-4"
        }
      >
        <section className={isMobile ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-4"}>
          <div
            className={`rounded-xl border border-slate-800 bg-slate-900/60 p-2 sm:p-3 ${
              isMobile ? "flex min-h-0 flex-1 flex-col" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <div className="text-sm font-semibold">{snapshot.label}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl tabular-nums sm:text-2xl">
                    {snapshot.price.toFixed(snapshot.price < 10 ? 4 : 2)}
                  </span>
                  {snapshot.tip !== 0 && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        snapshot.tip > 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {snapshot.tip > 0 ? "▲ tip" : "▼ tip"}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Your equity</div>
                <div className="font-mono text-lg tabular-nums sm:text-xl">{money(p.equity)}</div>
                <div className={`font-mono text-sm ${p.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {p.returnPct >= 0 ? "+" : ""}
                  {p.returnPct.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5 px-1">
              {setup.indicators.map((ind) => (
                <span
                  key={ind.label}
                  className="rounded border border-slate-700/80 px-1.5 py-0.5 font-mono text-[10px]"
                  style={{ color: ind.color }}
                >
                  {ind.label}
                </span>
              ))}
            </div>
            <div className={isMobile ? "min-h-0 flex-1" : undefined}>
              <CandleChart
                candles={snapshot.candles}
                position={p.position}
                botPositions={botPositions}
                indicators={setup.indicators}
                height={chartHeight}
                fill={isMobile}
                enableMouseTrading={!isMobile}
                onBuy={controls.long}
                onSell={controls.short}
                onClose={controls.close}
              />
            </div>
          </div>

          {/* Power-ups */}
          <div className={`shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3 ${isMobile ? "py-2" : ""}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-slate-300">Power-ups</span>
              {snapshot.shieldArmed && <span className="text-xs text-pink-300">Shield armed</span>}
            </div>
            <PowerupBar powerups={powerups} onActivate={controls.activatePowerup} disabled={gameOver} />
          </div>

          {/* Desktop controls + stats card */}
          {!isMobile && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="grid grid-cols-3 gap-3">
              <button onClick={controls.long} className="rounded-lg bg-emerald-600 py-3 font-bold hover:bg-emerald-500">
                Long <span className="opacity-60">(B)</span>
              </button>
              <button onClick={controls.short} className="rounded-lg bg-rose-600 py-3 font-bold hover:bg-rose-500">
                Short <span className="opacity-60">(S)</span>
              </button>
              <button onClick={controls.close} className="rounded-lg bg-slate-700 py-3 font-bold hover:bg-slate-600">
                Close <span className="opacity-60">(C)</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <Stat label="Balance" value={money(p.balance)} />
              <Stat
                label="Open P&L"
                value={`${p.unrealized >= 0 ? "+" : ""}${money(p.unrealized)}`}
                tone={p.unrealized >= 0 ? "up" : "down"}
              />
              <Stat
                label="Position"
                value={p.position ? `${p.position.side.toUpperCase()} @ ${p.position.entry.toFixed(2)}` : "Flat"}
              />
              <Stat label="Trades" value={`${p.trades}`} />
            </div>
          </div>
          )}

          {/* Mobile compact stats strip */}
          {isMobile && (
          <div className="grid shrink-0 grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs">
            <Stat label="Balance" value={money(p.balance)} />
            <Stat
              label="Open P&L"
              value={`${p.unrealized >= 0 ? "+" : ""}${money(p.unrealized)}`}
              tone={p.unrealized >= 0 ? "up" : "down"}
            />
            <Stat label="Position" value={p.position ? p.position.side.toUpperCase() : "Flat"} />
            <Stat label="Trades" value={`${p.trades}`} />
          </div>
          )}

          {!isMobile && (
          <p className="text-center text-xs text-slate-500">
            Mouse: left-click long · right-click close (no flip) · middle-click short · or{" "}
            <kbd>B</kbd>/<kbd>S</kbd>/<kbd>C</kbd> · <kbd>Space</kbd> pause · speed 1–4 ·{" "}
            <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd><kbd>T</kbd> power-ups
          </p>
          )}
        </section>

        {!isMobile && (
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-300">
              Leaderboard
              <span className="ml-2 font-normal text-slate-500">you are #{playerRank}</span>
            </h2>
            <div className="space-y-2">
              {leaderboard.map((t, i) => (
                <TraderCard key={t.id} t={t} rank={i + 1} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
            <p className="mb-1 font-semibold text-slate-300">The field</p>
            <p>
              Every round spawns a fresh set of roguelike bots — RSI scalpers, EMA and MACD trend traders, Bollinger
              faders and Donchian breakers — with randomly rolled parameters and leverage, matched to your ELO. Beat
              them in the 3-minute race to climb the ladder.
            </p>
          </div>
        </aside>
        )}
      </main>

      {/* Mobile sticky trade bar */}
      {isMobile && (
      <div className="fixed inset-x-0 bottom-0 z-20 grid w-full grid-cols-3 gap-2 border-t border-slate-800 bg-slate-900/95 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          data-testid="trade-long"
          onClick={controls.long}
          className="rounded-lg bg-emerald-600 py-3.5 text-base font-bold active:bg-emerald-500"
        >
          Long
        </button>
        <button
          data-testid="trade-close"
          onClick={controls.close}
          className="rounded-lg bg-slate-700 py-3.5 text-base font-bold active:bg-slate-600"
        >
          Close
        </button>
        <button
          data-testid="trade-short"
          onClick={controls.short}
          className="rounded-lg bg-rose-600 py-3.5 text-base font-bold active:bg-rose-500"
        >
          Short
        </button>
      </div>
      )}

      {menuOpen && (
        <MenuModal
          onClose={() => setMenuOpen(false)}
          onOpenTutorial={
            onOpenTutorial
              ? () => {
                  setMenuOpen(false);
                  onOpenTutorial();
                }
              : undefined
          }
          onOpenReview={(r) => {
            setMenuOpen(false);
            setReviewOpen(r);
          }}
        />
      )}
      {gameOver && result && !reviewOpen && !menuOpen && (
        <GameOverModal
          result={result}
          onReplay={onReplay}
          onMenu={() => setMenuOpen(true)}
          onReview={() => setReviewOpen(result.review)}
          onContinue={onContinue}
        />
      )}
      {reviewOpen && <ReviewModal review={reviewOpen} onClose={() => setReviewOpen(null)} />}
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
