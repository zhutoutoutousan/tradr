import { NextResponse } from "next/server";
import { DEFAULT_KEY_SCOPES, type AcademyScope, ALL_ACADEMY_SCOPES } from "@/lib/academy/connectors";
import { mintApiKeyPlaintext, userClient } from "@/lib/academy/apiAuth";

export const runtime = "nodejs";

function sessionToken(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

/** List / mint API keys — requires user Supabase access token (not trad_ key). */
export async function GET(req: Request) {
  const token = sessionToken(req);
  if (!token) return NextResponse.json({ error: "missing session bearer" }, { status: 401 });
  const sb = userClient(token);
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) return NextResponse.json({ error: "invalid session" }, { status: 401 });

  const { data, error } = await sb
    .from("academy_api_keys")
    .select("id, name, key_prefix, scopes, created_at, last_used_at, revoked_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Apply migration 005_academy_api_keys.sql if table missing" },
      { status: 503 },
    );
  }
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: Request) {
  const token = sessionToken(req);
  if (!token) return NextResponse.json({ error: "missing session bearer" }, { status: 401 });
  const sb = userClient(token);
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) return NextResponse.json({ error: "invalid session" }, { status: 401 });

  let body: { name?: string; scopes?: string[] } = {};
  try {
    body = (await req.json()) as { name?: string; scopes?: string[] };
  } catch {
    body = {};
  }

  const name = (body.name || "Cursor dogfood").slice(0, 80);
  const scopes = (body.scopes?.length ? body.scopes : DEFAULT_KEY_SCOPES).filter((s) =>
    (ALL_ACADEMY_SCOPES as string[]).includes(s),
  ) as AcademyScope[];
  if (!scopes.length) return NextResponse.json({ error: "no valid scopes" }, { status: 400 });

  // Refuse Pro-only scopes on mint for now (server plan gate later)
  const safeScopes = scopes.filter((s) => s !== "planet:invade" && s !== "vault:sync");
  const minted = mintApiKeyPlaintext();

  const { data, error } = await sb
    .from("academy_api_keys")
    .insert({
      user_id: userData.user.id,
      name,
      key_prefix: minted.prefix,
      key_hash: minted.hash,
      scopes: safeScopes.length ? safeScopes : DEFAULT_KEY_SCOPES,
    })
    .select("id, name, key_prefix, scopes, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Apply migration 005_academy_api_keys.sql" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    key: data,
    /** Shown once — store in Cursor env TRADR_API_KEY */
    plaintext: minted.plaintext,
  });
}
