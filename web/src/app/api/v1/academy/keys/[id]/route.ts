import { NextResponse } from "next/server";
import { userClient } from "@/lib/academy/apiAuth";

export const runtime = "nodejs";

/** Revoke an API key (soft). */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const h = req.headers.get("authorization") || "";
  const token = h.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return NextResponse.json({ error: "missing session bearer" }, { status: 401 });
  const sb = userClient(token);
  if (!sb) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "invalid session" }, { status: 401 });

  const { id } = await ctx.params;
  const { error } = await sb
    .from("academy_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .is("revoked_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  return NextResponse.json({ ok: true });
}
