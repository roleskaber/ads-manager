import type { FunnelMetrics } from "@/server/metrics/funnel-metrics";
import type { AttributionModel } from "./attribution/attribution-model";
import type { Touch } from "./touch/touch";
import { DIRECT_TOUCH, parseUrl, type TouchClassifier } from "./touch/touch-classifier";
import type { TrackedCompany, TouchRecord, TrackingRepository } from "./tracking.repository";
import { trackEventSchema, type TrackEventInput } from "./tracking-schema";
import type { VisitorResolver } from "./visitor-resolver";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 30;
const MAX_BACKFILL_DAYS = 365;
/** The same ad click reported again within this window (reloads, multi-tab) is one touch. */
const TOUCH_DEDUP_MS = 30 * 60 * 1000;

export type IngestResult =
  | { ok: true; accepted: number; rejected: Array<{ index: number; reason: string }> }
  | { ok: false; reason: "invalidKey" };

export class EventIngestionService {
  constructor(
    private readonly repository: TrackingRepository,
    private readonly visitors: VisitorResolver,
    private readonly classifier: TouchClassifier,
    private readonly attribution: AttributionModel,
    private readonly metrics: FunnelMetrics,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async ingest(trackingKey: string, rawEvents: unknown[]): Promise<IngestResult> {
    const company = await this.repository.findCompanyByTrackingKey(trackingKey);
    if (!company) {
      this.metrics.recordRejected("invalid_key");
      return { ok: false, reason: "invalidKey" };
    }

    const rejected: Array<{ index: number; reason: string }> = [];
    let accepted = 0;

    // Sequential on purpose: events in a batch are ordered and may depend on each other (identify → lead).
    for (const [index, raw] of rawEvents.entries()) {
      const parsed = trackEventSchema.safeParse(raw);
      if (!parsed.success) {
        this.metrics.recordRejected("invalid_event");
        rejected.push({ index, reason: parsed.error.issues[0]?.message ?? "invalid event" });
        continue;
      }
      await this.ingestOne(company, parsed.data);
      accepted++;
    }

    return { ok: true, accepted, rejected };
  }

  private async ingestOne(company: TrackedCompany, input: TrackEventInput) {
    const occurredAt = this.eventTime(input.timestamp);
    const visitor = await this.visitors.resolve(company.id, input, occurredAt);
    const touches = await this.repository.findTouches(visitor.id, new Date(occurredAt.getTime() - LOOKBACK_DAYS * DAY_MS));

    const newTouch = this.detectTouch(input, touches, occurredAt);
    if (newTouch) {
      touches.push(await this.repository.createTouch(company.id, visitor.id, newTouch, {
        referrer: input.referrer ?? null,
        landingUrl: input.url ?? null,
        occurredAt,
      }));
    }

    const credited = this.attribution.attribute(touches, occurredAt);
    const touch = credited ? touches.find((candidate) => candidate.id === credited.id) ?? null : null;

    await this.repository.createEvent({
      companyId: company.id,
      visitorId: visitor.id,
      touchpointId: touch?.id ?? null,
      name: input.event,
      url: input.url ?? null,
      properties: input.properties ?? null,
      occurredAt,
    });

    this.metrics.recordEvent({
      company: company.slug,
      event: input.event,
      channel: touch?.channel ?? "NONE",
      source: touch?.source ?? "none",
      medium: touch?.medium ?? "none",
      campaign: touch?.campaign ?? "none",
    });
  }

  /** Only browser events (with a page URL) can reveal how the visitor arrived. */
  private detectTouch(input: TrackEventInput, touches: TouchRecord[], occurredAt: Date): Touch | null {
    if (!input.url) return null;

    const classified = this.classifier.classify({ url: parseUrl(input.url), referrer: parseUrl(input.referrer) });
    if (!classified) return touches.length === 0 ? DIRECT_TOUCH : null;

    const last = touches.at(-1);
    const isRepeat =
      last &&
      occurredAt.getTime() - last.occurredAt.getTime() < TOUCH_DEDUP_MS &&
      last.channel === classified.channel &&
      last.source === classified.source &&
      last.campaign === classified.campaign &&
      last.clickId === classified.clickId;
    return isRepeat ? null : classified;
  }

  private eventTime(timestamp: string | undefined) {
    const now = this.now();
    if (!timestamp) return now;
    const time = new Date(timestamp);
    if (time > now) return now;
    const oldest = new Date(now.getTime() - MAX_BACKFILL_DAYS * DAY_MS);
    return time < oldest ? oldest : time;
  }
}
