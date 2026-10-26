/**
 * Academy ↔ Cursor MCP / mindcraft connector contracts (design surface).
 * No runtime MCP server yet — types + helpers for upcoming key + sync work.
 */

export type ConnectorKind = "cursor_mcp" | "stdio_bridge" | "mindcraft_git";

export type AcademyScope =
  | "planet:read"
  | "lexicon:read"
  | "study:write"
  | "vault:sync";

export const ALL_ACADEMY_SCOPES: AcademyScope[] = [
  "planet:read",
  "lexicon:read",
  "study:write",
  "vault:sync",
];

export const DEFAULT_KEY_SCOPES: AcademyScope[] = ["planet:read", "lexicon:read"];

/** Metadata row — never store the raw key here. */
export interface AcademyApiKeyMeta {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: AcademyScope[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface AcademyConnector {
  id: string;
  kind: ConnectorKind;
  displayName: string;
  /** Non-secret config (vault repo ref, MCP URL label, etc.) */
  config: Record<string, string>;
  status: "active" | "paused" | "error";
  createdAt: string;
}

/** Shareable graph fragment — SOURCE required; no .private paths. */
export interface VaultFragment {
  id: string;
  label: string;
  nodes: { id: string; kind: string; label: string; gloss: string; claim?: string; sourceUrl?: string }[];
  edges: { from: string; to: string; label: string; sourceUrl?: string }[];
  /** ISO time when exported from mindcraft / Academy */
  exportedAt: string;
}

export type McpToolName =
  | "planet.search"
  | "planet.get_node"
  | "lexicon.pair_texts"
  | "study.open_probe"
  | "study.submit_answer"
  | "vault.export_fragment"
  | "vault.import_fragment";

export interface McpToolSpec {
  name: McpToolName;
  scope: AcademyScope;
  mutates: boolean;
  summary: string;
}

export const MCP_TOOL_SPECS: McpToolSpec[] = [
  {
    name: "planet.search",
    scope: "planet:read",
    mutates: false,
    summary: "Search Learning Planet nodes by label / gloss",
  },
  {
    name: "planet.get_node",
    scope: "planet:read",
    mutates: false,
    summary: "Fetch one planet node + neighbors + CLAIM/SOURCE",
  },
  {
    name: "lexicon.pair_texts",
    scope: "lexicon:read",
    mutates: false,
    summary: "Dual-subtitle texts for a lexicon unit under the user’s lang pair",
  },
  {
    name: "study.open_probe",
    scope: "study:write",
    mutates: true,
    summary: "Open a PROBE for a concept — never invent ANSWER",
  },
  {
    name: "study.submit_answer",
    scope: "study:write",
    mutates: true,
    summary: "Store human ANSWER for an open PROBE",
  },
  {
    name: "vault.export_fragment",
    scope: "vault:sync",
    mutates: false,
    summary: "Export shareable V/E fragment (SOURCE required)",
  },
  {
    name: "vault.import_fragment",
    scope: "vault:sync",
    mutates: true,
    summary: "Merge a personal overlay fragment into the user’s Academy vault",
  },
];

/** Secret-free Cursor deeplink config payload (base64 into install URL). */
export interface CursorMcpInstallConfig {
  url: string;
  /** Optional static headers template — use ${env:TRADR_API_KEY}, never literals */
  headers?: Record<string, string>;
}

function toBase64Url(json: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildCursorMcpDeeplink(cfg: CursorMcpInstallConfig, name = "tradr-academy"): string {
  const config = toBase64Url(JSON.stringify(cfg));
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${config}`;
}

/** Reject fragment paths that look like mindcraft private organs. */
export function fragmentLooksPrivate(fragment: VaultFragment): boolean {
  const blob = JSON.stringify(fragment).toLowerCase();
  return blob.includes(".private/") || blob.includes("private\\") || /ausweis|meldebe|ssn|passport/i.test(blob);
}

export function scopesAllow(have: AcademyScope[], need: AcademyScope): boolean {
  return have.includes(need);
}
