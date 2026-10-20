import { describe, expect, it } from "vitest";
import { FirstTouch, LastNonDirectTouch, type AttributableTouch } from "./attribution-model";

const day = (n: number) => new Date(Date.UTC(2026, 9, n));
const touches: AttributableTouch[] = [
  { id: "ad", channel: "PAID_SEARCH", occurredAt: day(1) },
  { id: "email", channel: "EMAIL", occurredAt: day(5) },
  { id: "direct", channel: "DIRECT", occurredAt: day(8) },
];

describe("attribution", () => {
  it("last non-direct skips a later direct visit", () => {
    expect(new LastNonDirectTouch().attribute(touches, day(10))?.id).toBe("email");
  });

  it("falls back to direct when it is the only touch", () => {
    expect(new LastNonDirectTouch().attribute([touches[2]], day(10))?.id).toBe("direct");
  });

  it("ignores touches outside the lookback window or after the event", () => {
    expect(new LastNonDirectTouch(3).attribute(touches, day(10))?.id).toBe("direct");
    expect(new LastNonDirectTouch().attribute(touches, day(3))?.id).toBe("ad");
  });

  it("first touch credits the earliest touch", () => {
    expect(new FirstTouch().attribute(touches, day(10))?.id).toBe("ad");
  });
});
