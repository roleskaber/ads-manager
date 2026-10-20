import { connection, type NextRequest } from "next/server";
import { metricsRegistry } from "@/server/container";

/** Prometheus scrape endpoint. Set METRICS_TOKEN to require `Authorization: Bearer <token>`. */
export async function GET(request: NextRequest) {
  await connection();

  const token = process.env.METRICS_TOKEN;
  if (token && request.headers.get("authorization") !== `Bearer ${token}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response(await metricsRegistry.metrics(), {
    headers: { "Content-Type": metricsRegistry.contentType, "Cache-Control": "no-store" },
  });
}
