/**
 * Tradr Academy API / MCP connector contracts (design surface).
 * Product: BYO Cursor / Claude Code → record learning, share/invade planets.
 * mindcraft = later format compatibility only — not a runtime dependency.
 */

export type ConnectorKind = "cursor_mcp" | "claude_code" | "http_api" | "stdio_bridge";

export type AcademyScope =
  | "planet:read"
  | "lexicon:read"
  | "study:write"
  | "planet:share"
  | "planet:invade"
  | "vault:sync";

export const ALL_ACADEMY_SCOPES: AcademyScope[] = [
  "planet:read",
  "lexicon:read",
  "study:write",
  "planet:share",
  "planet:invade",
  "vault:sync",
];

/** Scopes granted on a newly minted key unless the user opts in. */
export const DEFAULT_KEY_SCOPES: AcademyScope[] = ["planet:read", "lexicon:read"];

/** Scopes that require an active Pro (or equivalent) plan. */
export const PRO_SCOPES: AcademyScope[] = ["planet:invade", "vault:sync"];

export type PlanTier = "free" | "pro";

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
  /** Non-secret config (MCP URL label, client name, etc.) */
  config: Record<string, string>;
  status: "active" | "paused" | "error";
  createdAt: string;
}

export type PlanetVisibility = "private" | "unlisted" | "public";

export type InvadeMode = "scout" | "graft" | "contest";

/** Shareable graph fragment — SOURCE required; format-stable for later mindcraft bridge. */
export interface VaultFragment {
  id: string;
  label: string;
  nodes: { id: string; kind: string; label: string; gloss: string; claim?: string; sourceUrl?: string }[];
  edges: { from: string; to: string; label: string; sourceUrl?: string }[];
  /** ISO time when exported from Tradr / external format bridge */
  exportedAt: string;
}

export type McpToolName =
  | "planet.search"
  | "planet.get_node"
  | "lexicon.pair_texts"
  | "study.open_probe"
  | "study.submit_answer"
  | "progress.record"
  | "planet.publish_share"
  | "planet.invade"
  | "vault.export_fragment"
  | "vault.import_fragment";

export interface McpToolSpec {
  name: McpToolName;
  scope: AcademyScope;
  mutates: boolean;
  /** Minimum plan tier to call (enforced server-side). */
  minPlan: PlanTier;
  summary: string;
}

export const MCP_TOOL_SPECS: McpToolSpec[] = [
  {
    name: "planet.search",
    scope: "planet:read",
    mutates: false,
    minPlan: "free",
    summary: "Search teaching core + permitted planet overlays",
  },
  {
    name: "planet.get_node",
    scope: "planet:read",
    mutates: false,
    minPlan: "free",
    summary: "Fetch one node + neighbors + CLAIM/SOURCE",
  },
  {
    name: "lexicon.pair_texts",
    scope: "lexicon:read",
    mutates: false,
    minPlan: "free",
    summary: "Dual-subtitle texts for a lexicon unit under the user’s lang pair",
  },
  {
    name: "study.open_probe",
    scope: "study:write",
    mutates: true,
    minPlan: "free",
    summary: "Open a PROBE for a concept — never invent ANSWER",
  },
  {
    name: "study.submit_answer",
    scope: "study:write",
    mutates: true,
    minPlan: "free",
    summary: "Store human ANSWER for an open PROBE",
  },
  {
    name: "progress.record",
    scope: "study:write",
    mutates: true,
    minPlan: "free",
    summary: "Record a learning event (lesson, drill, lexicon review)",
  },
  {
    name: "planet.publish_share",
    scope: "planet:share",
    mutates: true,
    minPlan: "free",
    summary: "Publish a share slice of the user’s planet (soft-capped on free)",
  },
  {
    name: "planet.invade",
    scope: "planet:invade",
    mutates: true,
    minPlan: "pro",
    summary: "Scout / graft / contest another user’s published planet",
  },
  {
    name: "vault.export_fragment",
    scope: "vault:sync",
    mutates: false,
    minPlan: "pro",
    summary: "Export format-stable V/E fragment JSON",
  },
  {
    name: "vault.import_fragment",
    scope: "vault:sync",
    mutates: true,
    minPlan: "pro",
    summary: "Merge a fragment into the user’s planet overlay",
  },
];

/** Secret-free Cursor deeplink config payload (base64 into install URL). */
export interface CursorMcpInstallConfig {
  url: string;
  /** Optional headers template — use ${env:TRADR_API_KEY}, never literals */
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

/** Example env snippet for Claude Code / generic MCP clients (docs only). */
export function claudeCodeEnvHint(envVar = "TRADR_API_KEY"): string {
  return `export ${envVar}=trad_…   # paste once from Academy → Developers`;
}

/** Reject fragment payloads that look like private personal organs. */
export function fragmentLooksPrivate(fragment: VaultFragment): boolean {
  const blob = JSON.stringify(fragment).toLowerCase();
  return blob.includes(".private/") || blob.includes("private\\") || /ausweis|meldebe|ssn|passport/i.test(blob);
}

export function scopesAllow(have: AcademyScope[], need: AcademyScope): boolean {
  return have.includes(need);
}

/** Server-side gate: scope on key AND plan tier. */
export function toolAllowed(
  tool: McpToolSpec,
  have: AcademyScope[],
  plan: PlanTier,
): { ok: true } | { ok: false; reason: "scope" | "plan" } {
  if (!scopesAllow(have, tool.scope)) return { ok: false, reason: "scope" };
  if (tool.minPlan === "pro" && plan !== "pro") return { ok: false, reason: "plan" };
  return { ok: true };
}
