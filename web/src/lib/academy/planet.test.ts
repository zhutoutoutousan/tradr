import { describe, expect, it } from "vitest";
import {
  PLANET_BOOKS,
  PLANET_DRILLS,
  PLANET_EDGES,
  PLANET_NODES,
  getPlanetDrill,
  getPlanetNode,
  neighborsOf,
} from "./planet";

describe("learning planet graph", () => {
  it("has unique node ids and a core star", () => {
    const ids = PLANET_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getPlanetNode("tradr-planet")?.kind).toBe("star");
  });

  it("edges only reference existing nodes", () => {
    const ids = new Set(PLANET_NODES.map((n) => n.id));
    for (const e of PLANET_EDGES) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });

  it("features the competitive market-making paper", () => {
    const paper = getPlanetNode("paper-mm-eq");
    expect(paper?.externalUrl).toContain("2610.30891");
    expect(paper?.source?.url).toContain("arxiv.org");
  });

  it("links mindcraft as a bridge SOURCE", () => {
    const bridge = getPlanetNode("bridge-mindcraft");
    expect(bridge?.externalUrl).toContain("mindcraft-zttts");
  });

  it("has original drills with exactly one correct choice each", () => {
    expect(PLANET_DRILLS.length).toBeGreaterThanOrEqual(5);
    for (const d of PLANET_DRILLS) {
      expect(d.choices.filter((c) => c.correct)).toHaveLength(1);
      expect(getPlanetDrill(d.id)?.id).toBe(d.id);
    }
  });

  it("library books point at WorldCat/search, not raw PDF mirrors", () => {
    for (const b of PLANET_BOOKS) {
      expect(b.url).toMatch(/^https?:\/\//);
      expect(b.url).not.toMatch(/libgen|sci-hub|zlib/i);
    }
  });

  it("neighborsOf returns connected nodes", () => {
    const n = neighborsOf("paper-mm-eq");
    expect(n.length).toBeGreaterThan(0);
    expect(n.some((x) => x.node.id === "domain-mm")).toBe(true);
  });

  it("includes meta learning and polyglot domains", () => {
    expect(getPlanetNode("domain-meta")?.href).toBe("/academy/tracks/meta");
    expect(getPlanetNode("c-dual-subtitle")?.href).toContain("meta-03");
    expect(getPlanetDrill("drill-meta-probe")?.choices.filter((c) => c.correct)).toHaveLength(1);
  });
});
