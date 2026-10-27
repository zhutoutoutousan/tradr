import { NextResponse } from "next/server";
import { authenticateApiRequest, jsonError, requireScope } from "@/lib/academy/apiAuth";
import { PLANET_EDGES, PLANET_NODES } from "@/lib/academy/planet";

export const runtime = "nodejs";

/** List Learning Planet nodes (teaching core). */
export async function GET(req: Request) {
  const principal = await authenticateApiRequest(req);
  if (!principal) return jsonError(401, "invalid or missing TRADR_API_KEY");
  if (!requireScope(principal, "planet:read")) return jsonError(403, "missing scope planet:read");

  const q = new URL(req.url).searchParams.get("q")?.toLowerCase().trim();
  let nodes = PLANET_NODES;
  if (q) {
    nodes = nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.gloss.toLowerCase().includes(q) ||
        (n.claim ?? "").toLowerCase().includes(q),
    );
  }

  return NextResponse.json({
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      gloss: n.gloss,
      claim: n.claim,
      source: n.source,
      href: n.href,
      externalUrl: n.externalUrl,
    })),
    edges: PLANET_EDGES,
    principal: { userId: principal.userId, via: principal.via, scopes: principal.scopes },
  });
}
