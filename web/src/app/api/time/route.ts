export const dynamic = "force-dynamic";

/** Server wall clock, so multiplayer clients can agree on start times despite skewed device clocks. */
export function GET() {
  return Response.json({ t: Date.now() }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
