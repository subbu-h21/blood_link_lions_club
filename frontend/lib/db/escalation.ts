import { createDbClient } from "@/lib/db/client";
import { getAppSetting } from "@/lib/db/app-settings";
import { getRotaAdmin, getDistrictCoordinatorIds } from "@/lib/db/admin-rota";
import { OPEN_STAGES } from "@/lib/db/requests";
import { sendPush } from "@/lib/push/send";

/**
 * Escalation engine (Unit 44, PRD.md §9.2 rows 1-5 - rows 6/7, "still
 * needed?" and auto-expiry, already shipped in Unit 31). Every trigger
 * below shares the same idempotency shape as Unit 31's own jobs: guard on
 * a not-yet-set timestamp column, set it once notified, never re-fire
 * for the same reason on the same request. `admin_notified_at` is the
 * single shared guard for all three "notify primary" triggers (rows
 * 1-3) - once ANY of them fires for a request, the other two become
 * no-ops for it; a second ping to the same admin about the same request
 * for a different one of these three reasons serves no purpose. This is
 * the same column Unit 39's take-ownership already sets, so an admin who
 * proactively claims a request before any automated trigger fires is
 * correctly treated as "already handled" here too - not a coincidence,
 * `admin_notified_at`'s real meaning is "some admin already knows about
 * this," regardless of how that came to be true.
 */

// A single cron run realistically touches a handful to low hundreds of
// requests at district scale - same generous-but-explicit cap reasoning
// as every other bulk read in this codebase.
const MAX_ESCALATION_CANDIDATES = 200;

type PrimaryNotifyCandidate = {
  id: string;
  region_id: string;
  blood_group: string;
  urgency: string;
  destination_bank_id: string;
};

/**
 * Re-verifies `admin_notified_at IS NULL` at write time (not just at
 * query time) - the same "re-check, don't just pre-check" pattern this
 * codebase uses everywhere a race is plausible (`markProspectArrived`,
 * Unit 28). Sets `admin_notified_at` unconditionally once a real primary
 * admin is resolvable or not - marking "an attempt was made" even with
 * no `admin_rota` row configured yet (a real, currently-reachable state)
 * is what lets A1's own "unowned request" flag mean something without
 * this job re-attempting the same request forever.
 */
async function notifyPrimaryAdmin(candidate: PrimaryNotifyCandidate): Promise<boolean> {
  const db = createDbClient();
  const now = new Date().toISOString();

  const { data: claimed, error: claimError } = await db
    .from("requests")
    .update({ admin_notified_at: now })
    .eq("id", candidate.id)
    .is("admin_notified_at", null)
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return false;

  const primaryAdminId = await getRotaAdmin(candidate.region_id, 1);
  if (primaryAdminId) {
    const { data: bank, error: bankError } = await db
      .from("blood_banks")
      .select("name")
      .eq("id", candidate.destination_bank_id)
      .maybeSingle();
    if (bankError) throw bankError;

    await sendPush(
      primaryAdminId,
      "admin",
      {
        bloodGroup: candidate.blood_group,
        destinationBank: bank?.name ?? "",
        urgency: candidate.urgency,
        deepLink: `/admin/request/${candidate.id}`,
      },
      { requestId: candidate.id },
    );
  }

  return true;
}

const CANDIDATE_COLUMNS = "id, region_id, blood_group, urgency, destination_bank_id";

/**
 * PRD.md §9.2 row 1: "No prospect" - `finding_prospects` past the
 * urgency-dependent threshold (`escalation.no_prospect_normal_minutes` /
 * `_emergency_minutes`, Unit 33's seeded defaults: 20 min / 0 min).
 * Measured from `updated_at`, not `created_at` - functionally equivalent
 * here (nothing else touches `updated_at` between a request's creation
 * and its first accept, since Unit 22's own `zero_match_at` write is the
 * only exception and that's a different trigger entirely), but keeps the
 * same "activity clock" convention Unit 31 already established rather
 * than introducing a second one. Two separate queries, not one `.or()` -
 * this codebase already avoids building `.or()` filter strings
 * (Unit 14's own `resolveLocation` comment: real fragility, not just
 * style) in favour of two plain, simple reads.
 */
export async function notifyPrimaryForNoProspect(): Promise<number> {
  const db = createDbClient();
  const normalMinutes = await getAppSetting<number>("escalation.no_prospect_normal_minutes");
  const emergencyMinutes = await getAppSetting<number>("escalation.no_prospect_emergency_minutes");
  const normalCutoff = new Date(Date.now() - normalMinutes * 60 * 1000).toISOString();
  const emergencyCutoff = new Date(Date.now() - emergencyMinutes * 60 * 1000).toISOString();

  const { data: normalCandidates, error: normalError } = await db
    .from("requests")
    .select(CANDIDATE_COLUMNS)
    .eq("stage", "finding_prospects")
    .eq("urgency", "normal")
    .is("admin_notified_at", null)
    .lt("updated_at", normalCutoff)
    .limit(MAX_ESCALATION_CANDIDATES);
  if (normalError) throw normalError;

  const { data: emergencyCandidates, error: emergencyError } = await db
    .from("requests")
    .select(CANDIDATE_COLUMNS)
    .eq("stage", "finding_prospects")
    .eq("urgency", "emergency")
    .is("admin_notified_at", null)
    .lt("updated_at", emergencyCutoff)
    .limit(MAX_ESCALATION_CANDIDATES);
  if (emergencyError) throw emergencyError;

  let count = 0;
  for (const candidate of [...normalCandidates, ...emergencyCandidates] as PrimaryNotifyCandidate[]) {
    if (await notifyPrimaryAdmin(candidate)) count++;
  }
  return count;
}

/**
 * PRD.md §9.2 row 2: "Prospect appeared" - any prospect reaching
 * `accepted` notifies the primary admin immediately. There is no
 * event/webhook mechanism in this codebase (CLAUDE.md rule 9) - polled
 * instead, via the one condition that's only ever true the moment a
 * prospect first accepts: `stage = 'evaluating_prospects'`
 * (`syncRequestStageAfterProspectChange`, Unit 24, is the only writer of
 * this transition). "Immediately" is approximated by this job's own cron
 * schedule frequency (every minute - see the scheduling migration), not
 * by anything in this function itself.
 */
export async function notifyPrimaryForProspectAccepted(): Promise<number> {
  const db = createDbClient();
  const { data: candidates, error } = await db
    .from("requests")
    .select(CANDIDATE_COLUMNS)
    .eq("stage", "evaluating_prospects")
    .is("admin_notified_at", null)
    .limit(MAX_ESCALATION_CANDIDATES);
  if (error) throw error;

  let count = 0;
  for (const candidate of candidates as PrimaryNotifyCandidate[]) {
    if (await notifyPrimaryAdmin(candidate)) count++;
  }
  return count;
}

/**
 * PRD.md §9.2 row 3: "Zero donors matched" - `requests.zero_match_at`
 * (Unit 22) finally has a real reader (flagged as an open gap at Unit
 * 32's own M3 review gate, closed here as originally planned).
 */
export async function notifyPrimaryForZeroMatch(): Promise<number> {
  const db = createDbClient();
  const { data: candidates, error } = await db
    .from("requests")
    .select(CANDIDATE_COLUMNS)
    .not("zero_match_at", "is", null)
    .is("admin_notified_at", null)
    .limit(MAX_ESCALATION_CANDIDATES);
  if (error) throw error;

  let count = 0;
  for (const candidate of candidates as PrimaryNotifyCandidate[]) {
    if (await notifyPrimaryAdmin(candidate)) count++;
  }
  return count;
}

/**
 * PRD.md §9.2 row 4: "Admin inaction" - notified more than
 * `escalation.admin_inaction_minutes` ago, still no owner. Guarded on
 * `escalated_at IS NULL` (this tier's own idempotency marker) and
 * `owner_admin_id IS NULL` (an admin who has since taken ownership - Unit
 * 39 - stops the ladder here, per this unit's own scope note: "it does
 * not take ownership on the admin's behalf, that remains a human
 * action"). `OPEN_STAGES` excludes anything already resolved/closed.
 */
export async function escalateToSecondaryForAdminInaction(): Promise<number> {
  const db = createDbClient();
  const inactionMinutes = await getAppSetting<number>("escalation.admin_inaction_minutes");
  const cutoff = new Date(Date.now() - inactionMinutes * 60 * 1000).toISOString();

  const { data: candidates, error } = await db
    .from("requests")
    .select(CANDIDATE_COLUMNS)
    .in("stage", OPEN_STAGES)
    .not("admin_notified_at", "is", null)
    .is("owner_admin_id", null)
    .is("escalated_at", null)
    .lt("admin_notified_at", cutoff)
    .limit(MAX_ESCALATION_CANDIDATES);
  if (error) throw error;

  let count = 0;
  for (const candidate of candidates as PrimaryNotifyCandidate[]) {
    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await db
      .from("requests")
      .update({ escalated_at: now })
      .eq("id", candidate.id)
      .is("escalated_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;

    const secondaryAdminId = await getRotaAdmin(candidate.region_id, 2);
    if (secondaryAdminId) {
      const { data: bank, error: bankError } = await db
        .from("blood_banks")
        .select("name")
        .eq("id", candidate.destination_bank_id)
        .maybeSingle();
      if (bankError) throw bankError;

      await sendPush(
        secondaryAdminId,
        "admin",
        {
          bloodGroup: candidate.blood_group,
          destinationBank: bank?.name ?? "",
          urgency: candidate.urgency,
          deepLink: `/admin/request/${candidate.id}`,
        },
        { requestId: candidate.id },
      );
    }
    count++;
  }
  return count;
}

/**
 * PRD.md §9.2 row 5: "Secondary inaction" - a further
 * `escalation.secondary_inaction_minutes` after the secondary was
 * notified, still no owner, escalates to every district coordinator
 * (SPEC.md §3 item 1's "fallback" role - role-wide, not a rota row).
 * Guarded on `coordinator_notified_at IS NULL` - its own dedicated
 * marker (this unit's own migration), distinct from `escalated_at`
 * (which already means "when was the secondary admin notified" for the
 * *previous* rung) - without a separate marker here, this job would
 * re-notify every coordinator on every run once past threshold, since
 * `escalated_at` itself never changes again.
 */
export async function escalateToCoordinatorForSecondaryInaction(): Promise<number> {
  const db = createDbClient();
  const secondaryMinutes = await getAppSetting<number>("escalation.secondary_inaction_minutes");
  const cutoff = new Date(Date.now() - secondaryMinutes * 60 * 1000).toISOString();

  const { data: candidates, error } = await db
    .from("requests")
    .select(CANDIDATE_COLUMNS)
    .in("stage", OPEN_STAGES)
    .not("escalated_at", "is", null)
    .is("owner_admin_id", null)
    .is("coordinator_notified_at", null)
    .lt("escalated_at", cutoff)
    .limit(MAX_ESCALATION_CANDIDATES);
  if (error) throw error;

  let count = 0;
  for (const candidate of candidates as PrimaryNotifyCandidate[]) {
    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await db
      .from("requests")
      .update({ coordinator_notified_at: now })
      .eq("id", candidate.id)
      .is("coordinator_notified_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;

    const coordinatorIds = await getDistrictCoordinatorIds();
    const { data: bank, error: bankError } = await db
      .from("blood_banks")
      .select("name")
      .eq("id", candidate.destination_bank_id)
      .maybeSingle();
    if (bankError) throw bankError;

    for (const coordinatorId of coordinatorIds) {
      await sendPush(
        coordinatorId,
        "coordinator",
        {
          bloodGroup: candidate.blood_group,
          destinationBank: bank?.name ?? "",
          urgency: candidate.urgency,
          deepLink: `/admin/request/${candidate.id}`,
        },
        { requestId: candidate.id },
      );
    }
    count++;
  }
  return count;
}
