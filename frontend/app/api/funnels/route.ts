import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiActor } from "@/server/auth/api-actor";
import { funnelService } from "@/server/container";
import { TeamError } from "@/server/team/team-error";

const createFunnelSchema = z.object({
  name: z.string().trim().min(1).max(80),
  steps: z.array(z.string().trim().min(1).max(64)).min(2).max(10),
  conversionWindowDays: z.number().int().min(1).max(365).default(30),
});

export async function GET() {
  const actor = await getApiActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ funnels: await funnelService.list(actor) });
}

export async function POST(request: Request) {
  const actor = await getApiActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createFunnelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 });

  try {
    return NextResponse.json({ funnel: await funnelService.create(actor, parsed.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof TeamError) return NextResponse.json({ error: error.code }, { status: 403 });
    throw error;
  }
}
