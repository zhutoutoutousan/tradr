import { NextResponse } from "next/server";
import { authenticateApiRequest, jsonError, requireScope } from "@/lib/academy/apiAuth";
import { getPlanetDrill, getPlanetNode, neighborsOf } from "@/lib/academy/planet";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const principal = await authenticateApiRequest(req);
  if (!principal) return jsonError(401, "invalid or missing TRADR_API_KEY");
  if (!requireScope(principal, "planet:read")) return jsonError(403, "missing scope planet:read");

  const { id } = await ctx.params;
  const node = getPlanetNode(id);
  if (!node) return jsonError(404, "node not found");

  const drill = node.drillId ? getPlanetDrill(node.drillId) : undefined;
  return NextResponse.json({
    node,
    neighbors: neighborsOf(id).map((x) => ({ label: x.edge.label, node: x.node })),
    drill: drill
      ? {
          id: drill.id,
          firmFlavor: drill.firmFlavor,
          topic: drill.topic,
          prompt: drill.prompt,
          choices: drill.choices.map((c) => ({ id: c.id, text: c.text })),
          /** ASSESS only after client submits — include explain for dogfood study tools */
          explain: drill.explain,
          sourceNote: drill.sourceNote,
          correctChoiceIds: drill.choices.filter((c) => c.correct).map((c) => c.id),
        }
      : null,
  });
}
