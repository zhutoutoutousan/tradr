/**
 * Tradr Learning Planet — mindcraft-inspired knowledge graph for quant study.
 * Graph fragments are local teaching ontology (V/E + SOURCE), not a vault dump.
 * Interview prompts are original study probes — not pasted proprietary answer banks.
 */

export type PlanetNodeKind = "star" | "domain" | "concept" | "paper" | "book" | "drill" | "bridge";

export type PlanetEdgeLabel =
  | "ISA"
  | "GROUNDS_IN"
  | "APPLIES"
  | "STUDIES"
  | "INFORMS"
  | "PREPARES";

export interface PlanetNode {
  id: string;
  kind: PlanetNodeKind;
  label: string;
  gloss: string;
  /** Short claim for the inspector (mindcraft CLAIM style). */
  claim?: string;
  source?: { title: string; url: string };
  href?: string;
  externalUrl?: string;
  /** Visual orbit ring 0=core … 3=outer */
  orbit: number;
  /** Degrees on the ring */
  angle: number;
  accent: string;
  /** Optional drill / book payload ids */
  drillId?: string;
  bookId?: string;
}

export interface PlanetEdge {
  from: string;
  to: string;
  label: PlanetEdgeLabel;
}

export interface PlanetBook {
  id: string;
  title: string;
  author: string;
  why: string;
  level: "core" | "interview" | "deep" | "trader";
  topics: string[];
  /** Safe public page — never pirate PDFs */
  url: string;
}

export interface PlanetDrillChoice {
  id: string;
  text: string;
  correct: boolean;
}

export interface PlanetDrill {
  id: string;
  firmFlavor: string;
  topic: string;
  prompt: string;
  choices: PlanetDrillChoice[];
  explain: string;
  sourceNote: string;
}

export const PLANET_BOOKS: PlanetBook[] = [
  {
    id: "zhou-green",
    title: "A Practical Guide to Quantitative Finance Interviews",
    author: "Xinfeng Zhou",
    why: "The green book — probability, brainteasers, and desk math interviewers actually reuse.",
    level: "interview",
    topics: ["probability", "brainteasers", "statistics"],
    url: "https://www.worldcat.org/search?q=A+Practical+Guide+to+Quantitative+Finance+Interviews+Zhou",
  },
  {
    id: "joshi-interview",
    title: "Quant Job Interview Questions and Answers",
    author: "Mark Joshi, Nick Denson, Andrew Downes",
    why: "Harder derivatives / modeling probes for researcher tracks.",
    level: "interview",
    topics: ["derivatives", "stochastic calculus", "modeling"],
    url: "https://www.worldcat.org/search?q=Quant+Job+Interview+Questions+and+Answers+Joshi",
  },
  {
    id: "crack-hots",
    title: "Heard on the Street",
    author: "Timothy Crack",
    why: "Breadth across Wall Street screens — logic, stats, and finance puzzles.",
    level: "interview",
    topics: ["probability", "finance theory", "logic"],
    url: "https://www.worldcat.org/search?q=Heard+on+the+Street+Timothy+Crack",
  },
  {
    id: "hull-ofod",
    title: "Options, Futures, and Other Derivatives",
    author: "John C. Hull",
    why: "Industry lingua franca for derivatives desks and risk interviews.",
    level: "core",
    topics: ["options", "futures", "greeks", "risk"],
    url: "https://www.worldcat.org/search?q=Options+Futures+and+Other+Derivatives+Hull",
  },
  {
    id: "shreve-i",
    title: "Stochastic Calculus for Finance I",
    author: "Steven Shreve",
    why: "Binomial foundations before continuous-time machinery — Quant 2026 classical ladder.",
    level: "deep",
    topics: ["stochastic calculus", "binomial", "pricing", "quant26"],
    url: "https://www.worldcat.org/search?q=Stochastic+Calculus+for+Finance+I+Shreve",
  },
  {
    id: "shreve-ii",
    title: "Stochastic Calculus for Finance II",
    author: "Steven Shreve",
    why: "Continuous-time ladder — Brownian, Itô, Girsanov, term structure map for Quant 2026.",
    level: "deep",
    topics: ["Itô", "Girsanov", "term structure", "quant26"],
    url: "https://www.worldcat.org/search?q=Stochastic+Calculus+for+Finance+II+Shreve",
  },
  {
    id: "wilmott-faq",
    title: "Frequently Asked Questions in Quantitative Finance",
    author: "Paul Wilmott",
    why: "Model intuition and interview-style FAQ without drowning in proofs.",
    level: "interview",
    topics: ["models", "intuition", "FAQ"],
    url: "https://www.worldcat.org/search?q=Frequently+Asked+Questions+in+Quantitative+Finance+Wilmott",
  },
  {
    id: "lefevre",
    title: "Reminiscences of a Stock Operator",
    author: "Edwin Lefèvre",
    why: "Trader psychology and tape-reading culture — still cited on prop desks.",
    level: "trader",
    topics: ["psychology", "discretionary", "history"],
    url: "https://www.worldcat.org/search?q=Reminiscences+of+a+Stock+Operator",
  },
];

/** Original study probes — written for Tradr Academy, not copied answer banks. */
export const PLANET_DRILLS: PlanetDrill[] = [
  {
    id: "drill-spread-vol",
    firmFlavor: "Market making desk",
    topic: "Microstructure",
    prompt:
      "In a competitive market-making game with inelastic informed flow, what happens to equilibrium bid–ask spreads when fundamental value volatility rises (location-scale family)?",
    choices: [
      { id: "a", text: "Spreads shrink — makers race harder to the mid.", correct: false },
      { id: "b", text: "Spreads widen roughly linearly with value std. deviation — risk, not collusion.", correct: true },
      { id: "c", text: "Spreads are independent of volatility by no-arbitrage.", correct: false },
      { id: "d", text: "Only inventory models can widen spreads; competition cannot.", correct: false },
    ],
    explain:
      "Competitive zero-profit quotes still price uncertainty. For location-scale asset distributions, theory shows equilibrium spreads scale with volatility — a confound when diagnosing algorithmic collusion from prices alone.",
    sourceNote: "Inspired by Onger & Foscari, arXiv:2610.30891 (Equilibria and Learning in Competitive Market Making).",
  },
  {
    id: "drill-adverse",
    firmFlavor: "Prop trading screen",
    topic: "Adverse selection",
    prompt: "A maker posts a tight ask and immediately gets lifted by a large informed buyer. What is the primary risk just realized?",
    choices: [
      { id: "a", text: "Latency arbitrage only.", correct: false },
      { id: "b", text: "Adverse selection — trading against better-informed flow.", correct: true },
      { id: "c", text: "Gamma scalping failure.", correct: false },
      { id: "d", text: "Funding-rate basis blowout.", correct: false },
    ],
    explain:
      "Adverse selection is the classic Glosten–Milgrom hazard: informed flow hits your quote when you are wrong about value. Spreads compensate for that expected loss.",
    sourceNote: "Classic microstructure (Glosten–Milgrom); linked from Planet graph.",
  },
  {
    id: "drill-sharpe",
    firmFlavor: "Quant research",
    topic: "Evaluation",
    prompt: "Two strategies have the same mean excess return. Strategy A has half the volatility of B. Relative Sharpe?",
    choices: [
      { id: "a", text: "A has 2× Sharpe of B.", correct: true },
      { id: "b", text: "A has ½ Sharpe of B.", correct: false },
      { id: "c", text: "Sharpes are equal.", correct: false },
      { id: "d", text: "Need skewness to compare.", correct: false },
    ],
    explain: "Sharpe ≈ excess return / volatility. Same numerator, half denominator → double Sharpe (before costs / multiple testing).",
    sourceNote: "Academy foundations — evaluation hygiene.",
  },
  {
    id: "drill-overfit",
    firmFlavor: "Two Sigma–style research chat",
    topic: "Overfitting",
    prompt: "You mined 500 features on the same sample and kept the best Sharpe. What is the first red flag?",
    choices: [
      { id: "a", text: "Multiple testing / selection bias — the max Sharpe is inflated.", correct: true },
      { id: "b", text: "You should only worry if R² > 0.99.", correct: false },
      { id: "c", text: "Sharpe cannot overfit by definition.", correct: false },
      { id: "d", text: "Use more features next time.", correct: false },
    ],
    explain:
      "Selecting the best of many trials without adjusting for the search inflates in-sample metrics. Prefer holdouts, deflated Sharpe, or fewer degrees of freedom.",
    sourceNote: "Alpha Craft track — iterate like a desk.",
  },
  {
    id: "drill-bayes",
    firmFlavor: "Jane Street–style mental math",
    topic: "Probability",
    prompt:
      "A signal fires true positives 90% of the time when the edge is real, and false-alarms 10% when it is not. Prior that the edge is real: 20%. After a fire, posterior?",
    choices: [
      { id: "a", text: "90%", correct: false },
      { id: "b", text: "≈69%", correct: true },
      { id: "c", text: "20%", correct: false },
      { id: "d", text: "10%", correct: false },
    ],
    explain:
      "P(real|fire) = 0.9·0.2 / (0.9·0.2 + 0.1·0.8) = 0.18 / 0.26 ≈ 0.692. Always multiply likelihood by prior.",
    sourceNote: "Original Bayes drill for Academy Planet.",
  },
  {
    id: "drill-mid",
    firmFlavor: "HFT microstructure",
    topic: "Quotes",
    prompt: "Best bid 100.00, best ask 100.04. What is the touch mid and the half-spread in ticks of 0.01?",
    choices: [
      { id: "a", text: "Mid 100.02; half-spread 2 ticks.", correct: true },
      { id: "b", text: "Mid 100.00; half-spread 4 ticks.", correct: false },
      { id: "c", text: "Mid 100.04; half-spread 0.", correct: false },
      { id: "d", text: "Mid undefined without last trade.", correct: false },
    ],
    explain: "Touch mid = (bid+ask)/2 = 100.02. Full spread = 4 ticks → half-spread = 2 ticks.",
    sourceNote: "Planet concept: BidAskSpread.",
  },
  {
    id: "drill-meta-probe",
    firmFlavor: "Meta learning desk",
    topic: "Study ritual",
    prompt: "A new paper star appears on the Planet. What is the correct first move?",
    choices: [
      { id: "a", text: "Open the PDF and highlight the abstract.", correct: false },
      { id: "b", text: "Answer the probe cold, then ASSESS / open SOURCE.", correct: true },
      { id: "c", text: "Paste a chatbot summary into the graph as CLAIM.", correct: false },
      { id: "d", text: "Skip to Bot Factory without retrieval.", correct: false },
    ],
    explain:
      "Meta track ritual: PROBE → ANSWER → ASSESS → SOURCE. Paper muscle turns one paper into a scaffold, not a two-line blurb.",
    sourceNote: "Academy Meta Learning track — mindcraft paper-muscle / interview prep pillars.",
  },
  {
    id: "drill-rn-measure",
    firmFlavor: "Derivatives interview",
    topic: "Risk-neutral pricing",
    prompt: "In the complete binomial model, risk-neutral pricing is best described as…",
    choices: [
      { id: "a", text: "Maximizing expected return under the physical measure.", correct: false },
      { id: "b", text: "Taking expectation under a measure that makes discounted traded assets martingales (equiv. to replication).", correct: true },
      { id: "c", text: "Deleting losing paths until Sharpe looks good.", correct: false },
      { id: "d", text: "Assuming interest rates are always zero forever.", correct: false },
    ],
    explain: "Replication ↔ RN expectation in the complete binomial setting — Quant 2026 classical rung.",
    sourceNote: "Shreve-shaped ladder (WorldCat) + Academy quant26 track — no textbook dump.",
  },
  {
    id: "drill-lob-fm",
    firmFlavor: "Microstructure research chat",
    topic: "LOB foundation models",
    prompt: "A 2026 LOB/trade-flow foundation model is most responsibly used for…",
    choices: [
      { id: "a", text: "Printing its generated paths as guaranteed alpha.", correct: false },
      { id: "b", text: "Simulation / stress / agent-training environments — still needing holdouts and fill realism.", correct: true },
      { id: "c", text: "Replacing all competitive quoting theory.", correct: false },
      { id: "d", text: "Skipping exchange matching rules entirely.", correct: false },
    ],
    explain: "TradeFM / M3-class models are world-model tools — evaluation debt remains.",
    sourceNote: "arXiv:2602.23784, 2608.19227, 2610.28753 — Quant 2026 track.",
  },
  {
    id: "drill-agentic-eval",
    firmFlavor: "Agentic quant review",
    topic: "Evaluation",
    prompt: "Agentic quant surveys stress that strong forecasting / model skill…",
    choices: [
      { id: "a", text: "Automatically equals live trading performance under reliability controls.", correct: false },
      { id: "b", text: "Does not reliably translate to live performance — match eval to the claimed stage.", correct: true },
      { id: "c", text: "Means you can skip execution and risk modules.", correct: false },
      { id: "d", text: "Removes the need for holdout periods.", correct: false },
    ],
    explain: "arXiv:2608.31041 — workflow integration and matched benchmarks still lag.",
    sourceNote: "Agentic Quantitative Trading survey (2026).",
  },
];

export const PLANET_NODES: PlanetNode[] = [
  {
    id: "tradr-planet",
    kind: "star",
    label: "Tradr Quant Planet",
    gloss: "学习星球 — shared quant ontology for races, desk prep, and research.",
    claim: "Study is PROBE → ANSWER → ASSESS; graphs need SOURCE or silence (mindcraft ethos).",
    source: {
      title: "mindcraft-zttts — galaxy of second brains",
      url: "https://github.com/zhutoutoutousan/mindcraft-zttts",
    },
    orbit: 0,
    angle: 0,
    accent: "#f43f5e",
  },
  {
    id: "domain-mm",
    kind: "domain",
    label: "Market Making",
    gloss: "Two-sided quotes, spreads, competition, learning dynamics.",
    claim: "Makers post bid–ask pairs that set the mid and route inelastic informed flow.",
    orbit: 1,
    angle: 20,
    accent: "#38bdf8",
  },
  {
    id: "domain-micro",
    kind: "domain",
    label: "Microstructure",
    gloss: "Order books, adverse selection, inventory, tick size.",
    orbit: 1,
    angle: 80,
    accent: "#22d3ee",
  },
  {
    id: "domain-eval",
    kind: "domain",
    label: "Evaluation",
    gloss: "Sharpe, costs, multiple testing, holdouts.",
    orbit: 1,
    angle: 150,
    accent: "#a3e635",
  },
  {
    id: "domain-interview",
    kind: "domain",
    label: "Interview Desk",
    gloss: "Retrieval-first drills for quant / trading screens.",
    claim: "Cold answer before opening any model answer — mindcraft interview prep pillar.",
    orbit: 1,
    angle: 220,
    accent: "#fbbf24",
  },
  {
    id: "domain-library",
    kind: "domain",
    label: "Library",
    gloss: "Foundational books — metadata + WorldCat, never pirated PDFs.",
    orbit: 1,
    angle: 290,
    accent: "#c084fc",
  },
  {
    id: "domain-agents",
    kind: "domain",
    label: "AI Agents",
    gloss: "Tools, loops, failure modes — Tradr Bot Factory / Academy Agents track.",
    href: "/academy/tracks/agents",
    orbit: 1,
    angle: 340,
    accent: "#fb923c",
  },
  {
    id: "domain-meta",
    kind: "domain",
    label: "Meta Learning",
    gloss: "形而上学习 — paper muscle, PROBE ritual, bilingual dual study.",
    claim: "Learn how to learn quant; target language rides as DualSubtitle on the same concept.",
    href: "/academy/tracks/meta",
    orbit: 1,
    angle: 310,
    accent: "#22d3ee",
  },
  {
    id: "domain-quant26",
    kind: "domain",
    label: "Quant 2026",
    gloss: "Classical stochastic ladder × 2025–26 FMs, RL makers, agentic quant.",
    claim: "Shreve-shaped map + arXiv anchors — no textbook dumps; PROBE then SOURCE.",
    href: "/academy/tracks/quant26",
    orbit: 1,
    angle: 175,
    accent: "#2dd4bf",
  },
  {
    id: "domain-polyglot",
    kind: "domain",
    label: "Polyglot Desk",
    gloss: "Language pairs + quant lexicon — Concept ↔ Lemma_L1/L2.",
    claim: "Primary gloss + target acquisition; FR/DE and ZH/DE are first-class pairs.",
    href: "/academy/tracks/meta",
    orbit: 1,
    angle: 265,
    accent: "#67e8f9",
  },
  {
    id: "c-spread",
    kind: "concept",
    label: "Bid–Ask Spread",
    gloss: "Compensation for adverse selection, inventory, and competitive risk.",
    orbit: 2,
    angle: 35,
    accent: "#7dd3fc",
  },
  {
    id: "c-nash",
    kind: "concept",
    label: "Competitive Nash Quotes",
    gloss: "Zero-profit PSNE benchmark among strategic makers.",
    orbit: 2,
    angle: 70,
    accent: "#67e8f9",
  },
  {
    id: "c-adverse",
    kind: "concept",
    label: "Adverse Selection",
    gloss: "Informed flow hits your quote when you are wrong.",
    orbit: 2,
    angle: 110,
    accent: "#2dd4bf",
  },
  {
    id: "c-learning",
    kind: "concept",
    label: "No-Regret Learning",
    gloss: "Grid learners approach the continuous Nash envelope as ticks shrink.",
    orbit: 2,
    angle: 5,
    accent: "#93c5fd",
  },
  {
    id: "paper-mm-eq",
    kind: "paper",
    label: "Competitive Market Making (2026)",
    gloss: "Equilibria and Learning in Competitive Market Making — Onger & Foscari.",
    claim:
      "PSNE exists under mild assumptions; spreads widen with volatility; no-internal-regret play approaches the Nash envelope as tick size → 0.",
    source: {
      title: "arXiv:2610.30891",
      url: "https://arxiv.org/abs/2610.30891",
    },
    externalUrl: "https://arxiv.org/pdf/2610.30891",
    orbit: 2,
    angle: 50,
    accent: "#f472b6",
  },
  {
    id: "bridge-mindcraft",
    kind: "bridge",
    label: "mindcraft KG",
    gloss: "Personal ontology OS — weighted graphs, PROBE study, interview banks as SOURCE maps.",
    claim: "Tradr Planet borrows the membrane: shareable V/E + skills; no answer-essay dumps.",
    source: {
      title: "zhutoutoutousan/mindcraft-zttts",
      url: "https://github.com/zhutoutoutousan/mindcraft-zttts",
    },
    externalUrl: "https://github.com/zhutoutoutousan/mindcraft-zttts",
    orbit: 2,
    angle: 250,
    accent: "#e879f9",
  },
  {
    id: "book-green",
    kind: "book",
    label: "Zhou Green Book",
    gloss: PLANET_BOOKS[0].why,
    bookId: "zhou-green",
    externalUrl: PLANET_BOOKS[0].url,
    orbit: 3,
    angle: 270,
    accent: "#86efac",
  },
  {
    id: "book-hull",
    kind: "book",
    label: "Hull OFOD",
    gloss: PLANET_BOOKS[3].why,
    bookId: "hull-ofod",
    externalUrl: PLANET_BOOKS[3].url,
    orbit: 3,
    angle: 300,
    accent: "#d8b4fe",
  },
  {
    id: "book-joshi",
    kind: "book",
    label: "Joshi Interview",
    gloss: PLANET_BOOKS[1].why,
    bookId: "joshi-interview",
    externalUrl: PLANET_BOOKS[1].url,
    orbit: 3,
    angle: 320,
    accent: "#f0abfc",
  },
  {
    id: "drill-vol",
    kind: "drill",
    label: "Spread × Volatility",
    gloss: "Desk probe on competitive spreads under uncertainty.",
    drillId: "drill-spread-vol",
    orbit: 3,
    angle: 25,
    accent: "#fda4af",
  },
  {
    id: "drill-bayes-n",
    kind: "drill",
    label: "Bayes Signal",
    gloss: "Posterior after a noisy fire.",
    drillId: "drill-bayes",
    orbit: 3,
    angle: 200,
    accent: "#fde047",
  },
  {
    id: "lesson-bridge",
    kind: "bridge",
    label: "Academy Lessons",
    gloss: "Structured tracks — Foundations → Signals → Alpha → Agents → Meta.",
    href: "/academy",
    orbit: 2,
    angle: 180,
    accent: "#fbbf24",
  },
  {
    id: "c-paper-muscle",
    kind: "concept",
    label: "Paper Muscle",
    gloss: "One OA paper → domain scaffold, not a two-line abstract.",
    claim: "Ladder prerequisites → measurement → formal frame → figures → bounds; PROBE per rung.",
    href: "/academy/lessons/meta-02-paper-muscle",
    orbit: 2,
    angle: 305,
    accent: "#67e8f9",
  },
  {
    id: "c-dual-subtitle",
    kind: "concept",
    label: "Dual Subtitle Study",
    gloss: "Two languages on one quant concept picture.",
    href: "/academy/lessons/meta-03-polyglot-desk",
    orbit: 2,
    angle: 275,
    accent: "#a5f3fc",
  },
  {
    id: "drill-meta-probe",
    kind: "drill",
    label: "PROBE Ritual",
    gloss: "Cold answer before sources — meta hygiene.",
    drillId: "drill-meta-probe",
    orbit: 3,
    angle: 315,
    accent: "#cffafe",
  },
  {
    id: "paper-tradefm",
    kind: "paper",
    label: "TradeFM (2026)",
    gloss: "Generative foundation model for trade-flow & microstructure.",
    claim: "Scale-invariant trade tokenization + simulator rollouts that reproduce stylized facts; tool for stress/sim — not free alpha.",
    source: { title: "arXiv:2602.23784", url: "https://arxiv.org/abs/2602.23784" },
    externalUrl: "https://arxiv.org/pdf/2602.23784",
    orbit: 2,
    angle: 165,
    accent: "#5eead4",
  },
  {
    id: "paper-agentic-survey",
    kind: "paper",
    label: "Agentic Quant Survey (2026)",
    gloss: "Workflows, systems, evaluation across the trading stack.",
    claim: "Systems cluster on signals; portfolio/execution/risk integration and matched eval still lag.",
    source: { title: "arXiv:2608.31041", url: "https://arxiv.org/abs/2608.31041" },
    externalUrl: "https://arxiv.org/pdf/2608.31041",
    href: "/academy/lessons/q26-12-agentic-survey",
    orbit: 2,
    angle: 195,
    accent: "#14b8a6",
  },
  {
    id: "paper-marl-mm",
    kind: "paper",
    label: "MARL MM / Collusion (2025)",
    gloss: "Multi-agent RL market making — competition without collusion lens.",
    claim: "Interaction metrics and incentive design shape emergent maker behavior.",
    source: { title: "arXiv:2510.25929", url: "https://arxiv.org/abs/2510.25929" },
    externalUrl: "https://arxiv.org/pdf/2510.25929",
    orbit: 2,
    angle: 95,
    accent: "#f472b6",
  },
  {
    id: "book-shreve-ii",
    kind: "book",
    label: "Shreve II",
    gloss: PLANET_BOOKS.find((b) => b.id === "shreve-ii")?.why ?? "Continuous-time stochastic finance map.",
    bookId: "shreve-ii",
    externalUrl: "https://www.worldcat.org/search?q=Stochastic+Calculus+for+Finance+II+Shreve",
    orbit: 3,
    angle: 285,
    accent: "#99f6e4",
  },
  {
    id: "drill-rn",
    kind: "drill",
    label: "Risk-Neutral Probe",
    gloss: "Binomial RN pricing vs physical optimism.",
    drillId: "drill-rn-measure",
    orbit: 3,
    angle: 155,
    accent: "#5eead4",
  },
  {
    id: "drill-lob-fm-n",
    kind: "drill",
    label: "LOB FM Use",
    gloss: "Responsible use of microstructure foundation models.",
    drillId: "drill-lob-fm",
    orbit: 3,
    angle: 175,
    accent: "#2dd4bf",
  },
  {
    id: "drill-agentic-n",
    kind: "drill",
    label: "Agentic Eval",
    gloss: "Forecast skill ≠ live trading under controls.",
    drillId: "drill-agentic-eval",
    orbit: 3,
    angle: 210,
    accent: "#0d9488",
  },
  {
    id: "bridge-quant26",
    kind: "bridge",
    label: "Quant 2026 Track",
    gloss: "13 lessons — classical ladder × 2025–26 research.",
    href: "/academy/tracks/quant26",
    orbit: 2,
    angle: 140,
    accent: "#2dd4bf",
  },
];

export const PLANET_EDGES: PlanetEdge[] = [
  { from: "domain-mm", to: "tradr-planet", label: "ISA" },
  { from: "domain-micro", to: "tradr-planet", label: "ISA" },
  { from: "domain-eval", to: "tradr-planet", label: "ISA" },
  { from: "domain-interview", to: "tradr-planet", label: "ISA" },
  { from: "domain-library", to: "tradr-planet", label: "ISA" },
  { from: "domain-agents", to: "tradr-planet", label: "ISA" },
  { from: "domain-meta", to: "tradr-planet", label: "ISA" },
  { from: "domain-polyglot", to: "tradr-planet", label: "ISA" },
  { from: "domain-quant26", to: "tradr-planet", label: "ISA" },
  { from: "bridge-quant26", to: "domain-quant26", label: "STUDIES" },
  { from: "paper-tradefm", to: "domain-quant26", label: "INFORMS" },
  { from: "paper-tradefm", to: "domain-micro", label: "INFORMS" },
  { from: "paper-agentic-survey", to: "domain-quant26", label: "INFORMS" },
  { from: "paper-agentic-survey", to: "domain-agents", label: "INFORMS" },
  { from: "paper-marl-mm", to: "domain-mm", label: "INFORMS" },
  { from: "paper-marl-mm", to: "domain-quant26", label: "INFORMS" },
  { from: "paper-mm-eq", to: "domain-quant26", label: "INFORMS" },
  { from: "book-shreve-ii", to: "domain-library", label: "ISA" },
  { from: "book-shreve-ii", to: "domain-quant26", label: "PREPARES" },
  { from: "drill-rn", to: "domain-quant26", label: "PREPARES" },
  { from: "drill-lob-fm-n", to: "paper-tradefm", label: "STUDIES" },
  { from: "drill-agentic-n", to: "paper-agentic-survey", label: "STUDIES" },
  { from: "c-paper-muscle", to: "domain-quant26", label: "APPLIES" },
  { from: "c-spread", to: "domain-mm", label: "GROUNDS_IN" },
  { from: "c-nash", to: "domain-mm", label: "GROUNDS_IN" },
  { from: "c-learning", to: "domain-mm", label: "GROUNDS_IN" },
  { from: "c-adverse", to: "domain-micro", label: "GROUNDS_IN" },
  { from: "c-spread", to: "domain-micro", label: "INFORMS" },
  { from: "paper-mm-eq", to: "domain-mm", label: "INFORMS" },
  { from: "paper-mm-eq", to: "c-nash", label: "APPLIES" },
  { from: "paper-mm-eq", to: "c-learning", label: "APPLIES" },
  { from: "paper-mm-eq", to: "c-spread", label: "INFORMS" },
  { from: "drill-vol", to: "paper-mm-eq", label: "STUDIES" },
  { from: "drill-vol", to: "domain-interview", label: "PREPARES" },
  { from: "drill-bayes-n", to: "domain-interview", label: "PREPARES" },
  { from: "book-green", to: "domain-library", label: "ISA" },
  { from: "book-hull", to: "domain-library", label: "ISA" },
  { from: "book-joshi", to: "domain-library", label: "ISA" },
  { from: "book-green", to: "domain-interview", label: "PREPARES" },
  { from: "book-joshi", to: "domain-interview", label: "PREPARES" },
  { from: "bridge-mindcraft", to: "tradr-planet", label: "INFORMS" },
  { from: "bridge-mindcraft", to: "domain-interview", label: "INFORMS" },
  { from: "lesson-bridge", to: "tradr-planet", label: "STUDIES" },
  { from: "c-paper-muscle", to: "domain-meta", label: "GROUNDS_IN" },
  { from: "c-dual-subtitle", to: "domain-polyglot", label: "GROUNDS_IN" },
  { from: "c-dual-subtitle", to: "domain-meta", label: "INFORMS" },
  { from: "c-paper-muscle", to: "paper-mm-eq", label: "APPLIES" },
  { from: "drill-meta-probe", to: "domain-meta", label: "PREPARES" },
  { from: "drill-meta-probe", to: "domain-interview", label: "INFORMS" },
  { from: "domain-polyglot", to: "domain-meta", label: "INFORMS" },
];

export function getPlanetNode(id: string): PlanetNode | undefined {
  return PLANET_NODES.find((n) => n.id === id);
}

export function getPlanetDrill(id: string): PlanetDrill | undefined {
  return PLANET_DRILLS.find((d) => d.id === id);
}

export function getPlanetBook(id: string): PlanetBook | undefined {
  return PLANET_BOOKS.find((b) => b.id === id);
}

export function neighborsOf(id: string): { edge: PlanetEdge; node: PlanetNode }[] {
  const out: { edge: PlanetEdge; node: PlanetNode }[] = [];
  for (const e of PLANET_EDGES) {
    if (e.from === id) {
      const n = getPlanetNode(e.to);
      if (n) out.push({ edge: e, node: n });
    } else if (e.to === id) {
      const n = getPlanetNode(e.from);
      if (n) out.push({ edge: e, node: n });
    }
  }
  return out;
}
