# website (Next.js app in `web/` — run: `cd web && npm install && npm run dev`)

## Features
- [x] A home page with real time game in which you can trade stocks and stuffs like TradingView but on another split screen trading bots are trading just like the cluster-latest logic in there. (`/play` — canvas chart + leaderboard with RSI/Darvas/EMA bots ported from `cluster-latest/Strategies/*`; plays on **real 5y daily history** for EUR/USD, GBP/USD, USD/JPY, AUD/USD, Gold, BTC, AAPL/MSFT/NVDA/TSLA via `npm run fetch-data`, or a synthetic feed)
- [x] Stripe  --> PUBLIC API key: pk_live_51N99JsEfawZzu7YhUbVYGDBYUk77WbVsVWvBEYU0DNP6uQcuNiwqGnlVT7YWJ69svRG8LqcWI01HnYLLVacfuYou00Toq24xNF  --> to register and pay for the game so progress gets saved (`/register` + `/api/checkout`; add `STRIPE_SECRET_KEY` to `web/.env.local` to go live)
- [x] Gameability: Fast forward, keyboard shortcuts etc. (1x/2x/5x/20x speeds, pause, B/S/C/Space/F/1-4 shortcuts; mobile MT5-style layout with sticky Long/Close/Short bar; desktop mouse trading: left-click=buy, right-click=sell, middle-click=close)
- [x] Online muti-player mode (`/multiplayer` — Supabase Realtime rooms; everyone in a room trades the same clock-synced seeded market vs each other and the 6 bots)

# Steam
Trading You VS trading bots — phased plan in `STEAM_PLAN.md` (reuses the shared TS sim core via a Tauri/Electron shell + Steamworks).

