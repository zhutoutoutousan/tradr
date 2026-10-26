import { describe, expect, it } from "vitest";
import { LESSONS, TRACKS, getLesson, lessonsForTrack } from "./curriculum";
import {
  defaultAcademyProgress,
  isTrackUnlocked,
  trackCompletion,
  type AcademyProgress,
} from "./progress";

describe("academy curriculum", () => {
  it("has eight tracks including quant26/meta and unique lesson ids", () => {
    expect(TRACKS).toHaveLength(8);
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TRACKS.some((t) => t.id === "desk")).toBe(true);
    expect(TRACKS.some((t) => t.id === "meta")).toBe(true);
    expect(TRACKS.some((t) => t.id === "quant26")).toBe(true);
    expect(lessonsForTrack("meta").length).toBeGreaterThanOrEqual(4);
    expect(lessonsForTrack("quant26").length).toBeGreaterThanOrEqual(12);
  });

  it("quant26 capstone points at lab and paper muscle", () => {
    const cap = getLesson("q26-13-capstone");
    expect(cap?.botLabHref).toBe("/bots/lab");
    expect(cap?.polyglotIds).toContain("paper-muscle");
  });

  it("meta lessons carry polyglot tags", () => {
    const paper = getLesson("meta-02-paper-muscle");
    expect(paper?.polyglotIds).toContain("paper-muscle");
    expect(paper?.quiz?.length).toBeGreaterThan(0);
  });

  it("orders lessons inside a track", () => {
    const list = lessonsForTrack("foundations");
    expect(list.length).toBeGreaterThan(2);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].order).toBeGreaterThan(list[i - 1].order);
    }
  });

  it("gates signals until foundations progress", () => {
    const empty = defaultAcademyProgress();
    expect(isTrackUnlocked(empty, "foundations")).toBe(true);
    expect(isTrackUnlocked(empty, "signals")).toBe(false);

    const progressed: AcademyProgress = {
      ...empty,
      completedLessons: {
        "fnd-01-race": { at: "t", xp: 40 },
        "fnd-02-pnl": { at: "t", xp: 60 },
      },
    };
    expect(isTrackUnlocked(progressed, "signals")).toBe(true);
    expect(trackCompletion(progressed, "foundations").done).toBe(2);
  });

  it("resolves lessons", () => {
    expect(getLesson("alpha-01-dsl")?.trackId).toBe("alpha-craft");
    expect(getLesson("missing")).toBeUndefined();
  });

  it("does not embed Alpha101 paper formula dumps", () => {
    const blob = JSON.stringify(LESSONS);
    expect(blob).not.toMatch(/rank\(Ts_/i);
    expect(blob).not.toMatch(/indneutralize/i);
  });
});
