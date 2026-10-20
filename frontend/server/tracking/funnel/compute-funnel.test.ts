import { describe, expect, it } from "vitest";
import { computeFunnel, type FunnelEvent } from "./compute-funnel";

const steps = ["page_view", "lead", "deal"];
const google = { channel: "PAID_SEARCH" as const, source: "google", campaign: "summer" };
const fb = { channel: "ORGANIC_SOCIAL" as const, source: "facebook", campaign: null };
const at = (day: number) => new Date(Date.UTC(2026, 9, day));
const event = (visitorId: string, name: string, day: number, touch: FunnelEvent["touch"] = google): FunnelEvent => ({ visitorId, name, occurredAt: at(day), touch });

describe("computeFunnel", () => {
  it("counts each visitor once per step, in order", () => {
    const result = computeFunnel(steps, [
      event("a", "page_view", 1), event("a", "page_view", 2), event("a", "lead", 3), event("a", "deal", 4),
      event("b", "page_view", 1, fb), event("b", "lead", 2, fb),
      event("c", "page_view", 1, null),
    ], "channel", 30);

    expect(result.total.map((step) => step.visitors)).toEqual([3, 2, 1]);
    expect(result.total[1].conversionFromPrevious).toBeCloseTo(0.6667, 3);
    expect(result.groups.map((group) => [group.key, group.steps.map((step) => step.visitors)])).toEqual([
      ["PAID_SEARCH", [1, 1, 1]],
      ["ORGANIC_SOCIAL", [1, 1, 0]],
      ["unattributed", [1, 0, 0]],
    ]);
  });

  it("does not count steps done out of order or outside the window", () => {
    const result = computeFunnel(steps, [
      event("a", "lead", 1), event("a", "page_view", 2),
      event("b", "page_view", 1), event("b", "lead", 40),
    ], "source", 30);
    expect(result.total.map((step) => step.visitors)).toEqual([2, 0, 0]);
  });

  it("groups by campaign of the funnel entry", () => {
    const result = computeFunnel(steps, [event("a", "page_view", 1), event("b", "page_view", 1, fb)], "campaign", 30);
    expect(result.groups.map((group) => group.key).sort()).toEqual(["(no campaign)", "summer"]);
  });
});
