import { ClickIdRule, ReferrerRule, UtmRule } from "./touch-rules";
import type { ArrivalContext, Touch, TouchRule } from "./touch";

export const DIRECT_TOUCH: Touch = {
  channel: "DIRECT",
  source: "direct",
  medium: null,
  campaign: null,
  content: null,
  term: null,
  clickId: null,
  clickIdType: null,
};

/**
 * Runs rules in priority order; the first match wins.
 * Returns null for internal navigation (same-site referrer, no tags) — that is not a new touch.
 */
export class TouchClassifier {
  constructor(private readonly rules: TouchRule[] = [new UtmRule(), new ClickIdRule(), new ReferrerRule()]) {}

  classify(arrival: ArrivalContext): Touch | null {
    for (const rule of this.rules) {
      const touch = rule.classify(arrival);
      if (touch) return touch;
    }
    return null;
  }
}

export function parseUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
