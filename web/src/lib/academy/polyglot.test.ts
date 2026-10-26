import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANG_SETTINGS,
  QUANT_LEXICON,
  SUGGESTED_PAIRS,
  getLexiconUnit,
  lexiconForLesson,
  lexiconByTopic,
  pickPairTexts,
} from "./polyglot";

describe("academy polyglot", () => {
  it("ships lexicon units with en + at least one other language", () => {
    expect(QUANT_LEXICON.length).toBeGreaterThanOrEqual(6);
    for (const u of QUANT_LEXICON) {
      expect(u.texts.en).toBeTruthy();
      const langs = Object.keys(u.texts).filter((k) => k !== "en");
      expect(langs.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("filters by topic and resolves ids", () => {
    expect(lexiconByTopic("meta").every((u) => u.topic === "meta")).toBe(true);
    expect(getLexiconUnit("bid-ask")?.concept).toMatch(/spread/i);
  });

  it("builds lesson lexicon without duplicates", () => {
    const units = lexiconForLesson({
      polyglotIds: ["bid-ask", "sharpe"],
      polyglotTopics: ["microstructure"],
      sectionIds: ["bid-ask"],
    });
    const ids = units.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("bid-ask");
    expect(ids).toContain("sharpe");
    expect(ids).toContain("adverse-selection");
  });

  it("picks primary/target pair texts with en fallback", () => {
    const unit = getLexiconUnit("sharpe")!;
    const pair = pickPairTexts(unit, { primary: "zh", target: "de", dual: true });
    expect(pair.primary).toMatch(/夏普|Sharpe/);
    expect(pair.target).toMatch(/Sharpe|Überrendite/i);
  });

  it("includes FR↔DE and ZH·FR suggested pairs", () => {
    expect(SUGGESTED_PAIRS.some((p) => p.primary === "fr" && p.target === "de")).toBe(true);
    expect(SUGGESTED_PAIRS.some((p) => p.primary === "zh" && p.target === "fr")).toBe(true);
    expect(DEFAULT_LANG_SETTINGS.dual).toBe(true);
  });
});
