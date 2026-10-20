import type { TrafficChannel } from "@/lib/generated/prisma/enums";

export type AttributableTouch = { id: string; channel: TrafficChannel; occurredAt: Date };

/** Picks which touchpoint gets credit for an event. Touches are sorted oldest → newest. */
export interface AttributionModel {
  attribute(touches: AttributableTouch[], eventAt: Date): AttributableTouch | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function eligible(touches: AttributableTouch[], eventAt: Date, lookbackDays: number) {
  const since = eventAt.getTime() - lookbackDays * DAY_MS;
  return touches.filter((touch) => touch.occurredAt.getTime() <= eventAt.getTime() && touch.occurredAt.getTime() >= since);
}

/** Industry default: the latest non-direct touch wins; direct only when nothing else exists. */
export class LastNonDirectTouch implements AttributionModel {
  constructor(private readonly lookbackDays = 30) {}

  attribute(touches: AttributableTouch[], eventAt: Date) {
    const candidates = eligible(touches, eventAt, this.lookbackDays);
    return candidates.findLast((touch) => touch.channel !== "DIRECT") ?? candidates.at(-1) ?? null;
  }
}

export class FirstTouch implements AttributionModel {
  constructor(private readonly lookbackDays = 90) {}

  attribute(touches: AttributableTouch[], eventAt: Date) {
    return eligible(touches, eventAt, this.lookbackDays)[0] ?? null;
  }
}
