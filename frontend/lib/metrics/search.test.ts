import { describe, expect, it } from "vitest";
import { tier1HitRate } from "./search";

describe("tier1HitRate", () => {
  it("returns null rate and zero sample size when everything is null", () => {
    expect(tier1HitRate([null, null])).toEqual({ ratePercent: null, sampleSize: 0 });
  });

  it("excludes nulls from both numerator and denominator", () => {
    // 1 hit, 1 miss, 2 unanswerable (no blood_group / pre-migration row) -
    // rate should be 50%, not 25%.
    expect(tier1HitRate([true, false, null, null])).toEqual({ ratePercent: 50, sampleSize: 2 });
  });

  it("computes 100% when every counted search found stock", () => {
    expect(tier1HitRate([true, true])).toEqual({ ratePercent: 100, sampleSize: 2 });
  });
});
