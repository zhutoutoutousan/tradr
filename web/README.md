# Tradr - Trading You vs Trading Bots (Web)

A real-time browser trading game. You trade a live market on a TradingView-style
candlestick chart while a cluster of algorithmic bots - using strategies ported
straight from the MT5 `cluster-latest` expert advisor - trade the same feed and
compete with you on a live leaderboard.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Canvas-rendered candlestick chart (no external charting lib)
- Stripe Checkout (subscription) for "Pro" registration

## Getting started

```bash
cd web
npm install
copy .env.local.example .env.local   # then fill in your Stripe keys
npm run dev
```

Open http://localhost:3000.

- `/`         landing page
- `/play`     the game
- `/register` Stripe checkout for Pro

## Gameability

| Action        | Key     |
| ------------- | ------- |
| Long (buy)    | B       |
| Short (sell)  | S       |
| Close         | C       |
| Pause/resume  | Space   |
| Fast-forward  | F       |
| Speed 1x-20x  | 1-4     |

Speeds: 1x, 2x, 5x, 20x.

## Real historical data

The game can replay 5 years of real daily OHLC for forex majors, gold, bitcoin
and US stocks (the markets the `cluster-latest` EA trades). Pick a symbol from
the dropdown on `/play`; "Random (synthetic)" stays available too.

Data is fetched from Yahoo Finance (no API key) and cached as JSON in
`public/data/`:

```bash
npm run fetch-data   # refresh public/data/*.json + index.json
```

`HistoricalMarket` (`src/lib/sim/historical.ts`) replays each real candle over
several intra-bar ticks (tracing open -> low/high -> close) so the chart animates
smoothly and intra-bar stop/target fills behave realistically, while committing
the exact real OHLC to history so the bots indicators read true data.

## The bots (`src/lib/sim/strategies.ts`)

Ported from `cluster-latest/Strategies/*.mqh`:

- RSI Scalper  - RSIScalpingStrategy.mqh. Buys RSI crossing back out of oversold,
  sells out of overbought; exits at an RSI target or after staying against the
  position for N bars.
- Darvas Box   - DarvasBoxStrategy.mqh. Detects consolidation boxes and trades
  volume-confirmed breakouts.
- EMA Slope    - EMASlopeDistanceStrategy.mqh. Arms when price stretches from a
  sloping EMA, trades the trend, exits on the cross-back.

## Architecture

```
src/lib/sim/
  rng.ts          deterministic seedable PRNG (mulberry32) + gaussian
  market.ts       synthetic OHLC price/candle generator (IMarket)
  historical.ts   real-data replay feed (IMarket)
  indicators.ts   RSI / EMA / ATR
  strategies.ts   the three ported bot strategies
  engine.ts       GameEngine: market + player + bots, positions, P&L, stops
src/hooks/useGame.ts   rAF game loop + React snapshots
src/components/        CandleChart, GameView, TraderCard
src/app/               landing, /play, /register, /api/checkout
scripts/fetch-data.mjs historical data importer (Yahoo Finance)
```

## Stripe configuration

Set these in `.env.local` (publishable key is browser-safe; keep the secret key
server-side only):

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_...
STRIPE_PRICE_ID=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Without `STRIPE_SECRET_KEY` the app still runs and the checkout endpoint returns
a clear "not configured" message. Never commit a real secret key (`.env*` is
gitignored).

## Roadmap

- Online multiplayer (shared market seed / rooms)
- Persisted accounts + global leaderboards (Pro tier)
- More markets, timeframes and intraday data
- Steam desktop build - see ../STEAM_PLAN.md