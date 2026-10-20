import type { TrafficChannel } from "@/lib/generated/prisma/enums";

/** What we know about how a visitor arrived on a page. */
export type ArrivalContext = {
  url: URL | null;
  referrer: URL | null;
};

/** A classified marketing touch, ready to be stored as a Touchpoint. */
export type Touch = {
  channel: TrafficChannel;
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  clickId: string | null;
  clickIdType: string | null;
};

/** A rule inspects the arrival and either classifies it or passes (returns null). */
export interface TouchRule {
  classify(arrival: ArrivalContext): Touch | null;
}
