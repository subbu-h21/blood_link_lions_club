import { describe, expect, it } from "vitest";
import { isDonorEligible, rankEligibleDonors, type DonorForMatching, type MatchingRequest } from "./eligibility";

const NOW = new Date("2026-08-02T12:00:00Z");
const NOTIF_CAP = 6;

const REQUEST: MatchingRequest = {
  bloodGroup: "O+",
  regionId: "region-1",
};

function baseDonor(overrides: Partial<DonorForMatching> = {}): DonorForMatching {
  return {
    id: "donor-1",
    bloodGroup: "O+",
    regionIds: ["region-1"],
    isAvailable: true,
    pausedUntil: null,
    eligibleFrom: null,
    notifCountMonth: 0,
    notifMonth: null,
    deletedAt: null,
    isBlocked: false,
    hasActivePledge: false,
    lastInvitedAt: null,
    ...overrides,
  };
}

describe("isDonorEligible", () => {
  it("passes when all seven rules hold", () => {
    expect(isDonorEligible(baseDonor(), REQUEST, NOTIF_CAP, NOW)).toBe(true);
  });

  it("rule 1 — excludes an incompatible blood group", () => {
    const donor = baseDonor({ bloodGroup: "A-" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 2 — excludes a donor whose only region doesn't match", () => {
    const donor = baseDonor({ regionIds: ["region-2"] });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 2 — includes a donor eligible via a secondary region, not their home region (multi-pincode availability)", () => {
    const donor = baseDonor({ regionIds: ["region-2", "region-1", "region-3"] });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(true);
  });

  it("rule 2 — excludes a donor whose secondary regions still don't include the request's region", () => {
    const donor = baseDonor({ regionIds: ["region-2", "region-3"] });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 3 — excludes a donor marked unavailable", () => {
    const donor = baseDonor({ isAvailable: false });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 3 — excludes a donor paused until a future date", () => {
    const donor = baseDonor({ pausedUntil: "2026-09-01T00:00:00Z" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 3 — includes a donor whose pause has already passed", () => {
    const donor = baseDonor({ pausedUntil: "2026-01-01T00:00:00Z" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(true);
  });

  it("rule 4 — excludes a donor still in cooldown (eligible_from in the future)", () => {
    const donor = baseDonor({ eligibleFrom: "2026-09-01T00:00:00Z" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 4 — includes a donor whose cooldown has already passed", () => {
    const donor = baseDonor({ eligibleFrom: "2026-01-01T00:00:00Z" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(true);
  });

  it("rule 5 — excludes a soft-deleted donor", () => {
    const donor = baseDonor({ deletedAt: "2026-01-01T00:00:00Z" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 5 — excludes a blocked donor", () => {
    const donor = baseDonor({ isBlocked: true });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 6 — excludes a donor who has exhausted this month's notification cap", () => {
    const donor = baseDonor({ notifCountMonth: NOTIF_CAP, notifMonth: "2026-08-01T00:00:00Z" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });

  it("rule 6 — includes a donor at the cap from a previous month (counter hasn't reset yet)", () => {
    const donor = baseDonor({ notifCountMonth: NOTIF_CAP, notifMonth: "2026-06-01T00:00:00Z" });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(true);
  });

  it("rule 7 — excludes a donor with an active pledge", () => {
    const donor = baseDonor({ hasActivePledge: true });
    expect(isDonorEligible(donor, REQUEST, NOTIF_CAP, NOW)).toBe(false);
  });
});

describe("rankEligibleDonors", () => {
  it("orders never-invited donors before ever-invited ones, then oldest invite first", () => {
    const donors = [
      { id: "recent", lastInvitedAt: "2026-08-01T00:00:00Z" },
      { id: "never", lastInvitedAt: null },
      { id: "oldest", lastInvitedAt: "2026-01-01T00:00:00Z" },
    ];
    expect(rankEligibleDonors(donors).map((d) => d.id)).toEqual(["never", "oldest", "recent"]);
  });
});
