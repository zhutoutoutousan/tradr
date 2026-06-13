import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { normalizeCommunityReview, type CommunityGameRow } from "@/lib/game/anonymousGames";
import type { RoundReview } from "@/lib/game/reviews";
import type { RoundSetup } from "@/lib/game/roundSetup";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function db() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function GET(req: NextRequest) {
  const sb = db();
  if (!sb) return NextResponse.json({ games: [] });

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 24)));
  const cursor = req.nextUrl.searchParams.get("cursor");

  let query = sb
    .from("anonymous_games")
    .select("id, device_id, created_at, mode, market_label, rank, return_pct, profit, trades, review_json, setup_json")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("games GET", error.message);
    return NextResponse.json({ games: [] });
  }

  const games = (data ?? []).map((row) => {
    const base = {
      id: row.id as string,
      deviceId: row.device_id as string,
      createdAt: row.created_at as string,
      mode: row.mode as "solo" | "multiplayer",
      marketLabel: row.market_label as string,
      rank: Number(row.rank),
      returnPct: Number(row.return_pct),
      profit: Number(row.profit),
      trades: Number(row.trades),
      review: row.review_json as Partial<RoundReview> | null,
      setup: (row.setup_json as RoundSetup | null) ?? null,
    };
    return { ...base, review: normalizeCommunityReview(base as CommunityGameRow) };
  });

  const rows = data ?? [];
  const last = rows[rows.length - 1];
  const hasMore = rows.length === limit;
  const nextCursor = hasMore && last ? (last.created_at as string) : null;

  return NextResponse.json({ games, nextCursor, hasMore });
}

export async function POST(req: NextRequest) {
  const sb = db();
  if (!sb) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const deviceId = String(body.deviceId ?? "");
  if (!id || !deviceId) {
    return NextResponse.json({ ok: false, reason: "missing_fields" }, { status: 400 });
  }

  const row = {
    id,
    device_id: deviceId,
    mode: body.mode === "multiplayer" ? "multiplayer" : "solo",
    market_id: String(body.marketId ?? "synthetic"),
    market_label: String(body.marketLabel ?? "Unknown"),
    seed: Number(body.seed ?? 0),
    rank: Math.max(1, Math.min(99, Number(body.rank ?? 1))),
    return_pct: Number(body.returnPct ?? 0),
    profit: Number(body.profit ?? 0),
    trades: Math.max(0, Number(body.trades ?? 0)),
    review_json: body.reviewJson,
    setup_json: body.setupJson ?? null,
  };

  const { error } = await sb.from("anonymous_games").upsert(row, { onConflict: "id" });
  if (error) {
    console.error("games POST", error.message);
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
