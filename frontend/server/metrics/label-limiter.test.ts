import { describe, expect, it } from "vitest";
import { LabelLimiter } from "./label-limiter";

describe("LabelLimiter", () => {
  it("collapses values beyond the cap into 'other', per scope", () => {
    const limiter = new LabelLimiter(2);
    expect(limiter.limit("acme", "Summer")).toBe("summer");
    expect(limiter.limit("acme", "winter")).toBe("winter");
    expect(limiter.limit("acme", "spring")).toBe("other");
    expect(limiter.limit("acme", "summer")).toBe("summer");
    expect(limiter.limit("globex", "spring")).toBe("spring");
    expect(limiter.limit("acme", null)).toBe("other");
  });
});
