import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getApiActor } from "@/server/auth/api-actor";
import { funnelService } from "@/server/container";
import { TeamError } from "@/server/team/team-error";

const DAY_MS = 24 * 60 * 60 * 1000;

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupBy: z.enum(["channel", "source", "campaign"]).default("channel"),
});

/** GET /api/funnels/:id/report?from=2026-09-01&to=2026-09-30&groupBy=campaign */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/funnels/[funnelId]/report">) {
  const actor = await getApiActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: "invalid_query", issues: query.error.issues }, { status: 400 });

  const to = query.data.to ?? new Date();
  const from = query.data.from ?? new Date(to.getTime() - 30 * DAY_MS);

  try {
    const { funnelId } = await params;
    return NextResponse.json(await funnelService.report(actor, funnelId, { from, to, groupBy: query.data.groupBy }));
  } catch (error) {
    if (error instanceof TeamError) return NextResponse.json({ error: error.code }, { status: 404 });
    throw error;
  }
}
