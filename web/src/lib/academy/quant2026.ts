/**
 * Quant 2026 Academy track — classical stochastic-finance ladder (Shreve-shaped
 * syllabus as a study map) bridged to 2025–2026 research: competitive MM,
 * RL/MARL making, LLM+RL agents, LOB foundation models, agentic quant surveys.
 *
 * Does NOT paste textbook proofs or proprietary alphas. Books → WorldCat;
 * papers → arXiv abs/pdf links. Teaching bodies are original Academy notes.
 */

import type { AcademyLesson, AcademyTrack } from "./curriculum";

export const QUANT26_TRACK: AcademyTrack = {
  id: "quant26",
  title: "Quant 2026",
  blurb: "Classical pricing ladder → 2026 microstructure FMs, RL makers, agentic quant.",
  accent: "text-teal-300",
  icon: "∑",
  requires: { trackId: "foundations", lessons: 2 },
};

/** Featured 2025–2026 research anchors used across lessons / Planet. */
export const QUANT26_PAPERS = [
  {
    id: "2610.30891",
    title: "Equilibria and Learning in Competitive Market Making",
    url: "https://arxiv.org/abs/2610.30891",
    year: 2026,
    theme: "competitive MM / Nash / no-regret",
  },
  {
    id: "2510.25929",
    title: "Multi-Agent RL for Market Making: Competition without Collusion",
    url: "https://arxiv.org/abs/2510.25929",
    year: 2025,
    theme: "MARL / collusion metrics",
  },
  {
    id: "2507.18680",
    title: "Market Making Strategies with Reinforcement Learning",
    url: "https://arxiv.org/abs/2507.18680",
    year: 2025,
    theme: "DRL MM / inventory / non-stationarity",
  },
  {
    id: "2502.11433",
    title: "FLAG-Trader: Fusion LLM-Agent with Gradient-based RL",
    url: "https://arxiv.org/abs/2502.11433",
    year: 2025,
    theme: "LLM policy + RL trading",
  },
  {
    id: "2508.02366",
    title: "Language Model Guided RL in Quantitative Trading",
    url: "https://arxiv.org/abs/2508.02366",
    year: 2025,
    theme: "LLM strategy → RL execution",
  },
  {
    id: "2602.23784",
    title: "TradeFM: Generative FM for Trade-flow & Microstructure",
    url: "https://arxiv.org/abs/2602.23784",
    year: 2026,
    theme: "trade-flow foundation model",
  },
  {
    id: "2608.19227",
    title: "M3: State-Event Generative FM for Microstructure",
    url: "https://arxiv.org/abs/2608.19227",
    year: 2026,
    theme: "LOB state–event world model",
  },
  {
    id: "2610.28753",
    title: "Inner Workings of a State-Space FM for Limit Order Books",
    url: "https://arxiv.org/abs/2610.28753",
    year: 2026,
    theme: "LOB world-model interpretability / OFI",
  },
  {
    id: "2608.31041",
    title: "Agentic Quantitative Trading: Survey of Workflows & Evaluation",
    url: "https://arxiv.org/abs/2608.31041",
    year: 2026,
    theme: "agentic quant survey",
  },
  {
    id: "2605.05580",
    title: "AlphaCrafter: Multi-Agent Workflows for Cross-Sectional Quant",
    url: "https://arxiv.org/abs/2605.05580",
    year: 2026,
    theme: "multi-agent alpha harness",
  },
] as const;

export const QUANT26_LESSONS: AcademyLesson[] = [
  {
    id: "q26-01-map",
    trackId: "quant26",
    order: 1,
    title: "Quant 2026 map: classical ladder × modern desk",
    summary: "How Shreve-shaped foundations connect to 2026 FMs, RL makers, and agents.",
    minutes: 7,
    kind: "read",
    xp: 50,
    polyglotTopics: ["meta", "evaluation"],
    polyglotIds: ["paper-muscle", "probe-answer"],
    sections: [
      {
        heading: "Two layers, one desk",
        body: "Layer A is the classical stochastic-finance ladder (probability → binomial → Brownian/Itô → risk-neutral → American/exotics → bonds & term structure). Treat Steven Shreve’s Stochastic Calculus for Finance I/II as a study map — buy/borrow legally (WorldCat on the Planet Library). Layer B is the 2025–2026 stack: competitive market-making theory, RL/MARL makers, LLM+RL trading agents, LOB foundation / world models, and agentic quant surveys.",
      },
      {
        heading: "What Tradr adds",
        body: "Academy lessons stay concept-first. You encode intuition in Bot Factory, stress it in Story races, and orbit CLAIM+SOURCE stars on the Learning Planet. Meta track teaches paper muscle; this track chooses which papers and which classical rungs matter for a 2026 desk.",
        polyglotIds: ["paper-muscle"],
      },
      {
        heading: "Non-goals",
        body: "We do not paste textbook chapter proofs, Alpha101 formula dumps, or pirated PDFs. PROBE cold before opening SOURCE. Fog day: one rung.",
        polyglotIds: ["probe-answer"],
      },
    ],
  },
  {
    id: "q26-02-probability",
    trackId: "quant26",
    order: 2,
    title: "Probability & conditional expectation (desk edition)",
    summary: "Filtration as information; conditional expectation as fair price under a measure.",
    minutes: 8,
    kind: "quiz",
    xp: 60,
    polyglotTopics: ["evaluation"],
    polyglotIds: ["sharpe"],
    sections: [
      {
        heading: "Classical rung",
        body: "Finite probability spaces, independence, conditional expectation, and martingales are the language underneath every pricing argument. In desk slang: your information set grows with the filtration; a price process that is a martingale under the pricing measure has no free lunch of the simplest kind.",
      },
      {
        heading: "Tradr intuition",
        body: "A race’s equity path is a discrete stochastic process. Your decisions are adapted to the bars you have seen — not to future closes. When you “know” a signal fired, you are conditioning; when you ignore selection bias, you are inventing a better measure than you earned.",
        polyglotIds: ["overfitting"],
      },
      {
        heading: "2026 bridge",
        body: "LOB foundation models (TradeFM, M3) learn distributions over event streams. Reading their outputs still requires the same discipline: what measure / filter are you evaluating under, and what is held out?",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "In pricing language, conditioning on a filtration means…",
        choices: [
          { id: "a", text: "Using only information available up to that time.", correct: true },
          { id: "b", text: "Averaging future prices into today’s signal.", correct: false },
          { id: "c", text: "Deleting losing trades from the sample.", correct: false },
        ],
        explain: "Adapted decisions — no peeking at future bars.",
      },
    ],
  },
  {
    id: "q26-03-binomial-rn",
    trackId: "quant26",
    order: 3,
    title: "Binomial model & risk-neutral pricing",
    summary: "Complete markets, replicating portfolios, risk-neutral measure — discrete first.",
    minutes: 9,
    kind: "quiz",
    xp: 70,
    polyglotTopics: ["evaluation", "market-making"],
    sections: [
      {
        heading: "Classical rung",
        body: "One-step and multi-step binomial trees make arbitrage pricing concrete: find a hedge portfolio, or equivalently take expectation under a risk-neutral measure that turns discounted asset prices into martingales. Completeness = unique RN measure in the simple model.",
      },
      {
        heading: "Desk caution",
        body: "Real races and LOBs are incomplete: many measures are consistent with no obvious arb. “Risk-neutral” is a modeling choice, not a button that makes backtests honest. Transaction costs and discrete rebalancing break textbook replication.",
      },
      {
        heading: "Lab hook",
        body: "In Bot Factory, a formula bot is a crude policy, not a replicating hedge. Compare two parameterizations on held-out bars — you are probing model risk, not proving no-arb.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Risk-neutral pricing in the binomial model is equivalent to…",
        choices: [
          { id: "a", text: "Maximizing expected return under the physical measure only.", correct: false },
          { id: "b", text: "Replicating / hedging so discounted prices are martingales under a pricing measure.", correct: true },
          { id: "c", text: "Ignoring the hedge and optimizing Sharpe in-sample.", correct: false },
        ],
        explain: "Replication ↔ RN expectation in the complete binomial setting.",
      },
    ],
  },
  {
    id: "q26-04-brownian-ito",
    trackId: "quant26",
    order: 4,
    title: "Brownian motion, Itô, and continuous hedges",
    summary: "From random walks to GBM; why continuous hedging is a limit story.",
    minutes: 8,
    kind: "read",
    xp: 60,
    polyglotTopics: ["evaluation"],
    sections: [
      {
        heading: "Classical rung",
        body: "Brownian motion as a scaling limit of random walks; quadratic variation; Itô integral and Itô’s formula; geometric Brownian motion as the Black–Scholes stock. Continuous hedging arguments live in this calculus.",
      },
      {
        heading: "2026 reality check",
        body: "Tradr races and live LOBs are discrete, lagged, and adverse-selected. Foundation models that tokenize trade/LOB messages (TradeFM, M3, state-space LOB FMs) model the event stream — closer to microstructure than to frictionless GBM. Use GBM as intuition, not as your production fill model.",
      },
      {
        heading: "Study move",
        body: "Paper-muscle one figure from a LOB FM paper: what is the state, what is the event, what stylized facts are claimed? Leave GAP slots for holdout tickers.",
      },
    ],
  },
  {
    id: "q26-05-girsanov-hedge",
    trackId: "quant26",
    order: 5,
    title: "Girsanov, martingale representation, hedging",
    summary: "Changing measure; when a claim is hedgeable; multi-asset correlation traps.",
    minutes: 8,
    kind: "quiz",
    xp: 70,
    polyglotTopics: ["microstructure"],
    polyglotIds: ["adverse-selection"],
    sections: [
      {
        heading: "Classical rung",
        body: "Girsanov changes the drift so you can work under a risk-neutral measure. Martingale representation says (under conditions) traded noise can replicate square-integrable claims — the continuous analogue of completeness. Correlation |ρ|=1 collapses hedge dimensions.",
      },
      {
        heading: "Desk bridge",
        body: "Adverse selection is not Girsanov, but both are about which measure / information you are fighting. If informed flow hits your ask, your “physical” P&L measure is hostile — spreads compensate, as in classic Glosten–Milgrom and in competitive MM theory.",
        polyglotIds: ["adverse-selection", "bid-ask"],
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Martingale representation (informally) connects…",
        choices: [
          { id: "a", text: "Any claim to a static buy-and-hold of cash only.", correct: false },
          { id: "b", text: "Square-integrable claims to dynamic hedges against the driving noise (when complete).", correct: true },
          { id: "c", text: "Sharpe ratios across uncorrelated backtests automatically.", correct: false },
        ],
        explain: "Hedging theorem — completeness assumptions required.",
      },
    ],
  },
  {
    id: "q26-06-american-exotics",
    trackId: "quant26",
    order: 6,
    title: "American options, barriers, Asians — stopping & path",
    summary: "Early exercise, reflection principle, path-dependent payoffs; discretionary exits.",
    minutes: 7,
    kind: "read",
    xp: 55,
    polyglotTopics: ["evaluation"],
    sections: [
      {
        heading: "Classical rung",
        body: "Stopping times and American claims; perpetual puts as worked examples; barrier options via reflection; Asians via PDE / Feynman–Kac style averaging. Path dependence changes both price and hedge.",
      },
      {
        heading: "Tradr parallel",
        body: "Closing a race position early is a stopping decision under a clock and inventory — not the same math, same discipline: value of waiting vs locking P&L. Story Mode stars reward controlled exits, not maximal click count.",
      },
    ],
  },
  {
    id: "q26-07-rates-bgm",
    trackId: "quant26",
    order: 7,
    title: "Bonds, forwards, term structure & BGM (map only)",
    summary: "Forward vs futures, short-rate sketches (Vasicek/CIR/HW), LIBOR market model overview.",
    minutes: 8,
    kind: "read",
    xp: 55,
    polyglotTopics: ["evaluation"],
    sections: [
      {
        heading: "Classical rung",
        body: "Forwards vs futures (marking, spreads, backwardation/contango language); short-rate models (Vasicek, CIR, Hull–White) and multi-factor affine sketches; Brace–Gatarek–Musiela / LIBOR market model for caplets and swaps. This lesson is a map — dive via Shreve II + Hull, not a formula dump.",
      },
      {
        heading: "Why it still matters in 2026",
        body: "Even if you trade crypto/equity microstructure, funding, basis, and discounting show up in P&L. Agentic quant surveys still list risk management as an under-integrated stage — rates literacy keeps agents honest about carry and funding.",
      },
    ],
  },
  {
    id: "q26-08-mm-classical",
    trackId: "quant26",
    order: 8,
    title: "Market making classical → competitive Nash (2026)",
    summary: "Adverse selection, inventory, then Onger & Foscari competitive equilibria.",
    minutes: 9,
    kind: "quiz",
    xp: 80,
    polyglotTopics: ["market-making", "microstructure"],
    polyglotIds: ["bid-ask", "nash-mm", "adverse-selection", "paper-muscle"],
    sections: [
      {
        heading: "Classical intuitions",
        body: "Makers post two-sided quotes, earn spread, lose to informed flow, manage inventory. Spreads are compensation — not free money.",
        polyglotIds: ["bid-ask", "adverse-selection"],
      },
      {
        heading: "2026 theory star",
        body: "Equilibria and Learning in Competitive Market Making (arXiv:2610.30891): N≥2 strategic makers, inelastic informed trader, pure-strategy Nash under mild assumptions, spreads scaling with volatility for location-scale values, no-internal-regret learners approaching the Nash envelope as tick → 0.",
        polyglotIds: ["nash-mm", "paper-muscle"],
      },
      {
        heading: "Planet drill",
        body: "Run Spread × Volatility on the Learning Planet cold, then open the paper star. Wider spreads in vol are not automatic proof of collusion.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "In competitive MM theory (2026 paper star), equilibrium spreads widening with volatility…",
        choices: [
          { id: "a", text: "Can occur in zero-profit competition — a confound for collusion tests.", correct: true },
          { id: "b", text: "Only happen if all makers form a cartel.", correct: false },
          { id: "c", text: "Are impossible under location-scale value distributions.", correct: false },
        ],
        explain: "See arXiv:2610.30891 — risk pricing vs collusion.",
      },
    ],
  },
  {
    id: "q26-09-rl-mm",
    trackId: "quant26",
    order: 9,
    title: "RL & MARL market making (2025)",
    summary: "DRL makers, inventory MORL, non-stationarity; competition without collusion.",
    minutes: 9,
    kind: "quiz",
    xp: 75,
    polyglotTopics: ["market-making", "meta"],
    polyglotIds: ["nash-mm", "probe-answer"],
    sections: [
      {
        heading: "Single-agent RL makers",
        body: "Market Making Strategies with Reinforcement Learning (arXiv:2507.18680) surveys DRL makers: reward shaping vs multi-objective RL for inventory, and policy-weighting ideas (e.g. POW-dTS) for non-stationary regimes. Lesson for Tradr: your Bot Factory backtest is a toy MDP — regime shift kills frozen policies.",
      },
      {
        heading: "Multi-agent / collusion lens",
        body: "ICAIF’25 work on MARL market making (arXiv:2510.25929) studies hierarchical self-interested vs competitive vs hybrid agents and interaction metrics that may signal harmful emergent patterns. Pair with the 2026 Nash paper: theory gives competitive benchmarks; MARL asks what learning dynamics produce.",
        polyglotIds: ["nash-mm"],
      },
      {
        heading: "PROBE",
        body: "Before reading either paper: write one sentence on how you would detect “too tight” collusive spreads vs vol-driven competitive spreads in a simulation.",
        polyglotIds: ["probe-answer"],
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "A practical reason RL market-making policies need adaptation machinery is…",
        choices: [
          { id: "a", text: "Markets are stationary by definition.", correct: false },
          { id: "b", text: "Non-stationarity / regime change breaks fixed policies.", correct: true },
          { id: "c", text: "Inventory risk does not exist for makers.", correct: false },
        ],
        explain: "Non-stationarity is a first-class failure mode in the 2025 RL-MM line.",
      },
    ],
  },
  {
    id: "q26-10-llm-rl",
    trackId: "quant26",
    order: 10,
    title: "LLM + RL trading agents (2025)",
    summary: "FLAG-Trader, LM-guided RL — strategy language meets execution policy.",
    minutes: 8,
    kind: "quiz",
    xp: 70,
    polyglotTopics: ["meta", "evaluation"],
    polyglotIds: ["overfitting", "probe-answer"],
    sections: [
      {
        heading: "Two patterns",
        body: "(1) FLAG-Trader (arXiv:2502.11433): partially fine-tuned LLM as policy network with gradient RL on trading rewards. (2) LM-guided RL (arXiv:2508.02366): LLM proposes high-level strategy; RL executes tactically. Both try to fix myopic RL and opaque policies — neither deletes evaluation debt.",
      },
      {
        heading: "Tradr Agents track link",
        body: "Academy Agents already stress tools, loops, and lying agents. Here the research claim is linguistic + RL fusion. Your job: demand the same engine for fills, fees, and holdouts you use for formula bots.",
        polyglotIds: ["overfitting"],
      },
      {
        heading: "Safety",
        body: "Never let an agent invent market data or silently change fill rules. If it proposes a formula or a prompt policy, show it, compile/simulate it, score it.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Best evaluation stance for an LLM+RL trading paper?",
        choices: [
          { id: "a", text: "Trust the chat rationale; skip holdouts.", correct: false },
          { id: "b", text: "Same fill/fee/holdout discipline as any other strategy; rationale is secondary.", correct: true },
          { id: "c", text: "Only report in-sample Sharpe.", correct: false },
        ],
        explain: "Agentic surveys stress that model skill ≠ live trading performance.",
      },
    ],
  },
  {
    id: "q26-11-lob-fm",
    trackId: "quant26",
    order: 11,
    title: "LOB & trade-flow foundation models (2026)",
    summary: "TradeFM, M3, state-space LOB FMs — world models for microstructure.",
    minutes: 9,
    kind: "quiz",
    xp: 80,
    polyglotTopics: ["microstructure", "meta"],
    polyglotIds: ["bid-ask", "paper-muscle"],
    sections: [
      {
        heading: "Why foundation models here",
        body: "TradeFM (arXiv:2602.23784) learns generative trade-flow representations across many equities with scale-invariant tokenization + simulator rollouts (stylized facts). M3 (arXiv:2608.19227) jointly models order events and LOB liquidity for counterfactual trajectories. Interpretability work on state-space LOB FMs (arXiv:2610.28753) asks what internal state encodes (e.g. order-flow imbalance).",
        polyglotIds: ["bid-ask"],
      },
      {
        heading: "Desk use — and misuse",
        body: "Use cases: synthetic stress, impact thought-experiments, agent training environments. Misuse: treating generated paths as free alpha, or skipping exchange-rule fidelity. Paper muscle: one domain scaffold per paper — state vs event, claimed stylized facts, OOD tickers, GAP slots.",
        polyglotIds: ["paper-muscle"],
      },
      {
        heading: "Link to classical ladder",
        body: "FMs replace hand-set GBM parameters with learned event dynamics — they do not replace measure discipline, adverse selection, or competitive quoting theory.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "M3’s distinctive modeling claim (vs event-only generators) is roughly…",
        choices: [
          { id: "a", text: "Ignoring the LOB and predicting returns only.", correct: false },
          { id: "b", text: "Coupling order events with evolving LOB liquidity / state.", correct: true },
          { id: "c", text: "Proving continuous Black–Scholes hedges exist in LOBs.", correct: false },
        ],
        explain: "State–event generative microstructure model.",
      },
    ],
  },
  {
    id: "q26-12-agentic-survey",
    trackId: "quant26",
    order: 12,
    title: "Agentic quant workflows & evaluation (2026)",
    summary: "Survey map: factor → signal → portfolio → execution → risk; where systems fail.",
    minutes: 8,
    kind: "quiz",
    xp: 70,
    polyglotTopics: ["meta", "evaluation"],
    polyglotIds: ["overfitting", "probe-answer"],
    sections: [
      {
        heading: "Survey spine",
        body: "Agentic Quantitative Trading (arXiv:2608.31041) reviews workflows across factor mining, signal discovery, portfolio construction, execution, and risk — plus architecture/coordination/adaptation and benchmarks. Finding to internalize: systems cluster on signal discovery; full integration with portfolio, execution, and risk is still uncommon; strong forecasting ≠ live performance under reliability controls.",
      },
      {
        heading: "Multi-agent harnesses",
        body: "AlphaCrafter-style multi-agent cross-sectional workflows (arXiv:2605.05580) show the industry pattern: harnesses, constraints, aggregation. Tradr’s Bot Factory + Story + Academy is a small human-in-the-loop harness — keep the human chair.",
      },
      {
        heading: "Evaluation hygiene",
        body: "Match the benchmark to the claim. If you advertise execution skill, do not only score IC. If you advertise agent reliability, log tool failures and fill-model freezes.",
        polyglotIds: ["overfitting"],
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "A key survey takeaway for 2026 agentic quant is…",
        choices: [
          { id: "a", text: "Signal models alone guarantee live PnL.", correct: false },
          { id: "b", text: "End-to-end workflow + evaluation matched to the capability still lag.", correct: true },
          { id: "c", text: "Risk management is fully solved in multi-agent stacks.", correct: false },
        ],
        explain: "Integration and evaluation gaps are the plot of the survey.",
      },
    ],
  },
  {
    id: "q26-13-capstone",
    trackId: "quant26",
    order: 13,
    title: "Capstone: one paper → scaffold → Tradr loop",
    summary: "Pick a 2025/26 paper; paper-muscle it; encode a tiny probe in Lab/Planet.",
    minutes: 10,
    kind: "lab",
    xp: 90,
    botLabHref: "/bots/lab",
    polyglotTopics: ["meta", "market-making", "evaluation"],
    polyglotIds: ["paper-muscle", "probe-answer", "dual-subtitle"],
    sections: [
      {
        heading: "Assignment",
        body: "Choose one: 2610.30891 (competitive MM), 2510.25929 (MARL collusion lens), 2602.23784 (TradeFM), 2608.19227 (M3), 2502.11433 (FLAG-Trader), or 2608.31041 (agentic survey). Build a six-rung paper-muscle scaffold (prereqs → measurement → formal frame → figure A → figure B → bounds). Write three PROBEs; answer one cold.",
        polyglotIds: ["paper-muscle", "probe-answer"],
      },
      {
        heading: "Encode",
        body: "Either (a) open Bot Factory and encode a related micro-policy / signal you can kill in a holdout, or (b) add a personal Planet note (when user planets ship) linking CLAIM→SOURCE. Dual-subtitle one lexicon line into your target language.",
        polyglotIds: ["dual-subtitle"],
      },
      {
        heading: "Done when",
        body: "You have SOURCE URLs, explicit non-claims, and a Tradr action (lab run or race) that could falsify a piece of the scaffold — not a two-line abstract.",
      },
    ],
  },
];
