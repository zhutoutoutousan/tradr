"use client";

const STEPS = [
  {
    title: "Welcome to Tradr",
    body: "Each round is a 3-minute race against roguelike trading bots. Every game rolls a random instrument, timeframe, and indicator set — read the chart, trade fast, and climb the ELO ladder.",
  },
  {
    title: "Random market setup",
    body: "You might get EUR/USD on 15m with EMA + RSI, or Bitcoin on 1H with MACD + Bollinger bands. The timeframe changes how fast candles form; indicators are drawn on the chart to help you read price action.",
  },
  {
    title: "Keyboard controls",
    body: "B = Long · S = Short · C = Close position · Space = pause · 1–4 = speed (1x–20x). Power-ups: Q Freeze bots · W 2× leverage · E Insider tip · R Slow-mo · T Hedge shield.",
  },
  {
    title: "Mouse controls (desktop)",
    body: "Left-click the chart to go long. Right-click closes your open trade — it will not flip you into a short. Middle-click opens a short. Use close instead of clicking the opposite side.",
  },
  {
    title: "Win the round",
    body: "Beat as many bots as you can before the timer hits zero. Review your trades afterward, save runs when registered, and hit Play again for a fresh random setup.",
  },
];

export default function TutorialModal({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">Tutorial</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-100">How to play Tradr</h1>
        <p className="mt-2 text-sm text-slate-400">
          Quick guide before your first round. You can reopen this anytime from the menu.
        </p>

        <ol className="mt-5 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                {i + 1}
              </span>
              <div>
                <div className="font-semibold text-slate-100">{s.title}</div>
                <p className="mt-0.5 text-sm text-slate-400">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <button
          data-testid="tutorial-start"
          onClick={onStart}
          className="mt-6 w-full rounded-lg bg-emerald-500 py-3.5 text-base font-bold text-slate-950 hover:bg-emerald-400"
        >
          Start trading
        </button>
      </div>
    </div>
  );
}
