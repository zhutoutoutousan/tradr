/**
 * Academy polyglot — learn quant while learning a language.
 * Inspired by mindcraft DualSubtitle / GrammarFrame pairing (Concept ↔ Lemma_L1/L2).
 */

export type LangCode = "en" | "zh" | "de" | "fr" | "es" | "ja" | "ru";

export interface LangMeta {
  code: LangCode;
  label: string;
  native: string;
  flag: string;
}

export const LANGS: LangMeta[] = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "zh", label: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
];

export interface AcademyLangSettings {
  /** Language for explanations / L1 gloss */
  primary: LangCode;
  /** Language you are acquiring */
  target: LangCode;
  /** Always show dual columns when bilingual content exists */
  dual: boolean;
}

const KEY = "tradr.academy.lang.v1";

export const DEFAULT_LANG_SETTINGS: AcademyLangSettings = {
  primary: "zh",
  target: "de",
  dual: true,
};

export function langMeta(code: LangCode): LangMeta {
  return LANGS.find((l) => l.code === code) ?? LANGS[0];
}

export function loadLangSettings(): AcademyLangSettings {
  if (typeof window === "undefined") return DEFAULT_LANG_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LANG_SETTINGS;
    const p = JSON.parse(raw) as Partial<AcademyLangSettings>;
    const primary = LANGS.some((l) => l.code === p.primary) ? (p.primary as LangCode) : DEFAULT_LANG_SETTINGS.primary;
    let target = LANGS.some((l) => l.code === p.target) ? (p.target as LangCode) : DEFAULT_LANG_SETTINGS.target;
    if (target === primary) {
      target = primary === "en" ? "de" : "en";
    }
    return { primary, target, dual: p.dual !== false };
  } catch {
    return DEFAULT_LANG_SETTINGS;
  }
}

export function saveLangSettings(s: AcademyLangSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

/** Concept → lemmas. Language-neutral id; texts are surface forms / short glosses. */
export interface PolyglotUnit {
  id: string;
  /** Domain tag for filtering */
  topic: string;
  /** Short EN concept label */
  concept: string;
  texts: Partial<Record<LangCode, string>>;
  /** Optional longer teaching line */
  notes?: Partial<Record<LangCode, string>>;
}

/** Quant desk lexicon for dual-subtitle study. */
export const QUANT_LEXICON: PolyglotUnit[] = [
  {
    id: "bid-ask",
    topic: "microstructure",
    concept: "Bid–ask spread",
    texts: {
      en: "Bid–ask spread — the gap between best buy and sell quotes.",
      zh: "买卖价差——最优买价与卖价之间的差距。",
      de: "Geld-Brief-Spanne — Abstand zwischen bestem Kauf- und Verkaufskurs.",
      fr: "Écart acheteur-vendeur — écart entre le meilleur bid et le meilleur ask.",
      es: "Spread bid-ask — diferencia entre la mejor compra y venta.",
      ja: "ビッド・アスク・スプレッド——最良買い気配と売り気配の差。",
      ru: "Спред bid–ask — разница между лучшей покупкой и продажей.",
    },
  },
  {
    id: "adverse-selection",
    topic: "microstructure",
    concept: "Adverse selection",
    texts: {
      en: "Adverse selection — trading against better-informed flow.",
      zh: "逆向选择——与信息更充分的对手成交。",
      de: "Adverse Selektion — Handel gegen besser informierten Flow.",
      fr: "Sélection adverse — trader contre un flux mieux informé.",
      es: "Selección adversa — operar contra flujo mejor informado.",
      ja: "逆選択——より情報を持つ相手と取引してしまうこと。",
      ru: "Неблагоприятный отбор — сделка против более информированного потока.",
    },
  },
  {
    id: "sharpe",
    topic: "evaluation",
    concept: "Sharpe ratio",
    texts: {
      en: "Sharpe ratio — excess return per unit of volatility.",
      zh: "夏普比率——单位波动所对应的超额收益。",
      de: "Sharpe-Ratio — Überrendite je Einheit Volatilität.",
      fr: "Ratio de Sharpe — rendement excédentaire par unité de volatilité.",
      es: "Ratio de Sharpe — exceso de rentabilidad por unidad de volatilidad.",
      ja: "シャープレシオ——変動性一単位あたりの超過リターン。",
      ru: "Коэффициент Шарпа — избыточная доходность на единицу волатильности.",
    },
  },
  {
    id: "overfitting",
    topic: "evaluation",
    concept: "Overfitting",
    texts: {
      en: "Overfitting — a model that memorizes noise instead of signal.",
      zh: "过拟合——模型记住了噪声而非信号。",
      de: "Überanpassung — ein Modell merkt sich Rauschen statt Signal.",
      fr: "Surapprentissage — un modèle mémorise le bruit plutôt que le signal.",
      es: "Sobreajuste — un modelo memoriza ruido en lugar de señal.",
      ja: "過学習——モデルがシグナルではなくノイズを覚えてしまうこと。",
      ru: "Переобучение — модель запоминает шум вместо сигнала.",
    },
  },
  {
    id: "nash-mm",
    topic: "market-making",
    concept: "Competitive Nash quotes",
    texts: {
      en: "Competitive Nash quotes — zero-profit equilibrium among strategic market makers.",
      zh: "竞争性纳什报价——做市商零利润均衡。",
      de: "Kompetitive Nash-Quotes — Nullgewinn-Gleichgewicht strategischer Market Maker.",
      fr: "Quotes de Nash concurrentielles — équilibre à profit nul entre teneurs de marché.",
      es: "Cotizaciones de Nash competitivas — equilibrio de beneficio cero entre market makers.",
      ja: "競争的ナッシュ気配——戦略的マーケットメイカー間のゼロ利潤均衡。",
      ru: "Конкурентные котировки Нэша — равновесие с нулевой прибылью маркет-мейкеров.",
    },
  },
  {
    id: "paper-muscle",
    topic: "meta",
    concept: "Paper muscle",
    texts: {
      en: "Paper muscle — turn one paper into a domain scaffold, not a two-line summary.",
      zh: "论文肌肉——把一篇论文变成领域脚手架，而不是两行摘要。",
      de: "Paper-Muskel — aus einem Paper ein Domänengerüst machen, keinen Zwei-Zeilen-Abstract.",
      fr: "Muscle papier — transformer un article en échafaudage de domaine, pas un résumé de deux lignes.",
      es: "Músculo de paper — convertir un paper en andamiaje de dominio, no un resumen de dos líneas.",
      ja: "論文マッスル——論文を二行要約ではなく領域の足場にする。",
      ru: "Мышца статьи — превратить статью в каркас домена, а не в двухстрочное резюме.",
    },
  },
  {
    id: "probe-answer",
    topic: "meta",
    concept: "PROBE → ANSWER → ASSESS",
    texts: {
      en: "PROBE first — answer cold, then assess, then open sources.",
      zh: "先 PROBE——冷答，再评估，最后才打开资料。",
      de: "Zuerst PROBE — kalt antworten, dann bewerten, erst danach Quellen öffnen.",
      fr: "PROBE d'abord — répondre à froid, puis évaluer, puis ouvrir les sources.",
      es: "PROBE primero — responder en frío, luego evaluar, luego abrir fuentes.",
      ja: "まず PROBE——冷ややかに答え、評価し、その後に資料を開く。",
      ru: "Сначала PROBE — ответь холодно, затем оцени, потом открой источники.",
    },
  },
  {
    id: "dual-subtitle",
    topic: "meta",
    concept: "Dual subtitle study",
    texts: {
      en: "Dual subtitles — two languages on one concept picture.",
      zh: "双语字幕——同一概念画面上叠两种语言。",
      de: "Dual-Untertitel — zwei Sprachen auf einem Begriffsbild.",
      fr: "Sous-titres duals — deux langues sur une même image conceptuelle.",
      es: "Subtítulos duales — dos idiomas sobre una misma imagen conceptual.",
      ja: "二重字幕——一つの概念画面に二言語。",
      ru: "Двойные субтитры — два языка на одной концептуальной картинке.",
    },
  },
];

export function lexiconByTopic(topic?: string): PolyglotUnit[] {
  if (!topic) return QUANT_LEXICON;
  return QUANT_LEXICON.filter((u) => u.topic === topic);
}

export function getLexiconUnit(id: string): PolyglotUnit | undefined {
  return QUANT_LEXICON.find((u) => u.id === id);
}

/** Resolve bilingual cards for a lesson (ids first, then topics). */
export function lexiconForLesson(opts: {
  polyglotIds?: string[];
  polyglotTopics?: string[];
  sectionIds?: string[];
}): PolyglotUnit[] {
  const seen = new Set<string>();
  const out: PolyglotUnit[] = [];
  const push = (u?: PolyglotUnit) => {
    if (!u || seen.has(u.id)) return;
    seen.add(u.id);
    out.push(u);
  };
  for (const id of opts.polyglotIds ?? []) push(getLexiconUnit(id));
  for (const id of opts.sectionIds ?? []) push(getLexiconUnit(id));
  for (const topic of opts.polyglotTopics ?? []) {
    for (const u of lexiconByTopic(topic)) push(u);
  }
  return out;
}

export function pickPairTexts(
  unit: PolyglotUnit,
  settings: AcademyLangSettings,
): { primary?: string; target?: string; concept: string } {
  return {
    concept: unit.concept,
    primary: unit.texts[settings.primary] ?? unit.texts.en,
    target: unit.texts[settings.target] ?? unit.texts.en,
  };
}

/** Suggested pairs for the settings UI. */
export const SUGGESTED_PAIRS: { primary: LangCode; target: LangCode; blurb: string }[] = [
  { primary: "zh", target: "de", blurb: "中文讲解 · Deutsch erwerben" },
  { primary: "zh", target: "fr", blurb: "中文讲解 · apprendre le français" },
  { primary: "en", target: "de", blurb: "English gloss · Deutsch lernen" },
  { primary: "en", target: "fr", blurb: "English gloss · français" },
  { primary: "de", target: "fr", blurb: "Deutsch ↔ Français bridge" },
  { primary: "fr", target: "de", blurb: "Français ↔ Deutsch bridge" },
  { primary: "zh", target: "ja", blurb: "中文 · 日本語" },
  { primary: "en", target: "es", blurb: "English · Español" },
];
