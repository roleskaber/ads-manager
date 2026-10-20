import type { TrafficChannel } from "@/lib/generated/prisma/enums";

export type FunnelGroupBy = "channel" | "source" | "campaign";

export type FunnelEvent = {
  visitorId: string;
  name: string;
  occurredAt: Date;
  touch: { channel: TrafficChannel; source: string; campaign: string | null } | null;
};

export type FunnelStepResult = { name: string; visitors: number; conversionFromPrevious: number | null; conversionFromStart: number | null };
export type FunnelGroupResult = { key: string; steps: FunnelStepResult[] };
export type FunnelResult = { total: FunnelStepResult[]; groups: FunnelGroupResult[] };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Strict ordered funnel: a visitor reaches step N only if they did step N after reaching step N-1,
 * within `windowDays` of entering the funnel (first step). Each visitor is counted once per step
 * and grouped by the touch credited for their funnel entry.
 */
export function computeFunnel(steps: string[], events: FunnelEvent[], groupBy: FunnelGroupBy, windowDays: number): FunnelResult {
  const byVisitor = new Map<string, FunnelEvent[]>();
  for (const event of events) {
    const list = byVisitor.get(event.visitorId) ?? [];
    list.push(event);
    byVisitor.set(event.visitorId, list);
  }

  const totals = new Array<number>(steps.length).fill(0);
  const groups = new Map<string, number[]>();

  for (const visitorEvents of byVisitor.values()) {
    visitorEvents.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    const progress = walk(steps, visitorEvents, windowDays);
    if (!progress) continue;

    const key = groupKey(progress.entry, groupBy);
    const groupCounts = groups.get(key) ?? new Array<number>(steps.length).fill(0);
    for (let step = 0; step < progress.reached; step++) {
      totals[step]++;
      groupCounts[step]++;
    }
    groups.set(key, groupCounts);
  }

  return {
    total: toSteps(steps, totals),
    groups: [...groups.entries()]
      .map(([key, counts]) => ({ key, steps: toSteps(steps, counts) }))
      .sort((a, b) => b.steps[0].visitors - a.steps[0].visitors),
  };
}

function walk(steps: string[], events: FunnelEvent[], windowDays: number) {
  let reached = 0;
  let entry: FunnelEvent | null = null;

  for (const event of events) {
    if (reached === steps.length) break;
    if (event.name !== steps[reached]) continue;
    if (entry && event.occurredAt.getTime() - entry.occurredAt.getTime() > windowDays * DAY_MS) break;
    entry ??= event;
    reached++;
  }
  return entry ? { entry, reached } : null;
}

function groupKey(entry: FunnelEvent, groupBy: FunnelGroupBy) {
  if (!entry.touch) return "unattributed";
  if (groupBy === "channel") return entry.touch.channel;
  if (groupBy === "source") return entry.touch.source;
  return entry.touch.campaign ?? "(no campaign)";
}

function toSteps(steps: string[], counts: number[]): FunnelStepResult[] {
  return steps.map((name, index) => ({
    name,
    visitors: counts[index],
    conversionFromPrevious: index === 0 ? null : ratio(counts[index], counts[index - 1]),
    conversionFromStart: index === 0 ? null : ratio(counts[index], counts[0]),
  }));
}

function ratio(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 10000) / 10000;
}
