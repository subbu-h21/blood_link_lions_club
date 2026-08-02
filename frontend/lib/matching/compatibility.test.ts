import { describe, expect, it } from "vitest";
import { getCompatibleDonorGroups, isCompatibleDonor } from "./compatibility";
import type { BloodGroup } from "@/lib/serialise/blood-group";

// PRD.md §4.7's table, verbatim, keyed by recipient.
const EXPECTED: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
};

describe("getCompatibleDonorGroups", () => {
  for (const [recipient, expected] of Object.entries(EXPECTED) as [BloodGroup, BloodGroup[]][]) {
    it(`matches PRD.md §4.7 exactly for recipient ${recipient}`, () => {
      expect(new Set(getCompatibleDonorGroups(recipient))).toEqual(new Set(expected));
    });
  }
});

describe("isCompatibleDonor", () => {
  it("O- can donate to any recipient (universal donor)", () => {
    for (const recipient of Object.keys(EXPECTED) as BloodGroup[]) {
      expect(isCompatibleDonor("O-", recipient)).toBe(true);
    }
  });

  it("AB+ can only donate to AB+", () => {
    expect(isCompatibleDonor("AB+", "AB+")).toBe(true);
    for (const recipient of Object.keys(EXPECTED) as BloodGroup[]) {
      if (recipient === "AB+") continue;
      expect(isCompatibleDonor("AB+", recipient)).toBe(false);
    }
  });

  it("rejects an incompatible pair (A+ donor to O- recipient)", () => {
    expect(isCompatibleDonor("A+", "O-")).toBe(false);
  });
});
