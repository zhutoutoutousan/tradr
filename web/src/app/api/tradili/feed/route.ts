import { NextResponse } from "next/server";
import { fetchTradiliInfoFeed } from "@/lib/tradili/feeds";

export const revalidate = 600;

export async function GET() {
  try {
    const { news, blogs, papers } = await fetchTradiliInfoFeed();
    return NextResponse.json(
      { news, blogs, papers, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      },
    );
  } catch (err) {
    console.warn("tradili feed failed", err);
    return NextResponse.json(
      { news: [], blogs: [], papers: [], fetchedAt: new Date().toISOString() },
      { status: 200 },
    );
  }
}
