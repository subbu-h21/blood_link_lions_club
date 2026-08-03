import { minutesBetween } from "@/lib/metrics/stats";
import type { ProspectStatus } from "@/lib/serialise/donor-contact";
import type { RequestStage } from "@/lib/serialise/stage";

export type ProspectForMetrics = {
  status: ProspectStatus;
  respondedAt: string | null;
  outcomeAt: string | null;
};

/**
 * Median request -> first acceptance (PRD.md §14 row 3). A prospect whose
 * `status` has moved past `invited` has necessarily gone through
 * `lib/db/prospects.ts`'s accept path, which sets `respondedAt` at that
 * exact moment (Unit 20/24) - a decline ("Not now"/"Not for a while")
 * deliberately stays `invited` with `respondedAt` set (Unit 24's own
 * reasoning), so this filter correctly excludes declines without needing
 * a second signal. Returns null when the request has no accepted
 * prospect yet (nothing to measure).
 */
export function firstAcceptanceMinutes(requestCreatedAt: string, prospects: ProspectForMetrics[]): number | null {
  const acceptedTimes = prospects
    .filter((p) => p.status !== "invited" && p.respondedAt !== null)
    .map((p) => new Date(p.respondedAt as string).getTime());
  if (acceptedTimes.length === 0) return null;
  const earliest = new Date(Math.min(...acceptedTimes)).toISOString();
  return minutesBetween(requestCreatedAt, earliest);
}

/**
 * Median acceptance -> donation (PRD.md §14 row 4), per donated prospect -
 * `outcome_at` (set on donation, `lib/db/bank-prospects.ts`'s
 * confirmDonation) minus that same prospect's own `responded_at` (when it
 * was accepted). Null for anything not `donated` - there's no donation
 * instant to measure against.
 */
export function acceptanceToDonationMinutes(prospect: ProspectForMetrics): number | null {
  if (prospect.status !== "donated" || prospect.respondedAt === null || prospect.outcomeAt === null) return null;
  return minutesBetween(prospect.respondedAt, prospect.outcomeAt);
}

export type ProspectOutcome = "declined" | "ignored" | "other";

/**
 * Donor decline/ignore classification (PRD.md §14 row 7). "Declined" is
 * the same signal Unit 24 already established: still `invited`, but
 * `responded_at` set (a real "Not now"/"Not for a while" reply). "Ignored"
 * deliberately requires the *request* to have already reached a terminal
 * stage (`resolved`/`closed`) - a still-active request's un-responded
 * invite hasn't had its window close yet, so it isn't "ignored," just
 * "not yet decided." A cancelled request's own un-responded prospects
 * become `stood_down` (Unit 30's `standDownProspect`, called on every
 * non-terminal status including `invited`), not left `invited` - so they
 * never reach this "ignored" branch at all, which is correct: the
 * request was withdrawn out from under them, they didn't personally
 * ignore it. This only actually fires for a prospect whose *sibling*
 * prospect on the same request donated first (`confirmDonation` moves the
 * whole request straight to `resolved` without touching sibling
 * prospects, Unit 28) - a real, narrow case, not a hypothetical.
 */
export function classifyProspectOutcome(prospect: ProspectForMetrics, requestStage: RequestStage): ProspectOutcome {
  if (prospect.status === "invited" && prospect.respondedAt !== null) return "declined";
  const requestIsTerminal = requestStage === "resolved" || requestStage === "closed";
  if (prospect.status === "invited" && prospect.respondedAt === null && requestIsTerminal) return "ignored";
  return "other";
}

/**
 * Admin response time (PRD.md §14 row 8): `admin_notified_at` (when an
 * admin was told, either by escalation or by simply loading A1) to
 * `owner_assigned_at` (when one first actually claimed it - Unit 55's own
 * new column, set once by `takeOwnership`/`transferRequestToRegion`).
 * Null when either half is missing - an unowned or never-notified request
 * has no response to measure yet.
 */
export function adminResponseMinutes(adminNotifiedAt: string | null, ownerAssignedAt: string | null): number | null {
  if (adminNotifiedAt === null || ownerAssignedAt === null) return null;
  return minutesBetween(adminNotifiedAt, ownerAssignedAt);
}
