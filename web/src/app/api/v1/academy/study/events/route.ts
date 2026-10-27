import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateApiRequest, jsonError, requireScope } from "@/lib/academy/apiAuth";

export const runtime = "nodejs";

/** Record a learning event (PROBE answer, lesson done, blog read, …). */
export async function POST(req: Request) {
  const principal = await authenticateApiRequest(req);
  if (!principal) return jsonError(401, "invalid or missing TRADR_API_KEY");
  if (!requireScope(principal, "study:write")) return jsonError(403, "missing scope study:write");

  let body: { kind?: string; payload?: Record<string, unknown>; source?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError(400, "invalid json");
  }
  const kind = (body.kind || "").slice(0, 80);
  if (!kind) return jsonError(400, "kind required");

  if (principal.via === "dogfood") {
    return NextResponse.json({
      ok: true,
      id: `dogfood-${Date.now()}`,
      persisted: false,
      note: "Dogfood key — event acknowledged without DB write",
      kind,
      payload: body.payload ?? {},
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return jsonError(503, "supabase not configured");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await sb.rpc("academy_insert_learning_event", {
    p_user_id: principal.userId,
    p_kind: kind,
    p_payload: body.payload ?? {},
    p_source: body.source || "mcp",
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Apply migration 005_academy_api_keys.sql" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, id: data, persisted: true });
}
