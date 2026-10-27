import { NextResponse } from "next/server";
import { authenticateApiRequest, jsonError, requireScope } from "@/lib/academy/apiAuth";
import {
  DEFAULT_LANG_SETTINGS,
  QUANT_LEXICON,
  lexiconByTopic,
  pickPairTexts,
  type LangCode,
} from "@/lib/academy/polyglot";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const principal = await authenticateApiRequest(req);
  if (!principal) return jsonError(401, "invalid or missing TRADR_API_KEY");
  if (!requireScope(principal, "lexicon:read")) return jsonError(403, "missing scope lexicon:read");

  const sp = new URL(req.url).searchParams;
  const topic = sp.get("topic") || undefined;
  const primary = (sp.get("primary") as LangCode) || DEFAULT_LANG_SETTINGS.primary;
  const target = (sp.get("target") as LangCode) || DEFAULT_LANG_SETTINGS.target;
  const units = topic ? lexiconByTopic(topic) : QUANT_LEXICON;
  const settings = { primary, target, dual: true };

  return NextResponse.json({
    settings,
    units: units.map((u) => ({
      id: u.id,
      topic: u.topic,
      concept: u.concept,
      pair: pickPairTexts(u, settings),
    })),
  });
}
