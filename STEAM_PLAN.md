# Steam Game Plan - "Trading You VS Trading Bots"

The web game (`/web`) is phase 1. The Steam release is phase 2: a packaged
desktop game built on the SAME simulation core so we never rewrite the trading
logic.

## Strategy: share the core, swap the shell

The entire game logic lives in framework-agnostic TypeScript under
`web/src/lib/sim/` (market, indicators, strategies, engine). The Steam build
reuses that core verbatim and only replaces the presentation/shell layer.

    [ Shared sim core (TS): market - indicators - strategies - engine ]
                 |                                 |
                 v                                 v
        Next.js web app                   Desktop (Steam) app
        (phase 1, done)                   (phase 2)

## Recommended path: Tauri or Electron wrapper

Reuse the React UI and ship it as a desktop binary.

- Tauri (recommended): tiny binaries, Rust backend, native performance. Bundle
  the existing React front end; use the Rust side for save files and the
  Steamworks bridge.
- Electron: heavier but maximum ecosystem support and the most mature Steam
  integration examples.

Either way the `sim` core is imported unchanged.

## Steamworks integration (via steamworks.js)

- Achievements: "Beat all bots", "+100% in a run", "100-trade streak"
- Leaderboards: best run return %, longest survival, head-to-head bot wins
- Cloud saves: player progress, unlocked bots, settings
- Rich presence: "Currently up 34% vs the bots"
- Steam Input: controller bindings for long/short/close/fast-forward

## Feature roadmap for the Steam build

1. Campaign / progression - unlock harder bot rosters and new markets (the
   existing strategies become "opponents" with tunable aggression).
2. Scenario mode - historical-style setups (crash, melt-up, chop) seeded via the
   deterministic RNG so runs are shareable by seed.
3. Endless / survival - trade until liquidation; score = peak equity.
4. Local + online multiplayer - same seed across clients; compare your fills
   against friends and the bots in real time.
5. Bot lab - let players tweak strategy parameters and watch them compete.

## Milestones

- M1 - Extract `sim` into a standalone package consumed by both web and desktop.
- M2 - Tauri shell wrapping the React UI; native window, save files.
- M3 - Steamworks: achievements + cloud saves + one leaderboard.
- M4 - Campaign + scenario modes; Steam store page + Wishlist.
- M5 - Online multiplayer; Early Access launch.

## Why this ordering works

Shipping the web game first validates the core loop ("can you beat the bots?")
with zero install friction, builds a wishlist audience, and de-risks the Steam
build since the trading simulation is already proven in production.