import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { CommunityGameRow } from "@/lib/game/anonymousGames";
import type { RoundReview } from "@/lib/game/reviews";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function db() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = db();
  if (!sb) return NextResponse.json({ game: null }, { status: 404 });

  const { id } = await params;
  if (!id) return NextResponse.json({ game: null }, { status: 400 });

  const { data, error } = await sb
    .from("anonymous_games")
    .select("id, device_id, created_at, mode, market_label, rank, return_pct, profit, trades, review_json")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("games GET id", error.message);
    return NextResponse.json({ game: null }, { status: 500 });
  }

  if (!data) return NextResponse.json({ game: null }, { status: 404 });

  const game: CommunityGameRow = {
    id: data.id as string,
    deviceId: data.device_id as string,
    createdAt: data.created_at as string,
    mode: data.mode as "solo" | "multiplayer",
    marketLabel: data.market_label as string,
    rank: Number(data.rank),
    returnPct: Number(data.return_pct),
    profit: Number(data.profit),
    trades: Number(data.trades),
    review: data.review_json as Partial<RoundReview> | null,
  };

  return NextResponse.json({ game });
}
