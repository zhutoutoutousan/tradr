import { describe, expect, it } from "vitest";
import {
  DEFAULT_KEY_SCOPES,
  MCP_TOOL_SPECS,
  PRO_SCOPES,
  buildCursorMcpDeeplink,
  claudeCodeEnvHint,
  fragmentLooksPrivate,
  scopesAllow,
  toolAllowed,
  type VaultFragment,
} from "./connectors";

describe("academy connectors contracts", () => {
  it("defaults keys to read-only scopes", () => {
    expect(DEFAULT_KEY_SCOPES).toEqual(["planet:read", "lexicon:read"]);
    expect(PRO_SCOPES).toEqual(expect.arrayContaining(["planet:invade", "vault:sync"]));
  });

  it("builds a secret-free Cursor MCP deeplink", () => {
    const link = buildCursorMcpDeeplink({ url: "https://mcp.example.com/academy" });
    expect(link.startsWith("cursor://anysphere.cursor-deeplink/mcp/install?")).toBe(true);
    expect(link).toContain("tradr-academy");
    expect(link).not.toMatch(/sk-|trad_[a-z0-9]{20,}/i);
  });

  it("documents Claude Code env hint without embedding a real key", () => {
    expect(claudeCodeEnvHint()).toContain("TRADR_API_KEY");
    expect(claudeCodeEnvHint()).toContain("trad_…");
  });

  it("flags private-looking vault fragments", () => {
    const clean: VaultFragment = {
      id: "f1",
      label: "mm",
      nodes: [{ id: "c-spread", kind: "concept", label: "Spread", gloss: "bid ask" }],
      edges: [],
      exportedAt: "2026-10-26T00:00:00Z",
    };
    expect(fragmentLooksPrivate(clean)).toBe(false);
    expect(
      fragmentLooksPrivate({
        ...clean,
        nodes: [{ ...clean.nodes[0], gloss: "see .private/health.fu.md" }],
      }),
    ).toBe(true);
  });

  it("gates invade tools on Pro plan", () => {
    const invade = MCP_TOOL_SPECS.find((t) => t.name === "planet.invade")!;
    expect(toolAllowed(invade, ["planet:invade"], "free")).toEqual({ ok: false, reason: "plan" });
    expect(toolAllowed(invade, ["planet:invade"], "pro")).toEqual({ ok: true });
    expect(toolAllowed(invade, ["planet:read"], "pro")).toEqual({ ok: false, reason: "scope" });
  });

  it("checks scopes", () => {
    expect(scopesAllow(["planet:read"], "planet:read")).toBe(true);
    expect(scopesAllow(["planet:read"], "study:write")).toBe(false);
  });
});
