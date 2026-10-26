import { describe, expect, it } from "vitest";
import { QUANT26_LESSONS, QUANT26_PAPERS, QUANT26_TRACK } from "./quant2026";
import { lessonsForTrack } from "./curriculum";

describe("quant 2026 curriculum", () => {
  it("ships a gated track with ordered lessons", () => {
    expect(QUANT26_TRACK.id).toBe("quant26");
    expect(QUANT26_TRACK.requires?.trackId).toBe("foundations");
    const list = lessonsForTrack("quant26");
    expect(list).toHaveLength(QUANT26_LESSONS.length);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].order).toBeGreaterThan(list[i - 1].order);
    }
  });

  it("anchors 2025–2026 arXiv themes without Alpha101 dumps", () => {
    expect(QUANT26_PAPERS.some((p) => p.id === "2610.30891")).toBe(true);
    expect(QUANT26_PAPERS.some((p) => p.id === "2602.23784")).toBe(true);
    expect(QUANT26_PAPERS.some((p) => p.id === "2608.31041")).toBe(true);
    expect(QUANT26_PAPERS.every((p) => p.url.includes("arxiv.org"))).toBe(true);
    const blob = JSON.stringify(QUANT26_LESSONS);
    expect(blob).toMatch(/arXiv:\d{4}\.\d+/);
    expect(blob).not.toMatch(/rank\(Ts_/i);
  });

  it("bridges classical rungs to modern papers in lesson bodies", () => {
    expect(QUANT26_LESSONS.some((l) => /Shreve|binomial|Itô|Girsanov/i.test(JSON.stringify(l)))).toBe(true);
    expect(QUANT26_LESSONS.some((l) => /TradeFM|FLAG-Trader|MARL|agentic/i.test(JSON.stringify(l)))).toBe(true);
  });
});
