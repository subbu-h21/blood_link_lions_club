import { createDbClient } from "@/lib/db/client";
import { syncRequestStageAfterProspectChange, standDownProspect } from "@/lib/db/requests";
import type { BloodGroup } from "@/lib/serialise/blood-group";
import type { Urgency } from "@/lib/serialise/urgency";

// The two stages a live invitation can still be responded to in - same
// list Unit 22 already established for "open" (OPEN_STAGES there also
// includes `scheduled`, which is deliberately excluded here: once an
// appointment is fixed, D3's own three buttons no longer make sense for
// a donor who hasn't already accepted, even though the request itself
// isn't "closed" yet). Exported (2026-08-05) so the new dashboard
// invitations list below filters on the exact same definition D3 itself
// uses to decide "still live" - one definition, not two that could drift.
export const RESPONDABLE_STAGES = ["finding_prospects", "evaluating_prospects"];

export type RequestView =
  | {
      status: "live";
      bloodGroup: BloodGroup;
      destinationBank: string;
      urgency: Urgency;
      region: string;
    }
  | { status: "already_handled" };

/**
 * D3 · Request detail (PRD.md §7.1), real data (Unit 24). Scoped to
 * `donor_id = donorId AND request_id = requestId` together - never just
 * the request id alone (CLAUDE.md rule 1: a donor must never be able to
 * view another donor's invitation by guessing/changing the URL). No
 * matching row (wrong donor, nonexistent request, or a crafted id) and a
 * matching row whose prospect isn't `invited` or whose request has moved
 * past finding_prospects/evaluating_prospects both collapse to the same
 * "already_handled" result - deliberately not distinguished, so this
 * never confirms or denies that a request exists for a donor it doesn't
 * belong to (same spirit as Rule 3's "never leak in a way that reveals
 * more than the recipient is entitled to").
 */
export async function getDonorRequestView(donorId: string, requestId: string): Promise<RequestView> {
  const db = createDbClient();

  const { data: prospect, error: prospectError } = await db
    .from("prospects")
    .select("status")
    .eq("donor_id", donorId)
    .eq("request_id", requestId)
    .maybeSingle();
  if (prospectError) throw prospectError;
  if (!prospect || prospect.status !== "invited") return { status: "already_handled" };

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("blood_group, destination_bank_id, urgency, region_id, stage")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request || !RESPONDABLE_STAGES.includes(request.stage)) return { status: "already_handled" };

  const { data: bank, error: bankError } = await db
    .from("blood_banks")
    .select("name")
    .eq("id", request.destination_bank_id)
    .maybeSingle();
  if (bankError) throw bankError;

  const { data: region, error: regionError } = await db
    .from("regions")
    .select("name")
    .eq("id", request.region_id)
    .maybeSingle();
  if (regionError) throw regionError;

  return {
    status: "live",
    bloodGroup: request.blood_group as BloodGroup,
    destinationBank: bank?.name ?? "",
    urgency: request.urgency as Urgency,
    region: region?.name ?? "",
  };
}

// A donor's own live invitation count realistically stays in the low
// single digits (the matching engine already excludes anyone with an
// active pledge, and the monthly notification cap bounds how many
// distinct requests one donor can be invited to at all) - capped
// explicitly anyway (CLAUDE.md rule 4), same generous-but-explicit
// pattern as every other list read in this codebase
// (MAX_DONATION_HISTORY below, MAX_QUEUE_ROWS in lib/db/requests.ts).
const MAX_PENDING_INVITATIONS = 50;

export type PendingInvitation = {
  requestId: string;
  bloodGroup: BloodGroup;
  destinationBank: string;
  urgency: Urgency;
  region: string;
  invitedAt: string;
};

/**
 * D2 dashboard invitations list (2026-08-05, user-requested) - the donor
 * home screen's own in-app alternative to "the only way to see an
 * invitation is to follow a push notification link." Deliberately reuses
 * `RESPONDABLE_STAGES` (the same filter `getDonorRequestView` above
 * already applies) rather than a broader "every open request matching my
 * blood group" browse view - a real product decision, confirmed with the
 * project owner rather than assumed: this lists exactly the invitations
 * the matching engine already created for this donor (respecting the
 * monthly notification cap, region/blood-group eligibility, and
 * least-recently-notified ranking - see lib/db/matching.ts), not a
 * broader query that would let a throttled or lower-ranked donor see and
 * act on requests they were deliberately not matched to. A row that has
 * fallen out of `RESPONDABLE_STAGES` (e.g. another donor already
 * accepted and the request moved on) is excluded from the list entirely,
 * rather than included and left to resolve to "already handled" only
 * after the donor clicks it - the dashboard should never show a dead row.
 *
 * Same manual-multi-step-query style as every other lib/db file in this
 * codebase (no PostgREST relation embedding) and the same
 * batch-then-map-in-JS shape `lib/db/requests.ts`'s `getAdminQueue`
 * already established for "N rows, each needing a couple of small
 * lookups" - one `.in()` query per related table, never one query per
 * row.
 *
 * Sort is urgency-then-oldest-invited-first, matching A1's own admin
 * queue convention (`AdminQueueBoard`/PRD.md §9.1: "Sort: urgency then
 * age") - the same ordering logic already established for "which of my
 * several open cases needs attention first," reused here rather than
 * inventing a second convention for an donor-facing list of the same
 * shape.
 */
export async function getMyPendingInvitations(donorId: string): Promise<PendingInvitation[]> {
  const db = createDbClient();

  const { data: invited, error: invitedError } = await db
    .from("prospects")
    .select("request_id, invited_at")
    .eq("donor_id", donorId)
    .eq("status", "invited")
    .order("invited_at", { ascending: true })
    .limit(MAX_PENDING_INVITATIONS);
  if (invitedError) throw invitedError;
  if (invited.length === 0) return [];

  const requestIds = invited.map((row) => row.request_id);
  const { data: requests, error: requestsError } = await db
    .from("requests")
    .select("id, blood_group, destination_bank_id, urgency, region_id, stage")
    .in("id", requestIds)
    .in("stage", RESPONDABLE_STAGES)
    .limit(MAX_PENDING_INVITATIONS);
  if (requestsError) throw requestsError;
  if (requests.length === 0) return [];

  const bankIds = [...new Set(requests.map((r) => r.destination_bank_id))];
  const { data: banks, error: banksError } = await db
    .from("blood_banks")
    .select("id, name")
    .in("id", bankIds)
    .limit(bankIds.length);
  if (banksError) throw banksError;
  const bankNameById = new Map(banks.map((b) => [b.id, b.name]));

  const regionIds = [...new Set(requests.map((r) => r.region_id))];
  const { data: regions, error: regionsError } = await db
    .from("regions")
    .select("id, name")
    .in("id", regionIds)
    .limit(regionIds.length);
  if (regionsError) throw regionsError;
  const regionNameById = new Map(regions.map((r) => [r.id, r.name]));

  const invitedAtByRequest = new Map(invited.map((row) => [row.request_id, row.invited_at as string]));
  const urgencyRank = (u: string) => (u === "emergency" ? 0 : 1);

  return requests
    .map((r) => ({
      requestId: r.id as string,
      bloodGroup: r.blood_group as BloodGroup,
      destinationBank: bankNameById.get(r.destination_bank_id) ?? "",
      urgency: r.urgency as Urgency,
      region: regionNameById.get(r.region_id) ?? "",
      invitedAt: invitedAtByRequest.get(r.id) ?? "",
    }))
    .sort((a, b) => {
      const byUrgency = urgencyRank(a.urgency) - urgencyRank(b.urgency);
      if (byUrgency !== 0) return byUrgency;
      return a.invitedAt.localeCompare(b.invitedAt);
    });
}

export type AcceptResult =
  | { ok: true; destinationBank: string }
  | { ok: false; reason: "already_handled" | "already_pledged" };

/**
 * "I can donate" (PRD.md §7.1 D3, §7.3). Re-checks the prospect/request
 * state directly rather than trusting whatever getDonorRequestView
 * returned on page load (a real race - the request could close, or the
 * donor could accept a *different* request in another tab, between
 * viewing this page and tapping the button). The `one_active_pledge_
 * per_donor` unique index is the authoritative enforcement for
 * "already_pledged" - this function attempts the update and reads the
 * result, it does not pre-check for it (same pattern as Unit 22's
 * duplicate-open-request handling: never trust a pre-check alone,
 * CLAUDE.md rule scope note for this exact unit).
 */
export async function acceptProspect(donorId: string, requestId: string): Promise<AcceptResult> {
  const db = createDbClient();

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("stage, destination_bank_id")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request || !RESPONDABLE_STAGES.includes(request.stage)) return { ok: false, reason: "already_handled" };

  const { data: updated, error: updateError } = await db
    .from("prospects")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("donor_id", donorId)
    .eq("request_id", requestId)
    .eq("status", "invited")
    .select("id")
    .maybeSingle();

  if (updateError) {
    if (updateError.code === "23505") {
      return { ok: false, reason: "already_pledged" };
    }
    throw updateError;
  }
  if (!updated) return { ok: false, reason: "already_handled" };

  await syncRequestStageAfterProspectChange(requestId);

  const { data: bank, error: bankError } = await db
    .from("blood_banks")
    .select("name")
    .eq("id", request.destination_bank_id)
    .maybeSingle();
  if (bankError) throw bankError;

  return { ok: true, destinationBank: bank?.name ?? "" };
}

/**
 * "Not now" / "Not for a while" (PRD.md §7.1 D3, SPEC.md §4.2 row 6).
 * Deliberately does NOT change prospects.status - SPEC.md §3.2 defines
 * `rejected` as "Failed screening" (a bank-side, post-acceptance
 * outcome, Unit 28's B3) and `stood_down` as "no longer needed - request
 * covered elsewhere" (an admin/system action when the request itself is
 * closed, Unit 26/44); neither describes a donor simply declining an
 * invitation, and reusing either here would misrepresent what actually
 * happened to anyone reading the prospect's history later (an admin on
 * A2, for instance). The prospect stays `invited`; `responded_at` is set
 * so a declined-but-still-technically-open invitation is distinguishable
 * from one nobody has looked at yet. `pauseDays`, when given, sets
 * donors.paused_until - the one real, spec'd side effect of "Not for a
 * while" ("pauses notifications", SPEC.md's own words).
 */
export async function declineProspect(
  donorId: string,
  requestId: string,
  pauseDays?: number,
): Promise<void> {
  const db = createDbClient();

  const { error: prospectError } = await db
    .from("prospects")
    .update({ responded_at: new Date().toISOString() })
    .eq("donor_id", donorId)
    .eq("request_id", requestId)
    .eq("status", "invited");
  if (prospectError) throw prospectError;

  if (pauseDays !== undefined) {
    const pausedUntil = new Date(Date.now() + pauseDays * 24 * 60 * 60 * 1000).toISOString();
    const { error: donorError } = await db.from("donors").update({ paused_until: pausedUntil }).eq("id", donorId);
    if (donorError) throw donorError;
  }
}

// The one_active_pledge_per_donor index's own definition (Unit 16) - a
// donor has at most one prospect in either status at a time, so every
// read below can safely use maybeSingle().
const ACTIVE_PLEDGE_STATUSES = ["accepted", "screening"];

export type PledgeDetail = {
  requestId: string;
  destinationBank: string;
  bankAddress: string;
  bankPhone: string;
  adminName: string | null;
  adminPhone: string | null;
};

/**
 * D4 · Active pledge (PRD.md §7.1), real data (Unit 26). Returns null
 * when the donor has no active pledge - a real, expected state (visiting
 * `/donor/pledge` directly without one, or after cancelling), not an
 * error; the page renders an empty-state message for it. `adminName`/
 * `adminPhone` are null whenever `requests.owner_admin_id` is null -
 * admin assignment is M4's job (this unit's own scope limit, per its own
 * prompt text), so this is the common case today, not a bug to work
 * around. This is the admin's own phone, not a donor's - CLAUDE.md rule
 * 3 governs donor phone numbers, not staff ones (same distinction
 * already established for `blood_banks.phone` in Unit 07/14) - but
 * `owner_admin_id` has no DB-level check constraint restricting it to
 * admin-role profiles (nothing writes it at all yet - that's M4's job
 * too), so this defensively re-checks `role` before trusting the row as
 * "the admin" rather than assuming any future write path gets it right.
 * If that ever changes, this falls back to the same null-safe path as
 * "no admin assigned yet" rather than exposing whatever profile the
 * column happens to point at - CLAUDE.md rule 3 is this project's most
 * important check, worth the extra defensive read even though nothing
 * can trigger the bad case today.
 */
export async function getActivePledgeDetail(donorId: string): Promise<PledgeDetail | null> {
  const db = createDbClient();

  const { data: pledge, error: pledgeError } = await db
    .from("prospects")
    .select("request_id")
    .eq("donor_id", donorId)
    .in("status", ACTIVE_PLEDGE_STATUSES)
    .maybeSingle();
  if (pledgeError) throw pledgeError;
  if (!pledge) return null;

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("destination_bank_id, owner_admin_id")
    .eq("id", pledge.request_id)
    .single();
  if (requestError) throw requestError;

  const { data: bank, error: bankError } = await db
    .from("blood_banks")
    .select("name, address, phone")
    .eq("id", request.destination_bank_id)
    .maybeSingle();
  if (bankError) throw bankError;

  let adminName: string | null = null;
  let adminPhone: string | null = null;
  if (request.owner_admin_id) {
    const { data: admin, error: adminError } = await db
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", request.owner_admin_id)
      .maybeSingle();
    if (adminError) throw adminError;
    if (admin && (admin.role === "admin" || admin.role === "coordinator")) {
      adminName = admin.full_name;
      adminPhone = admin.phone;
    }
  }

  return {
    requestId: pledge.request_id,
    destinationBank: bank?.name ?? "",
    bankAddress: bank?.address ?? "",
    bankPhone: bank?.phone ?? "",
    adminName,
    adminPhone,
  };
}

export type CancelPledgeResult = { ok: true } | { ok: false; reason: "no_active_pledge" };

/**
 * Cancel pledge (PRD.md §7.1 D4, Unit 26's own task text: "sets the
 * prospect to stood_down"). The target prospect is looked up from the
 * donor's own active pledge, never a client-supplied request id
 * (CLAUDE.md rule 2 - same reasoning as every other acting-user-scoped
 * write in this codebase). Reuses `syncRequestStageAfterProspectChange`
 * (Unit 24) for the stage derivation rather than reimplementing the
 * "any other prospect still live" check here - CLAUDE.md's "never write
 * [stage] in more than one place."
 *
 * `requests.prospect_cancelled_at` is set unconditionally, not only when
 * the stage actually reverts - a second donor's cancellation while a
 * third prospect is still accepted/screening leaves the derived stage
 * unchanged, but the admin (once one exists, M4) still needs to know
 * *this* donor backed out. Same "minimal signal for M4's admin-notify
 * path" reasoning as Unit 22's zero_match_at.
 *
 * The actual status-setting write is `lib/db/requests.ts`'s
 * `standDownProspect(prospectId)` (Unit 30 extracted this out of what used
 * to be an inline update here) - Unit 30's own request-level cancel (many
 * mixed-status prospects on one request) calls the identical primitive, so
 * there is genuinely one implementation of "what stand-down means," not
 * two that happen to set the same status string.
 */
export async function cancelPledge(donorId: string): Promise<CancelPledgeResult> {
  const db = createDbClient();

  const { data: pledge, error: pledgeError } = await db
    .from("prospects")
    .select("id, request_id")
    .eq("donor_id", donorId)
    .in("status", ACTIVE_PLEDGE_STATUSES)
    .maybeSingle();
  if (pledgeError) throw pledgeError;
  if (!pledge) return { ok: false, reason: "no_active_pledge" };

  await standDownProspect(pledge.id);
  await syncRequestStageAfterProspectChange(pledge.request_id);

  const { error: requestError } = await db
    .from("requests")
    .update({ prospect_cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", pledge.request_id);
  if (requestError) throw requestError;

  return { ok: true };
}

// Bounded read (CLAUDE.md rule 4) - a donor's real donation count over a
// lifetime is small (single digits to low tens at most), but capped
// explicitly anyway, same pattern as every other list read in this
// project.
const MAX_DONATION_HISTORY = 100;

export type DonationRecord = {
  donatedAt: string;
  destinationBank: string;
};

/**
 * D5 · History (PRD.md §7.1), real data (Unit 26). Scoped to
 * `donor_id = donorId` - never any other donor's rows (this screen is
 * reached only through the donor's own gated portal session, but the
 * query is still explicitly scoped, not relying on that alone).
 */
export async function getDonationHistory(donorId: string): Promise<DonationRecord[]> {
  const db = createDbClient();

  const { data: donations, error: donationsError } = await db
    .from("prospects")
    .select("request_id, outcome_at")
    .eq("donor_id", donorId)
    .eq("status", "donated")
    .order("outcome_at", { ascending: false })
    .limit(MAX_DONATION_HISTORY);
  if (donationsError) throw donationsError;
  if (donations.length === 0) return [];

  const requestIds = donations.map((row) => row.request_id);
  const { data: requests, error: requestsError } = await db
    .from("requests")
    .select("id, destination_bank_id")
    .in("id", requestIds)
    .limit(MAX_DONATION_HISTORY);
  if (requestsError) throw requestsError;
  const bankIdByRequest = new Map(requests.map((row) => [row.id, row.destination_bank_id]));

  const bankIds = [...new Set(requests.map((row) => row.destination_bank_id))];
  const { data: banks, error: banksError } = await db
    .from("blood_banks")
    .select("id, name")
    .in("id", bankIds)
    .limit(MAX_DONATION_HISTORY);
  if (banksError) throw banksError;
  const bankNameById = new Map(banks.map((row) => [row.id, row.name]));

  return donations.map((row) => {
    const bankId = bankIdByRequest.get(row.request_id);
    return {
      donatedAt: row.outcome_at as string,
      destinationBank: (bankId && bankNameById.get(bankId)) ?? "",
    };
  });
}
