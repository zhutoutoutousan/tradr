import { describe, expect, it } from "vitest";
import { QUANT_FEED_CATALOG } from "./feeds";

describe("tradili quant feed catalog", () => {
  it("lists free news, blogs, and arXiv paper sources", () => {
    expect(QUANT_FEED_CATALOG.some((f) => f.kind === "news" && f.source.includes("BBC"))).toBe(true);
    expect(QUANT_FEED_CATALOG.some((f) => f.kind === "blog" && f.source === "Quantocracy")).toBe(true);
    expect(QUANT_FEED_CATALOG.some((f) => f.kind === "blog" && f.source === "Robot Wealth")).toBe(true);
    expect(QUANT_FEED_CATALOG.some((f) => f.kind === "paper" && /arxiv/i.test(f.url))).toBe(true);
  });
});
