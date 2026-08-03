import { describe, expect, it } from "vitest";
import { median, percentage, bucketize, minutesBetween } from "./stats";

describe("median", () => {
  it("returns null for an empty array", () => {
    expect(median([])).toBeNull();
  });

  it("returns the middle value for an odd-length array, any input order", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("averages the two middle values for an even-length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("percentage", () => {
  it("returns null when the total is zero", () => {
    expect(percentage(0, 0)).toBeNull();
  });

  it("computes a 0-100 percentage", () => {
    expect(percentage(1, 4)).toBe(25);
  });
});

describe("bucketize", () => {
  it("throws when labels don't outnumber edges by exactly one", () => {
    expect(() => bucketize([1], [10], ["a"])).toThrow();
  });

  it("sorts values into ascending half-open buckets", () => {
    const result = bucketize([5, 15, 25, 60, 10], [10, 20, 30], ["<=10", "11-20", "21-30", ">30"]);
    expect(result).toEqual([
      { label: "<=10", count: 2 },
      { label: "11-20", count: 1 },
      { label: "21-30", count: 1 },
      { label: ">30", count: 1 },
    ]);
  });
});

describe("minutesBetween", () => {
  it("computes whole and fractional minutes between two ISO timestamps", () => {
    expect(minutesBetween("2026-08-03T10:00:00Z", "2026-08-03T10:30:00Z")).toBe(30);
    expect(minutesBetween("2026-08-03T10:00:00Z", "2026-08-03T10:00:45Z")).toBe(0.75);
  });
});
