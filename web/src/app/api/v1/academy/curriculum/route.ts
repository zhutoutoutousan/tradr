import { NextResponse } from "next/server";
import { authenticateApiRequest, jsonError, requireScope } from "@/lib/academy/apiAuth";
import { LESSONS, TRACKS } from "@/lib/academy/curriculum";
import { QUANT26_PAPERS } from "@/lib/academy/quant2026";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const principal = await authenticateApiRequest(req);
  if (!principal) return jsonError(401, "invalid or missing TRADR_API_KEY");
  if (!requireScope(principal, "planet:read")) return jsonError(403, "missing scope planet:read");

  const track = new URL(req.url).searchParams.get("track");
  const lessons = track ? LESSONS.filter((l) => l.trackId === track) : LESSONS;

  return NextResponse.json({
    tracks: TRACKS,
    lessons: lessons.map((l) => ({
      id: l.id,
      trackId: l.trackId,
      order: l.order,
      title: l.title,
      summary: l.summary,
      minutes: l.minutes,
      kind: l.kind,
      xp: l.xp,
      polyglotTopics: l.polyglotTopics,
      polyglotIds: l.polyglotIds,
    })),
    quant26Papers: QUANT26_PAPERS,
  });
}
