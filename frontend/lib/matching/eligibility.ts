import { isCompatibleDonor } from "@/lib/matching/compatibility";
import type { BloodGroup } from "@/lib/serialise/blood-group";

export type DonorForMatching = {
  id: string;
  bloodGroup: BloodGroup;
  /**
   * Every region this donor is eligible in - their home region
   * (donors.region_id) plus any additional ones from
   * donor_availability_pincodes (2026-08-05, multi-pincode
   * availability). lib/db/matching.ts's findEligibleDonors assembles
   * this in full for every candidate regardless of *which* region
   * matched them into the candidate set, so Rule 2 below genuinely
   * re-verifies eligibility rather than just trusting the SQL
   * pre-filter that already found them - same "pure function stays
   * correct on its own" principle this file's own top comment already
   * documents.
   */
  regionIds: string[];
  isAvailable: boolean;
  pausedUntil: string | null;
  eligibleFrom: string | null;
  notifCountMonth: number;
  notifMonth: string | null;
  deletedAt: string | null;
  isBlocked: boolean;
  hasActivePledge: boolean;
  lastInvitedAt: string | null;
};

export type MatchingRequest = {
  bloodGroup: BloodGroup;
  regionId: string;
};

function isSameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/**
 * PRD.md §7.2's seven matching rules, in order, as **all** must hold.
 * Pure function - no DB access - so every rule gets its own isolated
 * unit test without a real database. lib/db/matching.ts's
 * findEligibleDonors pre-filters candidates by blood group/region in SQL
 * for efficiency, but this function re-checks every rule regardless of
 * what the caller already filtered, so it stays correct on its own.
 *
 * Ordering (PRD.md §7.2: "previously reliable donors first, then least
 * recently notified") is deliberately implemented as *only*
 * least-recently-notified here - see rankEligibleDonors below. SPEC.md's
 * own recorded decision (I8) explicitly defers the reliability half:
 * "Donor reliability scoring acted on - collect the data, don't rank on
 * it yet - too little signal." The data collection already happens
 * (prospects.status tracks no_show/donated); acting on it in ranking is
 * out of scope until I8's own stated trigger ("enough history exists").
 */
export function isDonorEligible(
  donor: DonorForMatching,
  request: MatchingRequest,
  notifCapPerMonth: number,
  now: Date,
): boolean {
  // Rule 1 — blood group compatibility (PRD.md §4.7)
  if (!isCompatibleDonor(donor.bloodGroup, request.bloodGroup)) return false;
  // Rule 2 — request's region is one of the donor's eligible regions
  // (home region, or one of their additional availability pincodes'
  // regions - 2026-08-05)
  if (!donor.regionIds.includes(request.regionId)) return false;
  // Rule 3 — available and not paused
  if (!donor.isAvailable) return false;
  if (donor.pausedUntil !== null && new Date(donor.pausedUntil) > now) return false;
  // Rule 4 — cooldown has passed
  if (donor.eligibleFrom !== null && new Date(donor.eligibleFrom) > now) return false;
  // Rule 5 — not deleted, not blocked
  if (donor.deletedAt !== null) return false;
  if (donor.isBlocked) return false;
  // Rule 6 — notification budget. Counter resets monthly (PRD.md §7.3);
  // if notif_month isn't the current month, the stored count is stale
  // and doesn't apply yet (Unit 31's scheduled job does the real reset;
  // this is defensive, not a substitute for it).
  const countApplies = donor.notifMonth !== null && isSameMonth(new Date(donor.notifMonth), now);
  const effectiveCount = countApplies ? donor.notifCountMonth : 0;
  if (effectiveCount >= notifCapPerMonth) return false;
  // Rule 7 — no active pledge (mirrors the one_active_pledge_per_donor
  // partial index from Unit 16 - accepted/screening statuses only)
  if (donor.hasActivePledge) return false;

  return true;
}

/** Ascending by last-invited timestamp; never-invited sorts first. */
export function rankEligibleDonors<T extends { lastInvitedAt: string | null }>(donors: T[]): T[] {
  return [...donors].sort((a, b) => {
    const aTime = a.lastInvitedAt ? new Date(a.lastInvitedAt).getTime() : -Infinity;
    const bTime = b.lastInvitedAt ? new Date(b.lastInvitedAt).getTime() : -Infinity;
    return aTime - bTime;
  });
}
