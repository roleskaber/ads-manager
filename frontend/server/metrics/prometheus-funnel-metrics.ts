import { Counter, type Registry } from "prom-client";
import type { FunnelEventLabels, FunnelMetrics } from "./funnel-metrics";
import { LabelLimiter } from "./label-limiter";

const EVENT_COUNTER = "adsm_funnel_events_total";
const REJECTED_COUNTER = "adsm_tracking_rejected_total";

export class PrometheusFunnelMetrics implements FunnelMetrics {
  private readonly events: Counter<keyof FunnelEventLabels>;
  private readonly rejected: Counter<"reason">;
  private readonly eventNames = new LabelLimiter(100);
  private readonly sources = new LabelLimiter(100);
  private readonly mediums = new LabelLimiter(50);
  private readonly campaigns = new LabelLimiter(300);

  constructor(registry: Registry) {
    this.events = getOrCreate(registry, EVENT_COUNTER, () => new Counter({
      name: EVENT_COUNTER,
      help: "Tracked funnel events by company, event name and attributed marketing touch",
      labelNames: ["company", "event", "channel", "source", "medium", "campaign"],
      registers: [registry],
    }));
    this.rejected = getOrCreate(registry, REJECTED_COUNTER, () => new Counter({
      name: REJECTED_COUNTER,
      help: "Tracking requests rejected before ingestion",
      labelNames: ["reason"],
      registers: [registry],
    }));
  }

  recordEvent({ company, event, channel, source, medium, campaign }: FunnelEventLabels) {
    this.events.inc({
      company,
      channel,
      event: this.eventNames.limit(company, event),
      source: this.sources.limit(company, source),
      medium: this.mediums.limit(company, medium),
      campaign: this.campaigns.limit(company, campaign),
    });
  }

  recordRejected(reason: string) {
    this.rejected.inc({ reason });
  }
}

function getOrCreate<T>(registry: Registry, name: string, create: () => T): T {
  return (registry.getSingleMetric(name) as T | undefined) ?? create();
}
