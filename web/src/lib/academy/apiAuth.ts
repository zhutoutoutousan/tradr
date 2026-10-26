/**
 * Tradr Academy API auth — Bearer trad_… keys + optional dogfood env key.
 */

import { createHash, randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_KEY_SCOPES,
  type AcademyScope,
  type PlanTier,
  scopesAllow,
} from "./connectors";

export interface ApiPrincipal {
  userId: string;
  keyId: string;
  scopes: AcademyScope[];
  plan: PlanTier;
  via: "db" | "dogfood";
}

function anonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function userClient(accessToken: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function mintApiKeyPlaintext(): { plaintext: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString("base64url");
  const plaintext = `trad_${raw}`;
  return { plaintext, prefix: plaintext.slice(0, 12), hash: hashApiKey(plaintext) };
}

function parseBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function dogfoodPrincipal(token: string): ApiPrincipal | null {
  const dog = process.env.TRADR_DOGFOOD_API_KEY?.trim();
  if (!dog || token !== dog) return null;
  const userId = process.env.TRADR_DOGFOOD_USER_ID?.trim() || "00000000-0000-4000-8000-000000000001";
  const scopesEnv = process.env.TRADR_DOGFOOD_SCOPES?.trim();
  const scopes = (scopesEnv
    ? (scopesEnv.split(",").map((s) => s.trim()) as AcademyScope[])
    : ([...DEFAULT_KEY_SCOPES, "study:write", "planet:share"] as AcademyScope[]));
  return {
    userId,
    keyId: "dogfood",
    scopes,
    plan: (process.env.TRADR_DOGFOOD_PLAN as PlanTier) || "pro",
    via: "dogfood",
  };
}

export async function authenticateApiRequest(req: Request): Promise<ApiPrincipal | null> {
  const token = parseBearer(req);
  if (!token) return null;

  const dog = dogfoodPrincipal(token);
  if (dog) return dog;

  if (!token.startsWith("trad_")) return null;
  const sb = anonClient();
  if (!sb) return null;

  const hash = hashApiKey(token);
  const { data, error } = await sb.rpc("academy_lookup_api_key", { p_key_hash: hash });
  if (error || !data?.length) return null;
  const row = data[0] as { key_id: string; user_id: string; scopes: string[] };
  void sb.rpc("academy_touch_api_key", { p_key_id: row.key_id });
  return {
    userId: row.user_id,
    keyId: row.key_id,
    scopes: row.scopes as AcademyScope[],
    plan: "free",
    via: "db",
  };
}

export function requireScope(principal: ApiPrincipal, scope: AcademyScope): boolean {
  return scopesAllow(principal.scopes, scope);
}

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
