import type { TrafficChannel } from "@/lib/generated/prisma/enums";

export type FunnelEventLabels = {
  company: string;
  event: string;
  channel: TrafficChannel | "NONE";
  source: string;
  medium: string;
  campaign: string;
};

/** Aggregated, low-cardinality counters about tracked events. Per-visitor data never goes here. */
export interface FunnelMetrics {
  recordEvent(labels: FunnelEventLabels): void;
  recordRejected(reason: string): void;
}
