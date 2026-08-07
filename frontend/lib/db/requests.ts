import { createDbClient } from "@/lib/db/client";
import { getAppSetting } from "@/lib/db/app-settings";
import { findEligibleDonors } from "@/lib/db/matching";
import { sendPush } from "@/lib/push/send";
import type { ActingAdmin } from "@/lib/db/admin-portal";
import type { BloodGroup } from "@/lib/serialise/blood-group";
import type { Urgency } from "@/lib/serialise/urgency";
import { CLOSE_REASONS, type CloseReason } from "@/lib/serialise/close-reason";
import type { RequestStage } from "@/lib/serialise/stage";

const COMPONENT = "whole_blood";

// The three non-terminal stages - mirrors Unit 16's partial unique index
// condition (`where stage not in ('resolved', 'closed')`) as a positive
// list instead, so this uses the same well-established `.in()` filter
// already used throughout lib/db/matching.ts, rather than the less common
// `.not(column, "in", ...)` form (whose value-formatting rules are easy
// to get subtly wrong).
export const OPEN_STAGES = ["finding_prospects", "evaluating_prospects", "scheduled"];

/**
 * Returns the phone's own open request id, if it has one - not just a
 * boolean. Renamed from hasOpenRequestForPhone (2026-08-04) when its one
 * caller (lib/actions/raise-request.ts's checkOpenRequestAction) needed
 * to show the actual request's status inline instead of a dead-end
 * message; a boolean is trivially `!!getOpenRequestIdForPhone(...)` if
 * ever needed again.
 */
export async function getOpenRequestIdForPhone(phone: string): Promise<string | null> {
  const db = createDbClient();
  const { data, error } = await db
    .from("requests")
    .select("id")
    .eq("requester_phone", phone)
    .in("stage", OPEN_STAGES)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export type CreateRequestInput = {
  requesterPhone: string;
  requesterProfileId: string | null;
  patientName: string | null;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  destinationBankId: string;
  urgency: Urgency;
};

export type CreateRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; reason: "duplicate_open_request" | "invalid_bank" };

/**
 * Bumps notif_count_month/notif_month for donors just invited
 * (lib/matching/eligibility.ts's isDonorEligible reads these but nothing
 * writes them yet - creating an `invited` prospect IS the notification
 * event PRD.md §7.2 rule 6's monthly cap is meant to track, so leaving
 * this unwritten would make the cap permanently vacuous). Convention:
 * notif_month is always stored as that month's 1st (`YYYY-MM-01`) -
 * Unit 31's scheduled reset job should match this convention, not invent
 * its own format. Read-then-write per donor (plain `.update()`, not
 * `.upsert()` - these rows are guaranteed to already exist, since
 * `donorIds` came from findEligibleDonors' own DB read, and Postgres
 * validates a NOT NULL constraint against the INSERT half of an upsert's
 * generated SQL regardless of whether the row already exists; a partial
 * column list there fails immediately, caught live running this against
 * the real DB, not assumed safe). Not a single atomic UPDATE either - two
 * donors matched to two requests in the same instant could under-count
 * by one; acceptable at this project's real scale (CLAUDE.md: no new
 * infrastructure to close a race this unlikely for a volunteer-run
 * district system).
 */
async function incrementNotifCounts(
  db: ReturnType<typeof createDbClient>,
  donorIds: string[],
): Promise<void> {
  const { data: rows, error } = await db
    .from("donors")
    .select("id, notif_month, notif_count_month")
    .in("id", donorIds)
    .limit(donorIds.length);
  if (error) throw error;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);

  for (const row of rows) {
    const { error: updateError } = await db
      .from("donors")
      .update({
        notif_month: monthStartIso,
        notif_count_month: row.notif_month === monthStartIso ? row.notif_count_month + 1 : 1,
      })
      .eq("id", row.id);
    if (updateError) throw updateError;
  }
}

/**
 * S4 wiring (PRD.md §6.1, §4.5, §7.2, §9.2). `region_id` is deliberately
 * not a caller-supplied field - Unit 16's own migration comment already
 * anticipated this ("presumably derived server-side from the destination
 * bank's own region, not typed by the requester"): it's read from
 * `destination_bank_id`'s own `blood_banks.region_id` below, which also
 * doubles as validating the bank is real, verified, and active - same
 * "is_verified=false cannot post publicly" rule Unit 12 already enforces
 * bank-portal-side (CLAUDE.md rule 1: never trust a client-supplied
 * region/bank pairing).
 *
 * The duplicate-open-request rejection relies on Unit 16's
 * `one_open_request_per_phone` partial unique index (a caught `23505`),
 * not a pre-check-then-insert race - the pre-check
 * (getOpenRequestIdForPhone) that the UI calls right after OTP is only
 * for fast, friendly UX; this is the authoritative enforcement.
 */
export async function createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
  const db = createDbClient();

  const { data: bank, error: bankError } = await db
    .from("blood_banks")
    .select("id, name, region_id")
    .eq("id", input.destinationBankId)
    .eq("is_verified", true)
    .eq("is_active", true)
    .maybeSingle();
  if (bankError) throw bankError;
  if (!bank) return { ok: false, reason: "invalid_bank" };

  const expiryHours = await getAppSetting<number>("request.expiry_hours");
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

  // created_at is set explicitly here, not left to the column's own
  // `default now()` (found at Unit 58's M6 review gate, live end-to-end
  // test) - every other timestamp in this codebase (including
  // prospects.responded_at below) is set via this same
  // `new Date().toISOString()` call, sourced from the Node process's own
  // clock. Leaving created_at to Postgres's own now() instead meant a
  // metric computing (responded_at - created_at), like Unit 55's median
  // request-to-first-acceptance, was diffing two different clock
  // sources - harmless if they agree, but a real negative reading is
  // possible the moment the DB container's clock and the host/Node
  // clock disagree by even a second (confirmed happening locally).
  // Explicit Node-sourced timestamps everywhere removes the
  // cross-clock-source comparison entirely, regardless of environment.
  const nowIso = new Date().toISOString();
  const { data: inserted, error: insertError } = await db
    .from("requests")
    .insert({
      requester_phone: input.requesterPhone,
      requester_profile_id: input.requesterProfileId,
      patient_name: input.patientName,
      blood_group: input.bloodGroup,
      component: COMPONENT,
      units_needed: input.unitsNeeded,
      destination_bank_id: bank.id,
      region_id: bank.region_id,
      urgency: input.urgency,
      stage: "finding_prospects",
      expires_at: expiresAt,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, reason: "duplicate_open_request" };
    }
    throw insertError;
  }

  const requestId = inserted.id as string;
  const eligibleDonorIds = await findEligibleDonors(requestId);

  if (eligibleDonorIds.length === 0) {
    const { error: zeroMatchError } = await db
      .from("requests")
      .update({ zero_match_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", requestId);
    if (zeroMatchError) throw zeroMatchError;
    return { ok: true, requestId };
  }

  // invited_at set explicitly too (same clock-source reasoning as
  // created_at above) - not read against a different-clock timestamp by
  // any metric today, but consistent with every other timestamp in this
  // codebase now being Node-sourced, not a mix.
  const { error: prospectsError } = await db.from("prospects").insert(
    eligibleDonorIds.map((donorId) => ({
      request_id: requestId,
      donor_id: donorId,
      status: "invited",
      invited_at: nowIso,
    })),
  );
  if (prospectsError) throw prospectsError;

  await incrementNotifCounts(db, eligibleDonorIds);

  for (const donorId of eligibleDonorIds) {
    await sendPush(
      donorId,
      "donor",
      {
        bloodGroup: input.bloodGroup,
        destinationBank: bank.name,
        urgency: input.urgency,
        deepLink: `/donor/request/${requestId}`,
      },
      { requestId },
    );
  }

  return { ok: true, requestId };
}

/**
 * CLAUDE.md "Data model invariants": `request.stage` is derived from its
 * prospects, never set independently - this is the one place that
 * derivation happens, so every future code path that changes a
 * prospect's status (this unit's acceptProspect, and later Unit 28's
 * bank-side screening outcomes) calls this afterward instead of writing
 * `stage` inline itself.
 *
 * Deliberately narrow: only the finding_prospects <-> evaluating_prospects
 * transition is derived here (SPEC.md §3.1 - "evaluating_prospects: at
 * least one donor accepted"). `scheduled`/`resolved`/`closed` are
 * deliberate admin/bank actions (Units 26/28/44), not something this
 * function should guess at from prospect counts alone - it's a no-op for
 * a request already past `evaluating_prospects`.
 */
export async function syncRequestStageAfterProspectChange(requestId: string): Promise<void> {
  const db = createDbClient();

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("stage")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) return;
  if (request.stage !== "finding_prospects" && request.stage !== "evaluating_prospects") return;

  const { count, error: countError } = await db
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId)
    .in("status", ["accepted", "screening"]);
  if (countError) throw countError;

  const targetStage = (count ?? 0) > 0 ? "evaluating_prospects" : "finding_prospects";
  if (targetStage !== request.stage) {
    const { error: updateError } = await db
      .from("requests")
      .update({ stage: targetStage, updated_at: new Date().toISOString() })
      .eq("id", requestId);
    if (updateError) throw updateError;
  }
}

/**
 * The shared low-level "stand a prospect down" primitive (Unit 30) -
 * extracted out of what used to be an inline update inside
 * `lib/db/prospects.ts`'s `cancelPledge` (Unit 26), per that unit's own
 * flagged gap (prompts/30-request-status-wiring.md's Note, and the M3
 * audit entry in prompts/README.md): "stand down" needs both a
 * single-prospect caller (a donor cancelling their own pledge) and a
 * request-scoped caller (this file's own `cancelRequest`, standing down
 * several mixed-status prospects at once) - this is the one place the
 * actual status write happens for either case. Deliberately does nothing
 * beyond the one row's status/timestamp - it never calls
 * `syncRequestStageAfterProspectChange` or touches `requests` itself,
 * since the two current callers need different follow-up behaviour
 * (`cancelPledge` still derives the stage afterward; `cancelRequest` below
 * sets `stage = 'closed'` directly regardless of remaining prospect
 * counts) - baking either choice into this primitive would make it wrong
 * for the other caller.
 */
export async function standDownProspect(prospectId: string): Promise<void> {
  const db = createDbClient();
  const { error } = await db
    .from("prospects")
    .update({ status: "stood_down", outcome_at: new Date().toISOString() })
    .eq("id", prospectId);
  if (error) throw error;
}

// A request's prospect count realistically stays in the tens even for a
// busy region - capped explicitly anyway (CLAUDE.md rule 4), same
// generous-but-explicit pattern as bank_shortages' 50 (Unit 12).
const MAX_PROSPECTS_PER_REQUEST = 200;

// Any prospect that has ever said yes, including one who went on to
// actually donate - distinct from `syncRequestStageAfterProspectChange`'s
// narrower `["accepted", "screening"]` (which only cares about *currently
// live* pledges for the finding/evaluating derivation). S5's "donors
// accepted" count is a running total for the requester to watch, not a
// live-pledge count.
const ACCEPTED_LIKE_STATUSES = ["accepted", "screening", "donated"];

export type RequestStatusView =
  | {
      status: "found";
      stage: RequestStage;
      bloodGroup: BloodGroup;
      unitsNeeded: number;
      notifiedCount: number;
      acceptedCount: number;
      adminName: string | null;
      adminPhone: string | null;
      idlePrompted: boolean;
    }
  | { status: "not_found" };

/**
 * S5 · Request status (PRD.md §6.1), real data (Unit 30). `requestId`
 * comes directly from the URL, not a session lookup - deliberate,
 * confirmed with the project owner before writing this (see
 * prompts/README.md's Unit 30 entry): there is no requester portal or
 * session anywhere in this codebase (a "searcher" never logs back in),
 * and the request id is already an unguessable server-generated UUID
 * (CLAUDE.md rule 2's own reasoning for using UUIDs everywhere) - the URL
 * itself is the access model, the same trust boundary an order-tracking
 * link uses. This is a deliberate, narrow exception to this codebase's
 * usual "id is never a parameter, it's resolved from the session" rule
 * (Unit 12's bank-portal precedent) - not an oversight, and not a pattern
 * to copy for a screen that has a real session to scope against instead.
 *
 * `adminName`/`adminPhone` reuse the exact same defensive `role IN
 * ('admin','coordinator')` re-check `lib/db/prospects.ts`'s
 * `getActivePledgeDetail` already established (Unit 26) for the identical
 * reason: `owner_admin_id` has no DB-level constraint restricting it to
 * admin-role profiles. Never selects any donor column at all (CLAUDE.md
 * rule 3's scope note for this unit) - only `requests`, prospect *counts*,
 * and the admin's own `profiles` row. `bloodGroup`/`unitsNeeded` (added
 * 2026-08-05, user-requested) are the requester's own request details,
 * not donor data - the requester already supplied both when raising this
 * same request, so showing them back is not a new disclosure.
 */
export async function getRequestStatus(requestId: string): Promise<RequestStatusView> {
  const db = createDbClient();

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("stage, blood_group, units_needed, owner_admin_id, idle_prompted_at")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) return { status: "not_found" };

  const { count: notifiedCount, error: notifiedError } = await db
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId)
    .limit(MAX_PROSPECTS_PER_REQUEST);
  if (notifiedError) throw notifiedError;

  const { count: acceptedCount, error: acceptedError } = await db
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId)
    .in("status", ACCEPTED_LIKE_STATUSES)
    .limit(MAX_PROSPECTS_PER_REQUEST);
  if (acceptedError) throw acceptedError;

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
    status: "found",
    stage: request.stage as RequestStage,
    bloodGroup: request.blood_group as BloodGroup,
    unitsNeeded: request.units_needed,
    notifiedCount: notifiedCount ?? 0,
    acceptedCount: acceptedCount ?? 0,
    adminName,
    adminPhone,
    idlePrompted: request.idle_prompted_at !== null,
  };
}

const CLOSED_STAGES = ["resolved", "closed"];

// Any prospect that hasn't reached a terminal outcome yet - broader than
// `ACTIVE_PLEDGE_STATUSES` (accepted/screening only) elsewhere in this
// codebase, because a whole-request cancel (SPEC.md §4.1 row 12:
// "Remaining prospects stood_down and thanked") must also stand down
// donors who were invited but never responded, not just ones who already
// accepted - a decision `declineProspect`/D3 never had to make, since a
// donor declining their own invitation is a different, narrower action
// than the requester closing the whole request out from under everyone.
export const STANDDOWNABLE_STATUSES = ["invited", "accepted", "screening"];

export type CancelRequestResult = { ok: true } | { ok: false; reason: "not_found" | "already_closed" };

/**
 * S5 · Cancel request (PRD.md §6.2, §12 Epic 3; SPEC.md §4.1 row 12), real
 * data (Unit 30). `closeReason` is validated server-side against the same
 * five-value list the DB check constraint enforces - never trust the
 * client form alone (this unit's own verify checklist: "rejected by the
 * server, not just the client form"). Stands down every non-terminal
 * prospect on the request via the shared `standDownProspect` primitive
 * above, then sets `stage = 'closed'` directly - unlike
 * `syncRequestStageAfterProspectChange`, this never derives the stage from
 * prospect counts, because a cancelled request closes regardless of how
 * many prospects were still live (a deliberate requester action, not a
 * system-computed transition, matching that function's own doc comment
 * about `closed` being one of the stages it deliberately leaves alone).
 *
 * **Every stood-down prospect is now pushed a thank-you (2026-08-07)** -
 * SPEC.md §4.1 row 12's own literal wording ("Remaining prospects
 * `stood_down` and thanked") and §4.2 row 12's general principle ("`stood_down`
 * with a warm thank-you message - never silence") were never actually
 * implemented; only a donor's own self-initiated D4 cancel ever
 * acknowledged anything, and only on-screen in the moment (Unit 26) - a
 * donor stood down by *someone else's* action (a requester's whole-request
 * cancel here, or an admin's A2 close, which also routes through this same
 * shared function) got nothing at all. This is the one place both paths
 * meet, so hooking in here (not inside `standDownProspect` itself, whose
 * own doc comment deliberately keeps it a bare status/timestamp write for
 * every caller including the donor's *own* self-cancel, which must NOT
 * get a redundant push to itself) covers both for free, one
 * implementation. Failure characteristics intentionally match the
 * existing invite loop in `createRequest` exactly (no extra try/catch
 * added only here) - `sendPush` already fails soft per-subscription
 * internally; a VAPID misconfiguration would throw either way, an
 * existing, pre-existing risk profile this doesn't change.
 */
export async function cancelRequest(requestId: string, closeReason: CloseReason): Promise<CancelRequestResult> {
  if (!CLOSE_REASONS.includes(closeReason)) {
    throw new Error("invalid close reason");
  }

  const db = createDbClient();

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("stage, blood_group")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) return { ok: false, reason: "not_found" };
  if (CLOSED_STAGES.includes(request.stage)) return { ok: false, reason: "already_closed" };

  const { data: liveProspects, error: prospectsError } = await db
    .from("prospects")
    .select("id, donor_id")
    .eq("request_id", requestId)
    .in("status", STANDDOWNABLE_STATUSES)
    .limit(MAX_PROSPECTS_PER_REQUEST);
  if (prospectsError) throw prospectsError;

  for (const prospect of liveProspects) {
    await standDownProspect(prospect.id);
    await sendPush(
      prospect.donor_id,
      "donor",
      { type: "stood_down", bloodGroup: request.blood_group as BloodGroup, deepLink: "/donor" },
      { requestId },
    );
  }

  const { error: updateError } = await db
    .from("requests")
    .update({ stage: "closed", close_reason: closeReason, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) throw updateError;

  return { ok: true };
}

// Requests still actively being searched - excludes `scheduled`
// deliberately, unlike `OPEN_STAGES` above (which includes it for the
// "one open request per phone" duplicate check). A scheduled request has
// a real appointment in motion; it isn't "idle" just because its
// `created_at`/`updated_at` is old, so neither the idle-prompt nor the
// expiry job below should touch it (Unit 31).
const SEARCHING_STAGES = ["finding_prospects", "evaluating_prospects"];

// A request's own bulk state-table scan realistically returns a handful
// to low hundreds of rows even at district scale - capped explicitly
// anyway (CLAUDE.md rule 4), matching MAX_PROSPECTS_PER_REQUEST's own
// generous-but-explicit precedent above.
const MAX_EXPIRING_PER_RUN = 200;

/**
 * Scheduled job (2) of 3 (Unit 31, PRD.md §6.2/§12 Epic 3, SPEC.md §5's
 * suggested 12h). Measured from `updated_at`, not `created_at` - SPEC.md
 * §4.1 row 13's own wording is "No activity for a set period," and
 * `updated_at` is what every stage-changing write in this codebase
 * already bumps (`syncRequestStageAfterProspectChange`,
 * `cancelRequest`, `confirmStillNeeded` below) - a request that's
 * genuinely being worked (a donor just accepted, say) shouldn't get
 * prompted just because it happens to be old by creation time alone.
 * `idle_prompted_at is null` keeps this idempotent across repeated runs -
 * `confirmStillNeeded` is the only thing that clears it, which is also
 * what lets a request that goes idle *again* later get prompted a second
 * time (bumping `updated_at` in the process re-arms both this check and
 * the expiry one below).
 *
 * Delivery is a passive S5 banner (`RequestStatusView`'s `idlePrompted`
 * field), not a push notification - confirmed with the project owner
 * before writing this (see prompts/README.md's Unit 31 entry): Unit 18
 * deliberately never subscribes a requester to push (only donor
 * registration does), so there is no channel to actually push this to
 * today. This job only sets the marker; the requester sees it next time
 * they load their own S5 link.
 */
export async function markIdleRequestsForPrompt(): Promise<number> {
  const db = createDbClient();

  const idleHours = await getAppSetting<number>("request.idle_prompt_hours");
  const cutoff = new Date(Date.now() - idleHours * 60 * 60 * 1000).toISOString();

  const { error, count } = await db
    .from("requests")
    .update({ idle_prompted_at: new Date().toISOString() }, { count: "exact" })
    .in("stage", SEARCHING_STAGES)
    .lt("updated_at", cutoff)
    .is("idle_prompted_at", null);
  if (error) throw error;

  return count ?? 0;
}

/**
 * Scheduled job (3) of 3 (Unit 31, PRD.md §6.2/§12 Epic 3, SPEC.md §5's
 * suggested 48h). Same `updated_at`/`SEARCHING_STAGES` reasoning as
 * `markIdleRequestsForPrompt` above. Calls `cancelRequest` per candidate -
 * this unit's own constraint ("using the same close path Unit 30 built,
 * not a second implementation") - rather than writing a bulk `UPDATE`
 * directly, so the exact same stand-down-every-live-prospect behaviour
 * applies here too, not just to a requester's own manual cancel.
 */
export async function autoExpireIdleRequests(): Promise<number> {
  const db = createDbClient();

  const expiryHours = await getAppSetting<number>("request.expiry_hours");
  const cutoff = new Date(Date.now() - expiryHours * 60 * 60 * 1000).toISOString();

  const { data: candidates, error } = await db
    .from("requests")
    .select("id")
    .in("stage", SEARCHING_STAGES)
    .lt("updated_at", cutoff)
    .limit(MAX_EXPIRING_PER_RUN);
  if (error) throw error;

  let expiredCount = 0;
  for (const request of candidates) {
    const result = await cancelRequest(request.id, "expired");
    if (result.ok) expiredCount++;
  }

  return expiredCount;
}

export type AdminQueueRow = {
  id: string;
  bloodGroup: BloodGroup;
  urgency: Urgency;
  stage: RequestStage;
  createdAt: string;
  prospectsCount: number;
  ownerName: string | null;
};

// A region's open-queue realistically stays in the tens even for a busy
// district - capped explicitly anyway (CLAUDE.md rule 4), same
// generous-but-explicit pattern as bank_shortages' cap (Unit 12).
const MAX_QUEUE_ROWS = 50;
// One query for every returned request's prospect count, not one query
// per request (would be up to MAX_QUEUE_ROWS round trips) - same
// multiplied-cap pattern as getSearchResults' MAX_STOCK_ROWS (Unit 14:
// "8 groups x MAX_BANKS_PER_REGION"). 50 is a generous per-request
// assumption; grouped/counted in JS afterward, not a second DB round trip
// per row.
const MAX_QUEUE_PROSPECTS = MAX_QUEUE_ROWS * 50;

/**
 * A1 · Queue (PRD.md §9.1, §12 Epic 6), real data (Unit 37). Scoped
 * strictly to the caller's own `regionId` - resolved by
 * `lib/db/admin-portal.ts`'s `getActingAdmin()`, never a client-supplied
 * region (this unit's own constraint: "do not add a way to view another
 * region's queue"). Reuses the same `OPEN_STAGES` definition already
 * established for the duplicate-open-request check above - "open" means
 * the same thing everywhere in this codebase, not a screen-specific
 * redefinition.
 *
 * `ownerName` reuses the exact defensive `role IN ('admin','coordinator')`
 * re-check already established for `owner_admin_id` reads in
 * `getRequestStatus` above and `getActivePledgeDetail` (Unit 26) - same
 * nullable, unconstrained FK into `profiles`, same hardening.
 *
 * Sort (urgency then age) and the escalation-threshold flag are
 * deliberately NOT computed here - both depend on "now" at render/
 * interaction time, same treatment Unit 13/23 already gave other
 * genuinely clock-relative UI (open/closed badges, cooldown dates); baking
 * a point-in-time boolean into this response would go stale if the page
 * stays open. `AdminQueueBoard` computes both client-side from
 * `createdAt` and the real threshold minutes this unit's caller supplies.
 */
export async function getAdminQueue(regionId: string): Promise<AdminQueueRow[]> {
  const db = createDbClient();

  const { data: requests, error } = await db
    .from("requests")
    .select("id, blood_group, urgency, stage, created_at, owner_admin_id")
    .eq("region_id", regionId)
    .in("stage", OPEN_STAGES)
    .limit(MAX_QUEUE_ROWS);
  if (error) throw error;
  if (requests.length === 0) return [];

  const requestIds = requests.map((r) => r.id);

  const { data: prospects, error: prospectsError } = await db
    .from("prospects")
    .select("request_id")
    .in("request_id", requestIds)
    .limit(MAX_QUEUE_PROSPECTS);
  if (prospectsError) throw prospectsError;

  const prospectCounts = new Map<string, number>();
  for (const p of prospects) {
    prospectCounts.set(p.request_id, (prospectCounts.get(p.request_id) ?? 0) + 1);
  }

  const ownerIds = [
    ...new Set(requests.map((r) => r.owner_admin_id).filter((id): id is string => id !== null)),
  ];
  const ownerNames = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: owners, error: ownersError } = await db
      .from("profiles")
      .select("id, full_name, role")
      .in("id", ownerIds)
      .limit(ownerIds.length);
    if (ownersError) throw ownersError;
    for (const owner of owners) {
      if (owner.role === "admin" || owner.role === "coordinator") {
        ownerNames.set(owner.id, owner.full_name);
      }
    }
  }

  return requests.map((r) => ({
    id: r.id,
    bloodGroup: r.blood_group as BloodGroup,
    urgency: r.urgency as Urgency,
    stage: r.stage as RequestStage,
    createdAt: r.created_at,
    prospectsCount: prospectCounts.get(r.id) ?? 0,
    ownerName: r.owner_admin_id ? (ownerNames.get(r.owner_admin_id) ?? null) : null,
  }));
}

/**
 * "My Cases" (Unit 59, 2026-08-07) - the destination Handle sends an
 * admin to: every currently-open-stage request this caller personally
 * owns (`owner_admin_id = caller.profileId`), region-independent -
 * deliberately NOT scoped by `caller.regionId` the way `getAdminQueue`
 * is, since a coordinator (no home region) can still own a request via
 * A2's district-wide override, and an admin who owned a request that was
 * later transferred elsewhere is a case this unit's own edge-case table
 * doesn't ask this list to keep showing (transfer already reassigns
 * ownership to the receiving region's own primary admin). Reuses
 * `AdminQueueRow` as the return shape verbatim (not a second, near-
 * identical type) - this unit's own instruction, so both tables' row-
 * rendering logic can be shared/kept structurally identical. `ownerName`
 * on every returned row is always the caller's own name, by construction
 * - included anyway rather than a redundant call site variant, matching
 * how `AdminMyCases.tsx` may or may not choose to render it.
 */
export async function getMyCases(caller: ActingAdmin): Promise<AdminQueueRow[]> {
  const db = createDbClient();

  const { data: requests, error } = await db
    .from("requests")
    .select("id, blood_group, urgency, stage, created_at, owner_admin_id")
    .eq("owner_admin_id", caller.profileId)
    .in("stage", OPEN_STAGES)
    .limit(MAX_QUEUE_ROWS);
  if (error) throw error;
  if (requests.length === 0) return [];

  const requestIds = requests.map((r) => r.id);

  const { data: prospects, error: prospectsError } = await db
    .from("prospects")
    .select("request_id")
    .in("request_id", requestIds)
    .limit(MAX_QUEUE_PROSPECTS);
  if (prospectsError) throw prospectsError;

  const prospectCounts = new Map<string, number>();
  for (const p of prospects) {
    prospectCounts.set(p.request_id, (prospectCounts.get(p.request_id) ?? 0) + 1);
  }

  const { data: callerProfile, error: callerError } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", caller.profileId)
    .maybeSingle();
  if (callerError) throw callerError;
  const ownerName = callerProfile?.full_name ?? null;

  return requests.map((r) => ({
    id: r.id,
    bloodGroup: r.blood_group as BloodGroup,
    urgency: r.urgency as Urgency,
    stage: r.stage as RequestStage,
    createdAt: r.created_at,
    prospectsCount: prospectCounts.get(r.id) ?? 0,
    ownerName,
  }));
}

export type EscalationThresholds = { normalMinutes: number; emergencyMinutes: number };

/**
 * The two `app_settings` rows behind PRD.md §9.2's "No prospect" trigger
 * (Unit 33's seeded defaults: 20 min normal, 0 min emergency) - read
 * together since A1's escalation flag (this unit) and Unit 44's
 * escalation engine both need the identical pair, not two independently
 * duplicated `getAppSetting` call sites.
 */
export async function getEscalationThresholds(): Promise<EscalationThresholds> {
  const [normalMinutes, emergencyMinutes] = await Promise.all([
    getAppSetting<number>("escalation.no_prospect_normal_minutes"),
    getAppSetting<number>("escalation.no_prospect_emergency_minutes"),
  ]);
  return { normalMinutes, emergencyMinutes };
}

export type ConfirmStillNeededResult = { ok: true } | { ok: false; reason: "not_found" | "already_closed" };

/**
 * S5's reply to the idle prompt (Unit 31) - "Yes, still needed." Clears
 * `idle_prompted_at` *and* bumps `updated_at`, so this is a genuine reset
 * of the "no activity" clock (SPEC.md §4.1 row 13), not just a
 * banner-dismissal - a request that goes quiet again later gets prompted
 * a second time, and the 48h expiry clock restarts from this reply too,
 * matching "no reply → auto-expire" (a reply should mean the clock
 * starts over, not merely that the requester saw the message once).
 */
export async function confirmStillNeeded(requestId: string): Promise<ConfirmStillNeededResult> {
  const db = createDbClient();

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("stage")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) return { ok: false, reason: "not_found" };
  if (CLOSED_STAGES.includes(request.stage)) return { ok: false, reason: "already_closed" };

  const { error: updateError } = await db
    .from("requests")
    .update({ idle_prompted_at: null, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) throw updateError;

  return { ok: true };
}
