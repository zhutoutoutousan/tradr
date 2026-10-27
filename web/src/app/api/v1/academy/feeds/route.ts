import { NextResponse } from "next/server";
import { authenticateApiRequest, jsonError, requireScope } from "@/lib/academy/apiAuth";
import { QUANT_FEED_CATALOG, fetchTradiliInfoFeed } from "@/lib/tradili/feeds";

export const runtime = "nodejs";
export const revalidate = 600;

/** Quant news + blogs + arXiv — for Cursor dogfood study loops. */
export async function GET(req: Request) {
  const principal = await authenticateApiRequest(req);
  if (!principal) return jsonError(401, "invalid or missing TRADR_API_KEY");
  if (!requireScope(principal, "planet:read")) return jsonError(403, "missing scope planet:read");

  const { news, blogs, papers } = await fetchTradiliInfoFeed();
  return NextResponse.json({
    news,
    blogs,
    papers,
    catalog: QUANT_FEED_CATALOG,
    fetchedAt: new Date().toISOString(),
    principal: { via: principal.via },
  });
}
