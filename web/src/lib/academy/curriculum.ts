/**
 * Tradr Academy curriculum — quant trading + AI-agent tracks.
 * Lessons teach concepts and point into Story Mode / Bot Factory.
 * Deliberately does NOT include WorldQuant Alpha101 paper formulas.
 */

import { QUANT26_LESSONS, QUANT26_TRACK } from "./quant2026";

export type TrackId =
  | "foundations"
  | "signals"
  | "alpha-craft"
  | "agents"
  | "campaign"
  | "desk"
  | "meta"
  | "quant26";

export type LessonKind = "read" | "quiz" | "lab" | "play";

export interface QuizChoice {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: QuizChoice[];
  explain: string;
}

export interface LessonSection {
  heading?: string;
  body: string;
  /** Optional lexicon unit ids for dual-subtitle cards under this section */
  polyglotIds?: string[];
}

export interface AcademyLesson {
  id: string;
  trackId: TrackId;
  order: number;
  title: string;
  summary: string;
  minutes: number;
  kind: LessonKind;
  /** Teaching body */
  sections: LessonSection[];
  quiz?: QuizQuestion[];
  /** Deep links */
  labTemplate?: string;
  storyLevelId?: string;
  botLabHref?: string;
  /** XP granted once on first completion */
  xp: number;
  unlocks?: string[];
  /** QUANT_LEXICON topic tags for the lesson bilingual strip */
  polyglotTopics?: string[];
  /** Explicit lexicon unit ids (overrides / extends topics) */
  polyglotIds?: string[];
}

export interface AcademyTrack {
  id: TrackId;
  title: string;
  blurb: string;
  accent: string;
  icon: string;
  /** Optional gate: prior track must have N lessons done */
  requires?: { trackId: TrackId; lessons: number };
}

export const TRACKS: AcademyTrack[] = [
  {
    id: "foundations",
    title: "Market Foundations",
    blurb: "P&L, risk, and how a Tradr race actually scores you.",
    accent: "text-emerald-300",
    icon: "📈",
  },
  {
    id: "signals",
    title: "Signals & Indicators",
    blurb: "RSI, EMA, MACD, bands — the language of the built-in bots.",
    accent: "text-sky-300",
    icon: "📡",
    requires: { trackId: "foundations", lessons: 2 },
  },
  {
    id: "alpha-craft",
    title: "Alpha Craft",
    blurb: "Write formula strategies, backtest them, iterate like a desk.",
    accent: "text-fuchsia-300",
    icon: "α",
    requires: { trackId: "signals", lessons: 2 },
  },
  {
    id: "agents",
    title: "AI Agents for Trading",
    blurb: "Bots as agents: tools, loops, evaluation, and failure modes.",
    accent: "text-amber-300",
    icon: "🤖",
    requires: { trackId: "alpha-craft", lessons: 1 },
  },
  {
    id: "campaign",
    title: "Story Campaign",
    blurb: "Put it on the line — Story & Challenge levels from Academy.",
    accent: "text-violet-300",
    icon: "🗺️",
    requires: { trackId: "foundations", lessons: 1 },
  },
  {
    id: "desk",
    title: "Quant Desk",
    blurb: "Learning Planet — interview probes, desk books, market-making research.",
    accent: "text-rose-300",
    icon: "🪐",
    requires: { trackId: "foundations", lessons: 1 },
  },
  {
    id: "meta",
    title: "Meta Learning",
    blurb: "形而上学习 — how to read papers, learn knowledge, and study quant bilingually.",
    accent: "text-cyan-300",
    icon: "◇",
    requires: { trackId: "foundations", lessons: 1 },
  },
  QUANT26_TRACK,
];

const CORE_LESSONS: AcademyLesson[] = [
  // ── Foundations ─────────────────────────────────────────────
  {
    id: "fnd-01-race",
    trackId: "foundations",
    order: 1,
    title: "What is a Tradr race?",
    summary: "3-minute play-time, equity leaderboard, bots as rivals.",
    minutes: 4,
    kind: "read",
    xp: 40,
    polyglotTopics: ["evaluation"],
    sections: [
      {
        heading: "The arena",
        body: "A Tradr race is a short, scored duel against a field of bots. Your equity (cash + mark-to-market of open positions) is what ranks you. The clock is play-time — it pauses when the round is paused.",
      },
      {
        heading: "Why it feels like trading",
        body: "Fills happen in the engine the same way as our backtester: decisions on bar close, exposure as a multiple of balance, and optional stops. You are training decision quality under time pressure, not memorizing a chart.",
      },
      {
        heading: "Guest vs account",
        body: "You can race as a guest. Academy, Bot Factory, and cloud XP history need an account — so progress compounds across devices later.",
      },
    ],
  },
  {
    id: "fnd-02-pnl",
    trackId: "foundations",
    order: 2,
    title: "P&L, equity, and drawdown",
    summary: "Balance vs equity; why drawdown kills rankings.",
    minutes: 5,
    kind: "quiz",
    xp: 60,
    polyglotTopics: ["evaluation"],
    polyglotIds: ["sharpe"],
    sections: [
      {
        heading: "Balance vs equity",
        body: "Balance is settled cash after closed trades. Equity marks your open position to the current price. The leaderboard uses equity — a green open trade can put you first before you close it.",
      },
      {
        heading: "Drawdown",
        body: "Peak-to-trough equity drop is drawdown. Big leverage swings look exciting until a stop or gap erases the session. Story Mode later rewards staying green (no_loss objectives).",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "What does the race leaderboard rank on?",
        choices: [
          { id: "a", text: "Number of trades", correct: false },
          { id: "b", text: "Equity (cash + open P&L)", correct: true },
          { id: "c", text: "Closed-trade win rate only", correct: false },
        ],
        explain: "Standings sort by equity so open positions count.",
      },
      {
        id: "q2",
        prompt: "You are up on an open long, then price dumps through your entry. Equity…",
        choices: [
          { id: "a", text: "Stays frozen until you close", correct: false },
          { id: "b", text: "Marks down immediately", correct: true },
          { id: "c", text: "Only changes at bar open", correct: false },
        ],
        explain: "Mark-to-market updates continuously with the tape.",
      },
    ],
  },
  {
    id: "fnd-03-risk",
    trackId: "foundations",
    order: 3,
    title: "Risk: size, stops, time",
    summary: "Exposure, stop-loss, and why 3 minutes changes the game.",
    minutes: 5,
    kind: "read",
    xp: 50,
    sections: [
      {
        heading: "Exposure",
        body: "Position size is a multiple of balance. Higher exposure amplifies both return and drawdown. Bots roll their own exposure; you choose when to press.",
      },
      {
        heading: "Stops & targets",
        body: "Formula bots can declare slPct / tpPct. In a race, discretionary traders use shield / freeze powerups later — but the principle is the same: pre-commit an invalidation.",
      },
      {
        heading: "Time is a risk factor",
        body: "A 60s Story level forces fewer decisions. A 180s Challenge lets trends develop. Match horizon to edge — or your edge evaporates into noise.",
      },
    ],
  },
  {
    id: "fnd-04-first-trade",
    trackId: "foundations",
    order: 4,
    title: "Practice: first Story level",
    summary: "Play Story 1 — complete a trade and bank a small profit.",
    minutes: 8,
    kind: "play",
    xp: 80,
    storyLevelId: "story-1-basics",
    sections: [
      {
        heading: "Mission",
        body: "Open Story Campaign → Trading Basics. Objectives: make at least one trade and earn about $100. One star unlocks the next lesson path; chase three stars when you are ready.",
      },
      {
        heading: "Tips",
        body: "Do not overtrade. One clean long or short with a plan beats five random flips. Watch the bot names — they telegraph style (RSI, trend, bands).",
      },
    ],
  },

  // ── Signals ─────────────────────────────────────────────────
  {
    id: "sig-01-ema",
    trackId: "signals",
    order: 1,
    title: "Trend with EMAs",
    summary: "Fast/slow crosses — the Trend Rider idea.",
    minutes: 6,
    kind: "lab",
    xp: 70,
    labTemplate: "trend",
    botLabHref: "/bots/lab?template=trend",
    polyglotTopics: ["evaluation"],
    sections: [
      {
        heading: "Idea",
        body: "An exponential moving average hugs recent prices more than a simple average. When a fast EMA crosses above a slow EMA, momentum often follows — and the opposite cross flips the bias.",
      },
      {
        heading: "In Tradr formulas",
        body: "You will see patterns like cross_above(ema(close, fast), ema(close, slow)). Parameters (fast/slow/slPct) are rolled for bots and editable in the Lab.",
      },
      {
        heading: "Lab task",
        body: "Open the Trend Rider template in Bot Factory, run a backtest on AAPL or EURUSD, and note Sharpe vs max drawdown. Change slow by ±10 and re-run — feel the trade-off.",
      },
    ],
  },
  {
    id: "sig-02-rsi",
    trackId: "signals",
    order: 2,
    title: "Mean reversion with RSI",
    summary: "Oversold/overbought fades — RSI Scalper.",
    minutes: 6,
    kind: "lab",
    xp: 70,
    labTemplate: "rsi",
    botLabHref: "/bots/lab?template=rsi",
    sections: [
      {
        heading: "Idea",
        body: "RSI compresses recent gains vs losses into 0–100. Extremes can mean exhaustion. Scalpers buy exits from oversold and sell exits from overbought — then bail if RSI stays against them.",
      },
      {
        heading: "Failure mode",
        body: "In strong trends RSI can stay overbought. That is why the built-in bot pairs signals with stops and a 'bars against me' exit.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "RSI mean-reversion works best when…",
        choices: [
          { id: "a", text: "Price is in a quiet range", correct: true },
          { id: "b", text: "A vertical trend day with no pauses", correct: false },
          { id: "c", text: "You ignore stops entirely", correct: false },
        ],
        explain: "Fades need two-sided flow; trends punish them.",
      },
    ],
  },
  {
    id: "sig-03-macd",
    trackId: "signals",
    order: 3,
    title: "MACD momentum",
    summary: "Line vs signal crosses for swing bias.",
    minutes: 5,
    kind: "lab",
    xp: 60,
    labTemplate: "macd",
    botLabHref: "/bots/lab?template=macd",
    sections: [
      {
        heading: "Idea",
        body: "MACD is the gap between two EMAs, smoothed again by a signal line. Crosses capture momentum shifts with more lag than a raw EMA cross — fewer whipsaws, slower entries.",
      },
    ],
  },
  {
    id: "sig-04-bands",
    trackId: "signals",
    order: 4,
    title: "Bands & breakouts",
    summary: "Bollinger fades vs Donchian breakouts.",
    minutes: 7,
    kind: "quiz",
    xp: 80,
    sections: [
      {
        heading: "Two philosophies",
        body: "Bollinger-style bots fade excursions outside a volatility envelope back toward the mid. Donchian-style bots buy strength when price prints a channel high — trend continuation, not fade.",
      },
      {
        heading: "Lab",
        body: "Compare templates bollinger and donchian on the same market. One thrives in chop; the other in expansion. Same data, opposite hypotheses.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "A Donchian breakout long typically enters when…",
        choices: [
          { id: "a", text: "Price is below the lower band", correct: false },
          { id: "b", text: "Price breaks above a recent channel high", correct: true },
          { id: "c", text: "RSI is exactly 50", correct: false },
        ],
        explain: "Breakouts buy strength through the prior high.",
      },
      {
        id: "q2",
        prompt: "You expect a ranging week. Which family fits better?",
        choices: [
          { id: "a", text: "Donchian breakout", correct: false },
          { id: "b", text: "Bollinger / RSI mean reversion", correct: true },
          { id: "c", text: "Max leverage with no stop", correct: false },
        ],
        explain: "Chop favors fades; breakouts get chopped.",
      },
    ],
  },

  // ── Alpha craft ─────────────────────────────────────────────
  {
    id: "alpha-01-dsl",
    trackId: "alpha-craft",
    order: 1,
    title: "The Tradr formula language",
    summary: "Fields, ops, let-bindings — shared by Lab and bots.",
    minutes: 7,
    kind: "read",
    xp: 70,
    sections: [
      {
        heading: "One IR, many UIs",
        body: "Strategies are stored as readable formulas (StrategyDef). A future block editor and the text Lab compile to the same expression tree — so what you type today will round-trip into blocks later.",
      },
      {
        heading: "Fields",
        body: "Use open, high, low, close, volume, returns, price, bar. Windows like ema(close, 20) need a numeric length (or a param name resolved at compile time).",
      },
      {
        heading: "Rules",
        body: "when gates decisions (warmup). long / short fire only while flat. exitLong / exitShort fire for the open side. slPct / tpPct are fractions of entry.",
      },
      {
        heading: "What we do not ship",
        body: "We do not paste proprietary Alpha101 paper formulas into the repo. You learn the operators and craft your own edges — legally clean for a German product.",
      },
    ],
  },
  {
    id: "alpha-02-cross",
    trackId: "alpha-craft",
    order: 2,
    title: "cross_above, streak, delay",
    summary: "Event operators that turn series into triggers.",
    minutes: 6,
    kind: "quiz",
    xp: 70,
    sections: [
      {
        heading: "Events vs levels",
        body: "close > ema(...) is a level (true for many bars). cross_above(a, b) is an event (true on the bar it flips). Strategies usually enter on events and manage on levels.",
      },
      {
        heading: "Memory",
        body: "delay(x, n) shifts a series; streak(condition) counts consecutive trues — useful for 'RSI stuck against me' exits.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Best entry trigger for a golden cross?",
        choices: [
          { id: "a", text: "ema_fast > ema_slow (level)", correct: false },
          { id: "b", text: "cross_above(ema_fast, ema_slow) (event)", correct: true },
          { id: "c", text: "bar == 0", correct: false },
        ],
        explain: "Events fire once; levels stay true and overtrade.",
      },
    ],
  },
  {
    id: "alpha-03-backtest",
    trackId: "alpha-craft",
    order: 3,
    title: "Backtest like you mean it",
    summary: "Next-open fills, fees, train/test mindset.",
    minutes: 6,
    kind: "lab",
    xp: 80,
    labTemplate: "ema",
    botLabHref: "/bots/lab?template=ema",
    polyglotTopics: ["evaluation"],
    polyglotIds: ["overfitting", "sharpe"],
    sections: [
      {
        heading: "Fill model",
        body: "Tradr's backtester decides on the close and fills at the next open — same spirit as the race engine. Stops check the bar range; if both stop and target trade in one bar, stop wins.",
      },
      {
        heading: "Metrics that matter",
        body: "Total return without Sharpe/max DD is a vanity screen. Prefer stable Sharpe, controlled drawdown, and enough trades to believe the sample.",
      },
      {
        heading: "Task",
        body: "In Lab, run EMA Slope on two different markets. If results flip sign, your edge is regime-specific — note it before you promote the bot to a race.",
      },
    ],
  },
  {
    id: "alpha-04-save",
    trackId: "alpha-craft",
    order: 4,
    title: "Save a private bot",
    summary: "Drafts (max 3 private) — then bring them to races later.",
    minutes: 5,
    kind: "lab",
    xp: 60,
    botLabHref: "/bots/lab",
    sections: [
      {
        heading: "Private slots",
        body: "Local drafts currently cap at 3 private bots. Public / cloud save and 'take my bot into a race' land next. Treat slots as a desk — keep what you iterate weekly.",
      },
      {
        heading: "Task",
        body: "Clone a template, rename it, tweak one parameter, backtest, Save. Confirm it appears under My bots.",
      },
    ],
  },

  // ── Agents ──────────────────────────────────────────────────
  {
    id: "agt-01-what",
    trackId: "agents",
    order: 1,
    title: "What is a trading agent?",
    summary: "Goal, tools, loop, memory — bots fit the pattern.",
    minutes: 6,
    kind: "read",
    xp: 70,
    sections: [
      {
        heading: "Agent loop",
        body: "An agent observes state, chooses an action with a policy, and updates from outcomes. A Tradr bot observes OHLCV (+ derived series), outputs long/short/flat, and is scored by equity.",
      },
      {
        heading: "Tools vs brains",
        body: "Indicators and the formula DSL are tools. The policy can be a hand-written formula, an optimized parameter set, or (later) an LLM planning layer that proposes formulas — never silently inventing fills.",
      },
      {
        heading: "Why games help",
        body: "Short races are cheap evaluations. You can hill-climb agents with many seeds before risking reputation on a leaderboard or real capital elsewhere.",
      },
    ],
  },
  {
    id: "agt-02-eval",
    trackId: "agents",
    order: 2,
    title: "Evaluate agents, don't vibe them",
    summary: "Seeds, regimes, overfit — the Academy way.",
    minutes: 6,
    kind: "quiz",
    xp: 80,
    sections: [
      {
        heading: "Multiple seeds",
        body: "One lucky path is not skill. Our strategy tests run builtins across markets and seeds; you should too before crowning a bot.",
      },
      {
        heading: "Train / holdout",
        body: "The optimizer in the strategy engine fits on an early window and reports on the unseen remainder. Copy that habit even when tuning by hand.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "You tuned params until backtest Sharpe hit 4.0 on one ticker. Next step?",
        choices: [
          { id: "a", text: "Ship to production capital tonight", correct: false },
          { id: "b", text: "Re-check on held-out period + other markets/seeds", correct: true },
          { id: "c", text: "Delete all stops to boost return", correct: false },
        ],
        explain: "Out-of-sample and multi-market checks catch overfit.",
      },
    ],
  },
  {
    id: "agt-03-tools",
    trackId: "agents",
    order: 3,
    title: "Toolbelt: Lab, Story, Factory",
    summary: "How Academy surfaces map to an agent workflow.",
    minutes: 5,
    kind: "read",
    xp: 50,
    sections: [
      {
        heading: "Workflow",
        body: "1) Learn a signal in Academy → 2) Encode it in Bot Factory → 3) Backtest → 4) Stress it in Story/Challenge races → 5) Keep or kill. That is an agent development loop with humans in the chair.",
      },
      {
        heading: "Coming next",
        body: "Block editor, parameter search UI, and bringing a saved bot into a live race as your teammate or rival.",
      },
    ],
  },
  {
    id: "agt-04-safety",
    trackId: "agents",
    order: 4,
    title: "Safety & product rules",
    summary: "Data sources, free competition, no mystery alphas.",
    minutes: 5,
    kind: "quiz",
    xp: 60,
    sections: [
      {
        heading: "Product constraints",
        body: "Competition stays free. Pro (later) sells tools and compute — not pay-to-win ELO. R&D feeds (Yahoo / MT5 HCC) stay off production for paying users; races use synthetic or licensed series.",
      },
      {
        heading: "Agents that lie",
        body: "Never let an agent invent market data or silently change fill rules. If it proposes a formula, show it, compile it, and evaluate it with the same engine humans use.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "In Tradr's model, Pro should sell…",
        choices: [
          { id: "a", text: "Higher ELO for a fee", correct: false },
          { id: "b", text: "Tools and compute — races stay free", correct: true },
          { id: "c", text: "Secret paper alphas verbatim", correct: false },
        ],
        explain: "German-friendly: compete free; pay for tooling.",
      },
    ],
  },

  // ── Campaign pointers ───────────────────────────────────────
  {
    id: "camp-01-story",
    trackId: "campaign",
    order: 1,
    title: "Story Mode overview",
    summary: "Five tutorial races with unlocks and stars.",
    minutes: 4,
    kind: "play",
    xp: 40,
    sections: [
      {
        heading: "Path",
        body: "Story 1→5 chains unlocks (freeze, slowmo, leverage, shield). Stars gate later Challenge levels. Open the Story Campaign board to play.",
      },
    ],
  },
  {
    id: "camp-02-challenge",
    trackId: "campaign",
    order: 2,
    title: "Challenge Mode overview",
    summary: "Hard objectives after Story 3+.",
    minutes: 4,
    kind: "play",
    xp: 40,
    sections: [
      {
        heading: "Path",
        body: "Challenges demand precise objectives (few trades, huge returns, gauntlets). Unlock them by clearing Story stars — then climb toward Impossible.",
      },
    ],
  },

  // ── Quant Desk / Learning Planet ────────────────────────────
  {
    id: "desk-01-planet",
    trackId: "desk",
    order: 1,
    title: "Enter the Learning Planet",
    summary: "mindcraft-style KG: domains, papers, drills, library — with SOURCE.",
    minutes: 5,
    kind: "read",
    xp: 50,
    polyglotTopics: ["meta"],
    polyglotIds: ["probe-answer"],
    sections: [
      {
        heading: "学习星球",
        body: "Tradr's Learning Planet is a small teaching ontology inspired by mindcraft-zttts: vertices (domains, concepts, papers, books, drills) and labeled edges (ISA, GROUNDS_IN, APPLIES…). Click a star to inspect CLAIM + SOURCE. The GUI is a skin over the graph — not a note dump.",
      },
      {
        heading: "Study loop",
        body: "PROBE cold → your ANSWER → ASSESS → only then open sources. Interview rails on the Planet follow the same retrieval-first rule. Do not paste proprietary answer banks into the graph.",
      },
      {
        heading: "Open the sky",
        body: "Launch /academy/planet to orbit Market Making, Microstructure, Interview Desk, and the Library. Featured research includes competitive market-making equilibria (arXiv:2610.30891).",
      },
    ],
  },
  {
    id: "desk-02-mm-paper",
    trackId: "desk",
    order: 2,
    title: "Competitive market making (paper star)",
    summary: "Onger & Foscari — PSNE, volatility-scaled spreads, no-regret learning.",
    minutes: 8,
    kind: "read",
    xp: 70,
    polyglotTopics: ["market-making", "microstructure"],
    polyglotIds: ["nash-mm", "bid-ask", "paper-muscle"],
    sections: [
      {
        heading: "Why this paper",
        body: "Equilibria and Learning in Competitive Market Making (arXiv:2610.30891) models N≥2 strategic makers plus one non-strategic informed trader with inelastic demand. Quotes set the mid; the trader buys or sells by comparing fundamental value to that mid.",
      },
      {
        heading: "Takeaways for a Tradr desk",
        body: "(1) Pure-strategy Nash equilibria exist under mild assumptions and give a zero-profit competitive benchmark. (2) For location-scale value distributions, equilibrium spreads widen linearly with volatility — so wider spreads are not automatic proof of collusion. (3) On a price grid, no-internal-regret learners' average play approaches the continuous Nash envelope as tick size vanishes.",
      },
      {
        heading: "How to use it here",
        body: "Open the Planet paper star, run the Spread × Volatility drill, then race in Tradr while watching how your own 'spread' (edge vs bots) behaves when markets get noisy. PDF: https://arxiv.org/pdf/2610.30891",
      },
    ],
  },
  {
    id: "desk-03-interview",
    trackId: "desk",
    order: 3,
    title: "Interview arena hygiene",
    summary: "Firm-flavored probes without cheating yourself.",
    minutes: 6,
    kind: "quiz",
    xp: 60,
    sections: [
      {
        heading: "What we store",
        body: "Prompts + short ASSESS notes written for Academy. Classics (Zhou green book, Joshi, Crack, Hull, Shreve, Wilmott) live as Library metadata with WorldCat links — never pirated PDFs, never pasted answer essays.",
      },
      {
        heading: "Ritual",
        body: "Pick a drill on the Planet → answer cold → Check → only then read ASSESS / SOURCE. Space sessions; mix microstructure, Bayes, and evaluation. Soft questions later want project History, not trivia.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Best first move when a Planet interview drill appears?",
        choices: [
          { id: "a", text: "Open the green book PDF immediately.", correct: false },
          { id: "b", text: "Answer cold, then check ASSESS / SOURCE.", correct: true },
          { id: "c", text: "Skip to Bot Factory.", correct: false },
          { id: "d", text: "Paste ChatGPT into the graph as CLAIM.", correct: false },
        ],
        explain: "Retrieval-first — mindcraft interview prep pillar mirrored on Tradr Planet.",
      },
      {
        id: "q2",
        prompt: "Why might competitive spreads widen when volatility rises?",
        choices: [
          { id: "a", text: "Only because makers collude.", correct: false },
          { id: "b", text: "Zero-profit competitive quotes still price risk; theory can scale spread with σ.", correct: true },
          { id: "c", text: "Spreads never depend on volatility.", correct: false },
          { id: "d", text: "Because tick size is illegal.", correct: false },
        ],
        explain: "See arXiv:2610.30891 — volatility-driven widening can confound collusion tests.",
      },
    ],
  },
  {
    id: "desk-04-library",
    trackId: "desk",
    order: 4,
    title: "Desk library map",
    summary: "Which book for which interview surface.",
    minutes: 5,
    kind: "read",
    xp: 40,
    sections: [
      {
        heading: "Interview stack",
        body: "Zhou (green book) + Crack for breadth; Joshi interview book for harder derivatives; Wilmott FAQ for model intuition. Work problems; don't hoard PDFs in the repo.",
      },
      {
        heading: "Theory stack",
        body: "Hull for industry language; Shreve I/II when you need stochastic calculus. Lefèvre for trader narrative culture. All cards on the Planet Library rail link out to WorldCat/search — buy or borrow legally.",
      },
    ],
  },

  // ── Meta Learning / 形而上学习 ───────────────────────────────
  {
    id: "meta-01-how-to-learn",
    trackId: "meta",
    order: 1,
    title: "How knowledge sticks",
    summary: "PROBE → ANSWER → ASSESS; retrieval before sources; one concept picture.",
    minutes: 6,
    kind: "read",
    xp: 50,
    polyglotTopics: ["meta"],
    polyglotIds: ["probe-answer", "dual-subtitle"],
    sections: [
      {
        heading: "形而上学习",
        body: "Meta-learning here means learning how you learn quant — not a third calculus course. The loop is mindcraft-shaped: PROBE cold (retrieve), write your ANSWER, ASSESS against a short note, only then open SOURCE. Skipping retrieval turns every lesson into passive reading.",
        polyglotIds: ["probe-answer"],
      },
      {
        heading: "One concept picture",
        body: "Hold one language-neutral Concept (e.g. adverse selection). Attach lemmas in your primary gloss and your target language. Dual subtitles put both texts on the same picture — quant first, foreign language as the incidental gain.",
        polyglotIds: ["dual-subtitle", "adverse-selection"],
      },
      {
        heading: "Tradr wiring",
        body: "Set your language pair on the Academy hub (e.g. 中文 · Deutsch, or Français ↔ Deutsch). Every lesson with lexicon tags shows a bilingual strip. Planet drills stay retrieval-first; Meta track teaches the ritual.",
      },
    ],
  },
  {
    id: "meta-02-paper-muscle",
    trackId: "meta",
    order: 2,
    title: "How to read a paper (paper muscle)",
    summary: "One OA paper → domain scaffold, not a two-line abstract.",
    minutes: 8,
    kind: "quiz",
    xp: 70,
    polyglotTopics: ["meta", "market-making"],
    polyglotIds: ["paper-muscle", "nash-mm"],
    sections: [
      {
        heading: "Fail the cut",
        body: "A two-sentence summary is not paper muscle. Goal: turn one open-access paper into a domain scaffold — prerequisite vertices, methods taxonomy, evidence grades, and open GAP slots you fill later via PROBE.",
        polyglotIds: ["paper-muscle"],
      },
      {
        heading: "Six-rung ladder (default)",
        body: "1) Prerequisites 2) Measurement / body layer 3) Formal frame 4) Figure/results map A 5) Map B or primary contrast 6) Applications with bounds (what the paper does NOT claim). Fog day: one PROBE only.",
      },
      {
        heading: "Worked example on Tradr",
        body: "arXiv:2610.30891 (competitive market making) is already a Planet paper star. Use it as the scaffold: Nash quotes, volatility-scaled spreads, no-regret learning — then run the Spread × Volatility drill cold.",
        polyglotIds: ["nash-mm", "bid-ask"],
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Paper muscle means…",
        choices: [
          { id: "a", text: "Paste the abstract into Anki and move on.", correct: false },
          { id: "b", text: "Turn one paper into a domain scaffold with gaps for later PROBEs.", correct: true },
          { id: "c", text: "Memorize every equation before reading the intro.", correct: false },
          { id: "d", text: "Only watch conference talks.", correct: false },
        ],
        explain: "Scaffold + SOURCE + retrieval — not a two-line blurb.",
      },
      {
        id: "q2",
        prompt: "Best first move on a Planet paper drill?",
        choices: [
          { id: "a", text: "Open the PDF and highlight everything.", correct: false },
          { id: "b", text: "Answer the probe cold, then check ASSESS / SOURCE.", correct: true },
          { id: "c", text: "Ask a bot to summarize, then skip the graph.", correct: false },
        ],
        explain: "PROBE → ANSWER → ASSESS before sources.",
      },
    ],
  },
  {
    id: "meta-03-polyglot-desk",
    trackId: "meta",
    order: 3,
    title: "Quant + foreign language dual study",
    summary: "Language pairs, dual subtitles, Concept ↔ Lemma_L1/L2.",
    minutes: 7,
    kind: "quiz",
    xp: 60,
    polyglotTopics: ["meta", "microstructure", "evaluation"],
    polyglotIds: ["dual-subtitle", "bid-ask", "sharpe"],
    sections: [
      {
        heading: "Pair settings",
        body: "Primary = language for explanations / L1 gloss. Target = language you are acquiring. Suggested pairs include 中文·Deutsch, 中文·français, English·Español, and Français↔Deutsch bridges. Toggle dual columns on the hub anytime.",
        polyglotIds: ["dual-subtitle"],
      },
      {
        heading: "Desk lexicon",
        body: "Bid–ask, adverse selection, Sharpe, overfitting, Nash quotes — each concept ships with surface lines in en/zh/de/fr/es/ja/ru. You study microstructure while the target lemma sticks as a side effect.",
        polyglotIds: ["bid-ask", "sharpe", "adverse-selection"],
      },
      {
        heading: "Anti-patterns",
        body: "Do not farm CEFR badges here. Do not drill bare grammar with zero quant lemmas. Do not treat every English tech noun as a gap when it is allowlisted jargon. Job first: learn the market idea; language is the dual subtitle.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "In Tradr Academy polyglot mode, the main job is…",
        choices: [
          { id: "a", text: "CEFR exam prep with random Anki decks.", correct: false },
          { id: "b", text: "Learn quant concepts; acquire the target language as dual subtitles.", correct: true },
          { id: "c", text: "Replace all English with emoji.", correct: false },
        ],
        explain: "Quant first — foreign language rides along on the same concept picture.",
      },
      {
        id: "q2",
        prompt: "Français ↔ Deutsch bridge means…",
        choices: [
          { id: "a", text: "Primary and target are both Romance languages only.", correct: false },
          { id: "b", text: "You can set FR as gloss and DE as target (or the reverse) for dual columns.", correct: true },
          { id: "c", text: "Chinese is required as primary.", correct: false },
        ],
        explain: "Any supported pair works — FR/DE is a suggested bridge.",
      },
    ],
  },
  {
    id: "meta-04-knowledge-graph",
    trackId: "meta",
    order: 4,
    title: "Knowledge as graph, not notes dump",
    summary: "Vertices, edges, SOURCE — Planet as the skin over ontology.",
    minutes: 6,
    kind: "read",
    xp: 50,
    polyglotTopics: ["meta"],
    polyglotIds: ["probe-answer", "paper-muscle"],
    sections: [
      {
        heading: "Ontology membrane",
        body: "Learning Planet is a teaching ontology: domains, concepts, papers, books, drills, bridges. Edges (ISA, GROUNDS_IN, APPLIES, STUDIES…) are labeled. CLAIM lives on the node; SOURCE or silence. The GUI is a skin — not a folder of orphan notes.",
      },
      {
        heading: "From lesson → star → race",
        body: "Meta teaches the ritual; Desk lessons point at Planet stars; Bot Factory encodes the idea; Story races stress-test it. Keep what compounds. Kill what only looked good in-sample.",
        polyglotIds: ["overfitting"],
      },
      {
        heading: "Open the sky",
        body: "Orbit Meta Learning + Polyglot on the Planet, then jump into a bilingual lesson strip with your saved language pair.",
      },
    ],
  },
];

export const LESSONS: AcademyLesson[] = [...CORE_LESSONS, ...QUANT26_LESSONS];

export function getTrack(id: string): AcademyTrack | undefined {
  return TRACKS.find((t) => t.id === id);
}

export function getLesson(id: string): AcademyLesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonsForTrack(trackId: TrackId): AcademyLesson[] {
  return LESSONS.filter((l) => l.trackId === trackId).sort((a, b) => a.order - b.order);
}

export function allLessonIds(): string[] {
  return LESSONS.map((l) => l.id);
}
