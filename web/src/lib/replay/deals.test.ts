import { describe, expect, it } from "vitest";
import { chatFromRecording, dealsFromRecording, tickToBarTime } from "./deals";
import type { ReplayCandle, ReplayRecording } from "./types";

function candle(time: number, close: number): ReplayCandle {
  return [time, close - 0.1, close + 0.2, close - 0.2, close];
}

function sampleRec(): ReplayRecording {
  return {
    v: 1,
    mode: "solo",
    marketId: "synthetic",
    marketLabel: "TEST",
    msPerTick: 100,
    startedAt: 0,
    startTick: 0,
    durationTicks: 25,
    history: [candle(1000, 1.5)],
    bars: [
      { t: 0, c: candle(1000, 1.5) },
      { t: 10, c: candle(1010, 2) },
      { t: 20, c: candle(1020, 2.1) },
    ],
    prices: [],
    participants: [
      { id: "you", name: "You", color: "#34d399", kind: "me" },
      { id: "bot-1", name: "Bot", color: "#60a5fa", kind: "bot" },
    ],
    events: [
      { t: 5, k: "open", id: "you", side: "long", price: 1.6 },
      { t: 8, k: "chat", id: "you", name: "You", text: "long" },
      { t: 15, k: "close", id: "you", price: 2.0, pnl: 0.4 },
      { t: 12, k: "open", id: "bot-1", side: "short", price: 1.9 },
      { t: 18, k: "close", id: "bot-1", price: 1.7, pnl: 0.2 },
      { t: 19, k: "chat", id: "bot-1", name: "Bot", text: "nice" },
    ],
    samples: [],
  };
}

describe("dealsFromRecording", () => {
  it("pairs open/close into MT5 deals with candle times", () => {
    const rec = sampleRec();
    expect(tickToBarTime(rec, 5)).toBe(1000);
    expect(tickToBarTime(rec, 15)).toBe(1010);

    const deals = dealsFromRecording(rec);
    expect(deals).toHaveLength(2);
    const you = deals.find((d) => d.traderId === "you")!;
    expect(you.side).toBe("long");
    expect(you.openBar).toBe(1000);
    expect(you.closeBar).toBe(1010);
    expect(you.traderKind).toBe("player");

    const bot = deals.find((d) => d.traderId === "bot-1")!;
    expect(bot.traderKind).toBe("bot");
    expect(bot.color).toBe("#60a5fa");
  });

  it("respects upToTick for progressive replay overlays", () => {
    const rec = sampleRec();
    expect(dealsFromRecording(rec, 14)).toHaveLength(0);
    expect(dealsFromRecording(rec, 15)).toHaveLength(1);
    expect(dealsFromRecording(rec, 20)).toHaveLength(2);
  });

  it("extracts chat events for box score / review", () => {
    const chat = chatFromRecording(sampleRec());
    expect(chat.map((c) => c.text)).toEqual(["long", "nice"]);
  });
});
