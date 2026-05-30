import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold tracking-tight text-emerald-400">◆ Tradr</span>
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <Link href="/play" className="rounded-md bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400">
            Play now
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center">
        <p className="mb-3 inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          Trading You vs Trading Bots
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Outtrade the <span className="text-emerald-400">algorithms</span> in real time.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
          Tradr drops you into a live, fast-moving market on a TradingView-style chart. On the other side of the
          tape, a cluster of trading bots — running the exact strategies from a real MT5 expert advisor — fight for
          the top of the leaderboard. Can you beat them?
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/play"
            className="rounded-lg bg-emerald-500 px-6 py-3 text-lg font-bold text-slate-950 hover:bg-emerald-400"
          >
            ▶ Play free
          </Link>
          <a
            href="#pricing"
            className="rounded-lg border border-slate-700 px-6 py-3 text-lg font-semibold text-slate-200 hover:bg-slate-800"
          >
            Save your progress
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature
            title="Live market sim"
            body="A synthetic price engine generates trends, consolidations and volatility — candle by candle, in real time."
          />
          <Feature
            title="Bots that really trade"
            body="RSI scalping, Darvas box breakouts and EMA slope strategies ported straight from the cluster-latest EA."
          />
          <Feature
            title="Full gameability"
            body="Fast-forward up to 20×, pause, and trade with one-key shortcuts. Master the markets at your own pace."
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-3xl font-bold">Save your progress</h2>
        <p className="mt-2 text-center text-slate-400">
          Play free in your browser. Register and unlock Pro to save runs, climb global leaderboards and unlock more bots.
        </p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
          <PlanCard
            name="Free"
            price="$0"
            features={["Full game", "All 3 bots", "Local progress only"]}
            cta="Play now"
            href="/play"
            highlight={false}
          />
          <PlanCard
            name="Pro"
            price="$9"
            features={["Saved progress & stats", "Global leaderboards", "Future bots & markets", "Multiplayer (coming soon)"]}
            cta="Register & upgrade"
            href="/register"
            highlight
          />
        </div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-8 text-center text-sm text-slate-500">
        Tradr — a trading game. Coming to Steam: <span className="text-slate-300">Trading You VS Trading Bots</span>.
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="mb-2 text-lg font-semibold text-emerald-400">{title}</h3>
      <p className="text-sm text-slate-400">{body}</p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  cta,
  href,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight ? "border-emerald-500 bg-emerald-500/5" : "border-slate-800 bg-slate-900/50"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-bold">{name}</h3>
        <div className="text-3xl font-extrabold">
          {price}
          <span className="text-base font-normal text-slate-500">{name === "Pro" ? "/mo" : ""}</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-6 block rounded-lg py-2.5 text-center font-semibold ${
          highlight ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-slate-800 hover:bg-slate-700"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
