import { NextResponse, type NextRequest } from "next/server";
import { eventIngestionService } from "@/server/container";
import { normalizePayload } from "@/server/tracking/tracking-schema";

const MAX_BODY_BYTES = 64 * 1024;

// The tracker runs on customers' own sites, so any origin may post; the tracking key scopes the data.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tracking-Key",
  "Access-Control-Max-Age": "86400",
};

function reply(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Accepts `{ key, events: [...] }` or a single `{ key, event, anonymousId|userId, url, referrer, ... }`.
 * Body is parsed as JSON regardless of Content-Type so `navigator.sendBeacon` (text/plain) works without preflight.
 */
export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return reply({ error: "payload_too_large" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reply({ error: "invalid_json" }, 400);
  }

  const payload = normalizePayload(body, request.headers.get("x-tracking-key"));
  if (!payload.success) return reply({ error: "invalid_payload", issues: payload.error.issues.map((issue) => issue.message) }, 400);

  const result = await eventIngestionService.ingest(payload.data.key, payload.data.events);
  if (!result.ok) return reply({ error: "invalid_key" }, 401);

  return reply({ accepted: result.accepted, rejected: result.rejected }, 202);
}
