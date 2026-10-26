import { describe, expect, it } from "vitest";
import { hashApiKey, mintApiKeyPlaintext } from "./apiAuth";

describe("academy api key helpers", () => {
  it("mints trad_ keys with stable hash", () => {
    const a = mintApiKeyPlaintext();
    expect(a.plaintext.startsWith("trad_")).toBe(true);
    expect(a.prefix.length).toBe(12);
    expect(hashApiKey(a.plaintext)).toBe(a.hash);
    expect(hashApiKey(a.plaintext + "x")).not.toBe(a.hash);
  });
});
