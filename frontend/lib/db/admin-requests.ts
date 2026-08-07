import { createDbClient } from "@/lib/db/client";
import type { ActingAdmin } from "@/lib/db/admin-portal";
import {
  cancelRequest,
  standDownProspect,
  syncRequestStageAfterProspectChange,
  STANDDOWNABLE_STATUSES,
  OPEN_STAGES,
} from "@/lib/db/requests";
import { writeAuditLog } from "@/lib/db/audit-log";
import { getRotaAdmin } from "@/lib/db/admin-rota";
import { calculateAge } from "@/lib/db/donors";
import { createReport } from "@/lib/db/reports";
import { sendPush } from "@/lib/push/send";
import { revealDonorContact, type ProspectStatus } from "@/lib/serialise/donor-contact";
import type { BloodGroup } from "@/lib/serialise/blood-group";
import type { Urgency } from "@/lib/serialise/urgency";
import type { RequestStage } from "@/lib/serialise/stage";
import type { CloseReason } from "@/lib/serialise/close-reason";
import type { ReportReason } from "@/lib/serialise/report-reason";

type DbClient = ReturnType<typeof createDbClient>;

/**
 * A2 · Request detail (PRD.md §9.1, §12 Epic 6), real data (Unit 39).
 *
 * Region scoping (CLAUDE.md rule 1, this unit's own object-level
 * authorisation requirement): an `admin` may only act on a request whose
 * `region_id` matches their own. A `coordinator` (district-wide role, no
 * home region - SPEC.md §3 item 1) is deliberately exempt from this check
 * - confirmed with the project owner before writing this (not assumed):
 * Unit 44's planned escalation ladder ends with "notify the district
 * coordinator," and a coordinator who could never act on the request
 * they were just escalated to would make that entire role non-functional.
 * A normal `admin` can never reach this branch regardless, since `role`
 * is read from the server-verified session (getActingAdmin), never
 * client input.
 */
function canActOnRegion(caller: ActingAdmin, requestRegionId: string): boolean {
  return caller.role === "coordinator" || caller.regionId === requestRegionId;
}

/**
 * The exclusive ownership lock (2026-08-07, Unit 59 - "Handle" / My Cases).
 * `owner_admin_id` used to be purely cosmetic (any in-region admin could
 * act regardless of who "owned" the request) - this is the real,
 * enforced version: once a request has an owner, only that owner may act
 * on it further. A coordinator's existing district-wide override
 * (`canActOnRegion` above) applies here unconditionally too, same
 * precedent (Unit 39). An *unowned* request stays open to any
 * admin/coordinator in-region exactly as before this unit - there's
 * nothing to protect yet, and a request with an accepted prospect but no
 * owner must stay actionable by someone, or "Needs an owner" becomes a
 * permanent dead end rather than a call to action.
 */
function canActOnOwnership(caller: ActingAdmin, request: { owner_admin_id: string | null }): boolean {
  if (caller.role === "coordinator") return true;
  if (request.owner_admin_id === null) return true;
  return request.owner_admin_id === caller.profileId;
}

type RequestRow = {
  id: string;
  requester_phone: string;
  requester_profile_id: string | null;
  patient_name: string | null;
  blood_group: string;
  units_needed: number;
  destination_bank_id: string;
  region_id: string;
  urgency: string;
  stage: string;
  close_reason: string | null;
  owner_admin_id: string | null;
  owner_assigned_at: string | null;
  admin_notified_at: string | null;
  escalated_at: string | null;
  idle_prompted_at: string | null;
  prospect_cancelled_at: string | null;
  zero_match_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Looks up a request and verifies the caller may act on it (region match,
 * or coordinator). Returns null for "doesn't exist" and "exists but out
 * of scope" alike - same opaque-on-purpose shape as
 * `bank-prospects.ts`'s `getBankScopedProspect` (Unit 28): a crafted
 * request id from a region the caller isn't scoped to should never be
 * distinguishable from a nonexistent one.
 */
async function getScopedRequestRow(
  db: DbClient,
  caller: ActingAdmin,
  requestId: string,
): Promise<RequestRow | null> {
  const { data: request, error } = await db
    .from("requests")
    .select(
      "id, requester_phone, requester_profile_id, patient_name, blood_group, units_needed, destination_bank_id, region_id, urgency, stage, close_reason, owner_admin_id, owner_assigned_at, admin_notified_at, escalated_at, idle_prompted_at, prospect_cancelled_at, zero_match_at, resolved_at, created_at, updated_at",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!request) return null;
  if (!canActOnRegion(caller, request.region_id)) return null;
  return request as RequestRow;
}

// A region realistically borders/relates to only a handful of others -
// same generous cap reasoning as search.ts's MAX_ADJACENT_REGIONS.
const MAX_OTHER_REGIONS = 50;

export type RegionOption = { id: string; name: string };

/**
 * The transfer dropdown's own region list (PRD.md §9.1 A2 "transfer
 * region") - every region except the request's current one. Real seed
 * data currently has exactly one region (Sirsi - "Blocking on real data,"
 * prompts/README.md since Unit 02), so this returns an empty list against
 * the live local stack today; not a bug, the same known gap already
 * documented for adjacent-region search chips.
 */
export async function listOtherRegions(excludeRegionId: string): Promise<RegionOption[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("regions")
    .select("id, name")
    .neq("id", excludeRegionId)
    .limit(MAX_OTHER_REGIONS);
  if (error) throw error;
  return data.map((r) => ({ id: r.id as string, name: r.name as string }));
}

export type AdminActionResult = { ok: true } | { ok: false; reason: "not_found" | "conflict" };

/**
 * "Take ownership" / "Handle" (PRD.md §9.1 A2; front door added Unit 59's
 * Handle button on A1). Sets `owner_admin_id`/`admin_notified_at` - this
 * is what Units 26/30 have been reading as null-safe until now (this
 * unit's own task text).
 *
 * **Real conflict guard, added Unit 59 (2026-08-07) - this used to have
 * none at all**, meaning any admin/coordinator in-region could silently
 * steal any other admin's already-claimed request. Now: the *same*
 * already-owning admin re-clicking is a harmless idempotent no-op success
 * (a stale page or double-click shouldn't error); a *different* admin
 * already owning it is a hard reject (`conflict`); an unowned request
 * proceeds, guarded by `.is("owner_admin_id", null)` re-checked on the
 * actual write (not a pre-check-and-trust, matching
 * `acceptProspect`/`assignProspectToBank`'s own pattern) - if two admins
 * click Handle in the same moment, the loser's guarded write affects zero
 * rows and gets `conflict` too, not a silent overwrite. A coordinator is
 * not special-cased here (unlike `canActOnOwnership`'s use elsewhere) -
 * "handling" a case is a real, single-owner commitment even for a
 * coordinator; their district-wide override is about *acting* on
 * someone else's owned case, not about bypassing the lock when claiming
 * one fresh.
 *
 * **Fixed at Unit 55, not a new behaviour:** this used to unconditionally
 * overwrite `admin_notified_at` to "now" on every call, silently
 * destroying an earlier real notification timestamp (e.g.
 * `escalation.ts`'s zero-match notify) the moment an admin finally
 * claimed the request - the exact gap Unit 55's own "admin response time"
 * metric needs to read. Now only sets it when it was genuinely still
 * null (nobody notified yet, so "now" really is the first notification).
 * `owner_assigned_at` (new column, same unit) is separate and always
 * set-once - unlike `admin_notified_at`, which `transferRequestToRegion`
 * deliberately keeps refreshing for its new owner, `owner_assigned_at`
 * means "the first time any admin engaged with this request," which
 * transfer is also a form of, so both writers guard it the same way.
 */
export async function takeOwnership(caller: ActingAdmin, requestId: string): Promise<AdminActionResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };

  if (request.owner_admin_id === caller.profileId) {
    return { ok: true };
  }
  if (request.owner_admin_id !== null) {
    return { ok: false, reason: "conflict" };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await db
    .from("requests")
    .update({
      owner_admin_id: caller.profileId,
      owner_assigned_at: request.owner_assigned_at ?? now,
      admin_notified_at: request.admin_notified_at ?? now,
      updated_at: now,
    })
    .eq("id", requestId)
    .is("owner_admin_id", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) return { ok: false, reason: "conflict" };

  await writeAuditLog(caller.profileId, "take_ownership", "request", requestId);

  return { ok: true };
}

// The two stages a request can still move forward from - reused from
// the now-removed standalone `scheduleRequest` (this exact list, same
// reasoning: `scheduled`/`resolved`/`closed` are deliberate admin/bank
// actions per `syncRequestStageAfterProspectChange`'s own doc comment,
// never derived).
const SCHEDULABLE_STAGES = ["finding_prospects", "evaluating_prospects"];

// A prospect can only be assigned to the bank while they've said yes but
// haven't gone anywhere yet - not before (still just `invited`, nothing
// to assign), and not after they've physically arrived (`screening`
// onward - the bank already knows about them by then, re-assigning is
// meaningless). Same list for unassigning, for the identical reason: once
// screening has started, undoing "assigned" doesn't undo their having
// shown up - `standDownProspectByAdmin` is the right tool for "this is
// now wrong, end their involvement," not this one.
const ASSIGNABLE_STATUSES = ["accepted"];

/**
 * "Assign to bank" (2026-08-06, user-requested) - the real fix for the
 * gap this whole feature closes: before this existed, a bank saw every
 * accepted/screening donor for its own requests immediately, with no
 * admin action required at all (confirmed by reading
 * lib/db/bank-prospects.ts/lib/serialise/donor-contact.ts directly before
 * writing this). Sets `prospects.assigned_at` - a plain fact independent
 * of `status` (migration `20260806090000_prospects_assigned_at.sql`'s own
 * comment explains why this isn't a new status value instead). Re-checks
 * `status = 'accepted'` and `assigned_at is null` on the actual write
 * (not a pre-check-then-blind-update) - same "never trust a stale page"
 * pattern `acceptProspect`/`markProspectArrived` already established; a
 * failed guard here just means someone already assigned this donor (or
 * their status moved on) between page load and this click, not a real
 * error - the caller re-fetches and shows the current state either way.
 *
 * Also advances `request.stage` to `scheduled` on the *first* assignment
 * for this request (guarded by `SCHEDULABLE_STAGES`, same idempotent-
 * only-forward pattern the removed `scheduleRequest` used) - reusing the
 * existing stage rather than inventing a second, parallel "is an
 * appointment in motion" concept. `scheduled` still means exactly what it
 * already meant at the request level; `assigned_at` is the new per-donor
 * detail of *who*. A second, third, etc. assignment on an
 * already-`scheduled` request is a no-op for the stage (SPEC.md already
 * treats multiple accepted donors as normal and desirable - multiple
 * *assigned* donors are the same idea, extended, per the project owner's
 * explicit confirmation, not an oversight).
 *
 * **Also requires `request.stage` to still be in `OPEN_STAGES`** (found
 * during edge-case testing, 2026-08-06, not assumed safe): `confirmDonation`
 * (`lib/db/bank-prospects.ts`) only ever resolves the ONE prospect it's
 * confirming - it never touches sibling prospects on the same request, so
 * a second `accepted` donor on a multi-donor request can legitimately
 * still sit at `status='accepted'` after the request has already moved to
 * `resolved`. Without this check, an admin could "assign" that leftover
 * donor to the bank for a request that's already done, and the bank's own
 * `getIncomingProspects` (gated only on `assigned_at`/`status`, with no
 * stage check of its own) would show a phantom incoming donor forever.
 * This is a pre-existing gap in `confirmDonation` not touching siblings -
 * not caused by this feature - but this function's own new capability
 * (an admin action that can *create* a fresh `assigned_at` row) is exactly
 * where guarding against it belongs, matching `AdminRequestDetail.tsx`'s
 * own client-side `canAct` gate that already excludes resolved/closed
 * requests from showing this button at all - this makes the server
 * actually enforce what the UI already implied. `unassignProspectFromBank`
 * deliberately has no equivalent guard - clearing a stray `assigned_at` on
 * a dead request is a legitimate cleanup action, never something to block.
 */
export async function assignProspectToBank(
  caller: ActingAdmin,
  requestId: string,
  prospectId: string,
): Promise<AdminActionResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };
  if (!OPEN_STAGES.includes(request.stage)) return { ok: false, reason: "conflict" };
  if (!canActOnOwnership(caller, request)) return { ok: false, reason: "conflict" };

  const { data: prospect, error: prospectError } = await db
    .from("prospects")
    .select("id, request_id, status, donor_id")
    .eq("id", prospectId)
    .maybeSingle();
  if (prospectError) throw prospectError;
  if (!prospect || prospect.request_id !== requestId) return { ok: false, reason: "not_found" };
  if (!ASSIGNABLE_STATUSES.includes(prospect.status)) return { ok: false, reason: "conflict" };

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from("prospects")
    .update({ assigned_at: now })
    .eq("id", prospectId)
    .eq("status", "accepted")
    .is("assigned_at", null)
    .select("id")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) return { ok: false, reason: "conflict" };

  if (SCHEDULABLE_STAGES.includes(request.stage)) {
    const { error: stageError } = await db
      .from("requests")
      .update({ stage: "scheduled", updated_at: now })
      .eq("id", requestId);
    if (stageError) throw stageError;
  }

  await writeAuditLog(caller.profileId, "assign_to_bank", "prospect", prospectId, {
    requestId,
    donorId: prospect.donor_id,
    bankId: request.destination_bank_id,
  });

  return { ok: true };
}

/**
 * "Unassign" (2026-08-06) - the correction path for "assigned the wrong
 * donor, before they've actually gone anywhere." Deliberately narrower
 * than `standDownProspectByAdmin`: this only ever clears `assigned_at`
 * back to null, leaving `status` and everything else about the
 * prospect's own involvement untouched - the donor is still a live,
 * accepted prospect for this request, just no longer flagged for the
 * bank to see. Only valid while still `accepted`, same reasoning as
 * `assignProspectToBank`'s own guard: once screening has started, the
 * donor has already physically shown up, so "unassigning" them at that
 * point would misrepresent what actually happened.
 *
 * Does NOT revert `request.stage` back to `evaluating_prospects` even if
 * this was the only assigned donor - `syncRequestStageAfterProspectChange`'s
 * own doc comment already establishes `scheduled`/`resolved`/`closed` as
 * one-way, deliberate transitions this codebase never auto-reverts
 * (matching `cancelRequest`'s own precedent for `closed`). An admin who
 * un-assigns everyone and assigns someone else shortly after doesn't need
 * the stage to bounce back and forth in between.
 */
export async function unassignProspectFromBank(
  caller: ActingAdmin,
  requestId: string,
  prospectId: string,
): Promise<AdminActionResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };
  if (!canActOnOwnership(caller, request)) return { ok: false, reason: "conflict" };

  const { data: prospect, error: prospectError } = await db
    .from("prospects")
    .select("id, request_id, status, donor_id")
    .eq("id", prospectId)
    .maybeSingle();
  if (prospectError) throw prospectError;
  if (!prospect || prospect.request_id !== requestId) return { ok: false, reason: "not_found" };
  if (!ASSIGNABLE_STATUSES.includes(prospect.status)) return { ok: false, reason: "conflict" };

  const { data: updated, error: updateError } = await db
    .from("prospects")
    .update({ assigned_at: null })
    .eq("id", prospectId)
    .eq("status", "accepted")
    .not("assigned_at", "is", null)
    .select("id")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) return { ok: false, reason: "conflict" };

  await writeAuditLog(caller.profileId, "unassign_from_bank", "prospect", prospectId, {
    requestId,
    donorId: prospect.donor_id,
    bankId: request.destination_bank_id,
  });

  return { ok: true };
}

/**
 * "Stand down prospect" (PRD.md §9.1 A2). Reuses `standDownProspect`
 * (Unit 30) - the same shared primitive `cancelRequest` itself calls -
 * not a second implementation, per this unit's own "Read before
 * writing" instruction. Also reuses `syncRequestStageAfterProspectChange`
 * afterward (Unit 24), same as Unit 28's bank-side screening outcomes -
 * an admin proactively standing one donor down can revert the request to
 * `finding_prospects` if no other prospect is still live, same as a
 * bank's rejection/no-show does.
 *
 * **Pushes a thank-you too (2026-08-07)** - this is exactly SPEC.md D1's
 * own scenario ("Several donors accept for one unit... Extras `stood_down`
 * with a warm thank-you"): once an admin has enough donors and proactively
 * stands one down, that donor should hear about it, same as
 * `cancelRequest`'s own identical addition (this file's `RequestRow`
 * already selects `blood_group`, no extra query needed here).
 */
export async function standDownProspectByAdmin(
  caller: ActingAdmin,
  requestId: string,
  prospectId: string,
): Promise<AdminActionResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };
  if (!canActOnOwnership(caller, request)) return { ok: false, reason: "conflict" };

  const { data: prospect, error } = await db
    .from("prospects")
    .select("id, request_id, status, donor_id")
    .eq("id", prospectId)
    .maybeSingle();
  if (error) throw error;
  if (!prospect || prospect.request_id !== requestId) return { ok: false, reason: "not_found" };
  if (!STANDDOWNABLE_STATUSES.includes(prospect.status)) return { ok: false, reason: "conflict" };

  await standDownProspect(prospectId);
  await syncRequestStageAfterProspectChange(requestId);
  await sendPush(
    prospect.donor_id,
    "donor",
    { type: "stood_down", bloodGroup: request.blood_group as BloodGroup, deepLink: "/donor" },
    { requestId },
  );

  return { ok: true };
}

/**
 * Same scoping as every other action here - re-resolves the request
 * (not a client-supplied region id) so a caller can only ever see the
 * transfer options for a request they're actually allowed to act on.
 */
export async function listTransferableRegions(
  caller: ActingAdmin,
  requestId: string,
): Promise<RegionOption[] | null> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return null;
  return listOtherRegions(request.region_id);
}

export type TransferResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid_region" | "no_primary_admin" | "conflict" };

/**
 * "Transfer region" (PRD.md §9.1 A2, §9.3: "Transfer moves ownership -
 * receiving region's primary admin becomes owner; logged"). The
 * receiving region's primary admin is resolved via `lib/db/admin-rota.ts`'s
 * `getRotaAdmin` (extracted there in Unit 44, which needs the identical
 * lookup for its own escalation triggers - not duplicated a second time
 * here) - if none exists yet, this returns a clear `no_primary_admin`
 * result rather than silently leaving the request unowned or crashing.
 * No `admin_rota` rows are seeded anywhere in this codebase as of this
 * unit (flagged since Unit 35/37/38) - this is a real operational gap for
 * whenever this feature is used against live regions, not a bug in this
 * function.
 *
 * **Ownership-gated, added Unit 59 (2026-08-07), but only when a request
 * is actually owned** - `canActOnOwnership` already returns `true` for
 * the unowned case, so this needs no special-casing: an unowned request
 * stays open to any admin/coordinator in-region to transfer, exactly as
 * before this unit (there's nothing to protect yet). An *owned* request
 * can now only be transferred by its current owner (or a coordinator) -
 * transfer is itself an ownership-transferring action by definition, not
 * a stranger grabbing someone else's case, so this doesn't need a
 * separate "was I the owner" question beyond the shared helper.
 */
export async function transferRequestToRegion(
  caller: ActingAdmin,
  requestId: string,
  targetRegionId: string,
): Promise<TransferResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };
  if (!canActOnOwnership(caller, request)) return { ok: false, reason: "conflict" };

  const { data: targetRegion, error: regionError } = await db
    .from("regions")
    .select("id")
    .eq("id", targetRegionId)
    .maybeSingle();
  if (regionError) throw regionError;
  if (!targetRegion) return { ok: false, reason: "invalid_region" };

  const primaryAdminId = await getRotaAdmin(targetRegionId, 1);
  if (!primaryAdminId) return { ok: false, reason: "no_primary_admin" };

  const now = new Date().toISOString();
  const { error: updateError } = await db
    .from("requests")
    .update({
      region_id: targetRegionId,
      owner_admin_id: primaryAdminId,
      owner_assigned_at: request.owner_assigned_at ?? now,
      admin_notified_at: now,
      updated_at: now,
    })
    .eq("id", requestId);
  if (updateError) throw updateError;

  await writeAuditLog(caller.profileId, "transfer_region", "request", requestId, {
    fromRegionId: request.region_id,
    toRegionId: targetRegionId,
    newOwnerId: primaryAdminId,
  });

  return { ok: true };
}

// Widens CancelRequestResult's own reason union with the admin-only
// "conflict" outcome (ownership lock, Unit 59) - deliberately a separate
// type, not a change to CancelRequestResult itself, since that type is
// also returned by the public, session-less S5 cancel path
// (lib/actions/request-status.ts's cancelRequestAction) and the cron-driven
// autoExpireIdleRequests, neither of which has (or should ever gain) an
// ownership concept to report a conflict about.
export type AdminCloseResult = { ok: true } | { ok: false; reason: "not_found" | "already_closed" | "conflict" };

/**
 * "Close" (PRD.md §9.1 A2, §9.3: "Close requires reason - no silent
 * closes"). Reuses `cancelRequest` (Unit 30) exactly, per this unit's own
 * explicit instruction - close-reason validation, standing down every
 * live prospect, and the terminal `stage = 'closed'` write all already
 * live there; nothing about closing is reimplemented here. The audit_log
 * write (`'close_request'`, matching PRD.md §4.6's own literal example
 * action value) happens only after a genuine close succeeds, not on an
 * already-closed/not-found result.
 *
 * Ownership-gated, added Unit 59 (2026-08-07) - same `canActOnOwnership`
 * check as every other write action in this file.
 */
export async function closeRequestByAdmin(
  caller: ActingAdmin,
  requestId: string,
  closeReason: CloseReason,
): Promise<AdminCloseResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };
  if (!canActOnOwnership(caller, request)) return { ok: false, reason: "conflict" };

  const result = await cancelRequest(requestId, closeReason);
  if (result.ok) {
    await writeAuditLog(caller.profileId, "close_request", "request", requestId, { closeReason });
  }
  return result;
}

export type FileReportResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "conflict" | "invalid_reason" | "self_report" };

/**
 * A2's admin-filed report (2026-08-07, user-requested - see the new
 * "Report" action next to the requester's own details). Confirmed with
 * the project owner before writing this: neither a requester nor a donor
 * ever sees the *other* party's contact info anywhere in this app
 * (checked directly - `PledgeDetail`/`getActivePledgeDetail` never
 * selects a requester phone; S1-S5/D1-D6 have no report entry point of
 * their own), so the admin viewing A2 - who already sees both - is the
 * only realistic place a report against either party can originate from.
 * Matches PRD.md §11.3's own literal requirement ("the report mechanism
 * must accept [selling/buying blood] as a reason") via
 * `lib/serialise/report-reason.ts`'s `payment_demanded` value.
 *
 * Ownership-gated the same way every other A2 write action is
 * (`canActOnOwnership`) - a non-owning, non-coordinator admin can still
 * view this screen read-only (region scope alone), but filing a report
 * is a real, consequential write on this request's own people, same
 * class as assign/close/transfer, not a passive read.
 *
 * `requester_profile_id` is non-nullable in practice for any request
 * reachable through A2 (raising a request always goes through phone
 * verification first - `lib/actions/raise-request.ts`'s
 * `getVerifiedRequester` returns a non-nullable `profileId`) - the
 * column itself is nullable for schema flexibility, so this still
 * defends against it rather than assuming.
 */
export async function fileReportOnRequester(
  caller: ActingAdmin,
  requestId: string,
  reason: ReportReason,
  details: string | null,
): Promise<FileReportResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };
  if (!canActOnOwnership(caller, request)) return { ok: false, reason: "conflict" };
  if (!request.requester_profile_id) return { ok: false, reason: "not_found" };

  const result = await createReport(caller.profileId, request.requester_profile_id, reason, details);
  if (!result.ok) return result;

  await writeAuditLog(caller.profileId, "file_report", "profile", request.requester_profile_id, {
    requestId,
    reportId: result.reportId,
    reason,
  });

  return { ok: true };
}

/**
 * Same as `fileReportOnRequester` above, for a prospect's own donor
 * instead. Deliberately has no status restriction (unlike
 * `assignProspectToBank`'s `ASSIGNABLE_STATUSES`) - a donor who
 * ultimately gets rejected/no-shows is, if anything, *more* likely to be
 * the one worth reporting, not less, so every status on this request
 * stays reportable.
 */
export async function fileReportOnProspectDonor(
  caller: ActingAdmin,
  requestId: string,
  prospectId: string,
  reason: ReportReason,
  details: string | null,
): Promise<FileReportResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };
  if (!canActOnOwnership(caller, request)) return { ok: false, reason: "conflict" };

  const { data: prospect, error } = await db
    .from("prospects")
    .select("id, request_id, donor_id")
    .eq("id", prospectId)
    .maybeSingle();
  if (error) throw error;
  if (!prospect || prospect.request_id !== requestId) return { ok: false, reason: "not_found" };

  const result = await createReport(caller.profileId, prospect.donor_id, reason, details);
  if (!result.ok) return result;

  await writeAuditLog(caller.profileId, "file_report", "profile", prospect.donor_id, {
    requestId,
    prospectId,
    reportId: result.reportId,
    reason,
  });

  return { ok: true };
}

export type AdminProspectView = {
  id: string;
  donorName: string;
  donorPhone: string | null;
  donorAge: number | null;
  bloodGroup: BloodGroup;
  status: ProspectStatus;
  assignedAt: string | null;
  invitedAt: string;
  respondedAt: string | null;
  screenedAt: string | null;
  outcomeAt: string | null;
};

export type AdminTimelineEvent = { at: string; description: string };

export type AdminRequestDetailView = {
  id: string;
  requesterPhone: string;
  patientName: string | null;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency: Urgency;
  stage: RequestStage;
  closeReason: string | null;
  destinationBank: { name: string; address: string; phone: string };
  ownerName: string | null;
  // Server-computed, added Unit 59 (2026-08-07) - folds both the
  // pre-existing stage-based condition (a closed/resolved request is
  // never actionable by anyone) and the new ownership lock into one flag,
  // rather than shipping the raw stage/owner id to the client and
  // recombining them there (matches this codebase's existing preference
  // for server-computed booleans over raw ids - `ownerName` itself is
  // already resolved server-side the same way). `AdminRequestDetail.tsx`
  // reads this directly instead of deriving its own local `canAct`.
  canAct: boolean;
  prospects: AdminProspectView[];
  timeline: AdminTimelineEvent[];
};

// A request's prospect count realistically stays in the tens - same cap
// reasoning as requests.ts's own MAX_PROSPECTS_PER_REQUEST.
const MAX_DETAIL_PROSPECTS = 200;

function buildTimeline(request: RequestRow, prospects: AdminProspectView[]): AdminTimelineEvent[] {
  const events: AdminTimelineEvent[] = [{ at: request.created_at, description: "Request created" }];

  if (request.zero_match_at) {
    events.push({ at: request.zero_match_at, description: "No eligible donors found at creation" });
  }

  for (const p of prospects) {
    const donorLabel = p.donorName || "A donor";
    events.push({ at: p.invitedAt, description: `${donorLabel} invited` });

    if (p.respondedAt) {
      // Any status other than "invited" implies an accept happened at
      // this timestamp (screening/rejected/no_show/donated all require
      // having accepted first); "invited" with respondedAt set means the
      // donor declined but the prospect stays invited (Unit 24's own
      // design - see lib/db/prospects.ts).
      const verb = p.status === "invited" ? "declined" : "accepted";
      events.push({ at: p.respondedAt, description: `${donorLabel} ${verb}` });
    }
    if (p.assignedAt) {
      events.push({ at: p.assignedAt, description: `${donorLabel} assigned to bank` });
    }
    if (p.screenedAt) {
      events.push({ at: p.screenedAt, description: `${donorLabel} arrived for screening` });
    }
    if (p.outcomeAt) {
      const outcomeText =
        p.status === "donated"
          ? "confirmed donated"
          : p.status === "rejected"
            ? "failed screening"
            : p.status === "no_show"
              ? "did not show up"
              : p.status === "stood_down"
                ? "stood down"
                : "outcome recorded";
      events.push({ at: p.outcomeAt, description: `${donorLabel} ${outcomeText}` });
    }
  }

  if (request.admin_notified_at) {
    events.push({ at: request.admin_notified_at, description: "Admin notified / took ownership" });
  }
  if (request.escalated_at) {
    events.push({ at: request.escalated_at, description: "Escalated" });
  }
  if (request.idle_prompted_at) {
    events.push({ at: request.idle_prompted_at, description: "Idle prompt sent to requester" });
  }
  if (request.prospect_cancelled_at) {
    events.push({ at: request.prospect_cancelled_at, description: "A donor cancelled their pledge" });
  }
  if (request.resolved_at) {
    events.push({ at: request.resolved_at, description: "Resolved - blood donated" });
  }
  if (request.stage === "closed" && request.close_reason) {
    events.push({ at: request.updated_at, description: `Closed - ${request.close_reason}` });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/**
 * A2 · Request detail read (PRD.md §9.1), real data (Unit 39). Donor
 * phone passes through `revealDonorContact` (Unit 28's own Rule 3
 * serialisation layer) exactly - the admin branch only ever releases it
 * for a currently `accepted` prospect (CLAUDE.md rule 3, verbatim). Every
 * successful reveal writes one `audit_log` row here, as a side effect of
 * the read itself (PRD.md §9.3: "Contact views audited - no exceptions")
 * - viewing this screen at all *is* the view being audited, not a
 * separate click; "call donor" (this unit's own scope note) is only ever
 * a `tel:` link around whatever this function already returned, never a
 * second disclosure path. Donor *names* are shown unconditionally
 * (unlike phone) - Rule 3's own text is specifically about phone numbers,
 * and A3's own precedent (Unit 40) already shows donor names freely in
 * region-scoped search results, gating only the phone.
 *
 * The event timeline is synthesised entirely from already-existing
 * timestamp columns on `requests`/`prospects` (CLAUDE.md rule 9: no new
 * infrastructure) - there is no dedicated events/audit-trail table for
 * this, and this unit's own task text never asks for one.
 *
 * `canAct` and the per-prospect phone reveal are both gated on
 * `canActOnOwnership`, added Unit 59 (2026-08-07) - a non-owning,
 * non-coordinator admin can still load this page (region scope alone
 * still applies via `getScopedRequestRow`), but sees no phone numbers and
 * a `canAct: false` the component renders as read-only.
 */
export async function getAdminRequestDetail(
  caller: ActingAdmin,
  requestId: string,
): Promise<AdminRequestDetailView | null> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return null;

  const { data: bank, error: bankError } = await db
    .from("blood_banks")
    .select("name, address, phone")
    .eq("id", request.destination_bank_id)
    .maybeSingle();
  if (bankError) throw bankError;

  let ownerName: string | null = null;
  if (request.owner_admin_id) {
    const { data: owner, error: ownerError } = await db
      .from("profiles")
      .select("full_name, role")
      .eq("id", request.owner_admin_id)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (owner && (owner.role === "admin" || owner.role === "coordinator")) {
      ownerName = owner.full_name;
    }
  }

  // Same complement OPEN_STAGES already establishes elsewhere in this
  // file (resolved/closed are exactly the two stages not in it) - reused
  // rather than a second, locally-defined CLOSED_STAGES array (this
  // file's own AdminQueueRow/AdminMyCases callers, and the component this
  // feeds, both already treat "closed stage" this way).
  const canAct = OPEN_STAGES.includes(request.stage) && canActOnOwnership(caller, request);

  const { data: prospects, error: prospectsError } = await db
    .from("prospects")
    .select("id, donor_id, status, assigned_at, invited_at, responded_at, screened_at, outcome_at")
    .eq("request_id", requestId)
    .limit(MAX_DETAIL_PROSPECTS);
  if (prospectsError) throw prospectsError;

  const donorIds = [...new Set(prospects.map((p) => p.donor_id as string))];

  let bloodGroupByDonor = new Map<string, BloodGroup>();
  // Donor age display (2026-08-06, user-requested) - `dob` is read here
  // purely to compute an integer age server-side (via the shared
  // `calculateAge` this file now imports from lib/db/donors.ts), never
  // returned to the client as a raw birthdate. Slightly better data
  // minimisation than shipping the full DOB for a display that only ever
  // needs "34," even though DOB itself isn't new data - it's already
  // collected at registration for the 18-65 age gate.
  let dobByDonor = new Map<string, string>();
  let profileByDonor = new Map<string, { full_name: string; phone: string | null }>();
  if (donorIds.length > 0) {
    const { data: donors, error: donorsError } = await db
      .from("donors")
      .select("id, blood_group, dob")
      .in("id", donorIds)
      .limit(donorIds.length);
    if (donorsError) throw donorsError;
    bloodGroupByDonor = new Map(donors.map((d) => [d.id as string, d.blood_group as BloodGroup]));
    dobByDonor = new Map(donors.map((d) => [d.id as string, d.dob as string]));

    const { data: profiles, error: profilesError } = await db
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", donorIds)
      .limit(donorIds.length);
    if (profilesError) throw profilesError;
    profileByDonor = new Map(profiles.map((p) => [p.id as string, p]));
  }

  const prospectViews: AdminProspectView[] = [];
  for (const prospect of prospects) {
    const status = prospect.status as ProspectStatus;
    const profile = profileByDonor.get(prospect.donor_id as string);
    // Explicitly null, not `prospect.assigned_at` - the admin_prospect
    // channel doesn't gate on assignment at all (an admin needs to see
    // the phone *before* assigning anyone, to call and pre-screen them
    // first), same as it doesn't take a real value for the
    // admin_region_lookup channel elsewhere in this codebase. Passing the
    // real value here would be functionally identical (this branch never
    // reads it) but would misleadingly suggest it matters.
    //
    // Also gated on `canActOnOwnership`, added Unit 59 (2026-08-07) - the
    // same defence-in-depth reasoning already applied to `assigned_at`/the
    // bank channel on 2026-08-06 (checking status alone was not enough
    // there; checking write-permission alone is not enough here either).
    // A non-owning, non-coordinator admin gets exactly the same shape
    // `revealDonorContact` already returns for "not entitled" (`null` ->
    // hidden phone), not a thrown error - reaching this screen at all is
    // still legitimate (region-scoped read-only viewing), only the phone
    // disclosure is denied.
    const contact = canActOnOwnership(caller, request)
      ? revealDonorContact(
          "admin_prospect",
          status,
          {
            fullName: profile?.full_name ?? null,
            phone: profile?.phone ?? null,
          },
          null,
        )
      : null;

    if (contact) {
      await writeAuditLog(caller.profileId, "view_contact", "donor", prospect.donor_id as string, {
        requestId,
        prospectId: prospect.id,
      });
    }

    const dob = dobByDonor.get(prospect.donor_id as string);
    prospectViews.push({
      id: prospect.id as string,
      donorName: profile?.full_name ?? "",
      donorPhone: contact?.phone ?? null,
      donorAge: dob ? calculateAge(dob) : null,
      bloodGroup: bloodGroupByDonor.get(prospect.donor_id as string) ?? "O+",
      status,
      assignedAt: prospect.assigned_at,
      invitedAt: prospect.invited_at,
      respondedAt: prospect.responded_at,
      screenedAt: prospect.screened_at,
      outcomeAt: prospect.outcome_at,
    });
  }

  return {
    id: request.id,
    requesterPhone: request.requester_phone,
    patientName: request.patient_name,
    bloodGroup: request.blood_group as BloodGroup,
    unitsNeeded: request.units_needed,
    urgency: request.urgency as Urgency,
    stage: request.stage as RequestStage,
    closeReason: request.close_reason,
    destinationBank: {
      name: bank?.name ?? "",
      address: bank?.address ?? "",
      phone: bank?.phone ?? "",
    },
    ownerName,
    canAct,
    prospects: prospectViews,
    timeline: buildTimeline(request, prospectViews),
  };
}
