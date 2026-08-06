import { createDbClient } from "@/lib/db/client";
import { getAppSetting } from "@/lib/db/app-settings";
import { syncRequestStageAfterProspectChange } from "@/lib/db/requests";
import { writeAuditLog } from "@/lib/db/audit-log";
import { revealDonorContact, type ProspectStatus } from "@/lib/serialise/donor-contact";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";

type DbClient = ReturnType<typeof createDbClient>;

// A bank's concurrently "incoming" (accepted/screening) prospects
// realistically number in the single-to-low-double digits - same
// generous-but-explicit cap reasoning as bank_shortages' 50 (Unit 12).
const MAX_INCOMING_PROSPECTS = 100;

export type IncomingProspect = {
  id: string;
  donorName: string;
  donorPhone: string;
  bloodGroup: BloodGroup;
  requestRef: string;
  status: "accepted" | "screening";
};

/**
 * B3 · Incoming prospects (PRD.md §8.1), real data (Unit 28). Scoped to
 * the acting bank_staff's own bank via `requests.destination_bank_id` -
 * never the full regional donor list (this unit's own constraint;
 * CLAUDE.md rule 1's object-level authorisation). Manual multi-step
 * query, matching this codebase's established no-relation-embedding style
 * (settled Unit 10): requests -> prospects -> donors/profiles.
 * `status IN ('accepted','screening')` mirrors the mock's own
 * precondition for a row appearing at all (PRD.md §8.1 B3: "donors
 * scheduled to attend") - a rejected/no_show/donated prospect no longer
 * needs bank attention and simply won't be returned on the next real
 * load, unlike Unit 27's mock, which had no reload to fall out of.
 *
 * `assigned_at is not null` (2026-08-06) is a second, independent
 * condition alongside status, not a replacement for it - before this,
 * *any* accepted/screening prospect for this bank showed up here the
 * instant the donor accepted, regardless of whether an admin had done
 * anything at all. This is the actual gate CLAUDE.md rule 3's own text
 * ("the bank that donor is **scheduled** at") was already describing;
 * the code just never enforced the word "scheduled" until now. Filtering
 * here (not just in `revealDonorContact` below) means an unassigned
 * donor's row is excluded from the result entirely - the bank never even
 * learns an unassigned donor exists for their own request, not just that
 * their phone is hidden.
 *
 * Every row that actually reveals a phone number writes one `audit_log`
 * entry, same "one row per revealed contact" shape as A2/A3's own
 * `view_contact` writes (`admin-requests.ts`, `admin-donors.ts`) - this
 * was the one `revealDonorContact` caller that didn't log yet.
 */
export async function getIncomingProspects(bankId: string, actorId: string): Promise<IncomingProspect[]> {
  const db = createDbClient();

  const { data: requests, error: requestsError } = await db
    .from("requests")
    .select("id")
    .eq("destination_bank_id", bankId)
    .limit(MAX_INCOMING_PROSPECTS);
  if (requestsError) throw requestsError;
  if (requests.length === 0) return [];
  const requestIds = requests.map((r) => r.id as string);

  const { data: prospects, error: prospectsError } = await db
    .from("prospects")
    .select("id, request_id, donor_id, status, assigned_at")
    .in("request_id", requestIds)
    .in("status", ["accepted", "screening"])
    .not("assigned_at", "is", null)
    .limit(MAX_INCOMING_PROSPECTS);
  if (prospectsError) throw prospectsError;
  if (prospects.length === 0) return [];

  const donorIds = [...new Set(prospects.map((p) => p.donor_id as string))];

  const { data: donors, error: donorsError } = await db
    .from("donors")
    .select("id, blood_group")
    .in("id", donorIds)
    .limit(MAX_INCOMING_PROSPECTS);
  if (donorsError) throw donorsError;
  const bloodGroupByDonor = new Map(donors.map((d) => [d.id as string, d.blood_group as BloodGroup]));

  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", donorIds)
    .limit(MAX_INCOMING_PROSPECTS);
  if (profilesError) throw profilesError;
  const profileByDonor = new Map(profiles.map((p) => [p.id as string, p]));

  const rows: IncomingProspect[] = [];
  for (const prospect of prospects) {
    const status = prospect.status as ProspectStatus;
    const profile = profileByDonor.get(prospect.donor_id as string);
    const contact = revealDonorContact(
      "bank",
      status,
      {
        fullName: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
      },
      prospect.assigned_at as string | null,
    );
    if (!contact) continue;

    await writeAuditLog(actorId, "view_contact", "donor", prospect.donor_id as string, {
      requestId: prospect.request_id,
      prospectId: prospect.id,
    });

    rows.push({
      id: prospect.id as string,
      donorName: contact.name,
      donorPhone: contact.phone,
      bloodGroup: bloodGroupByDonor.get(prospect.donor_id as string) ?? BLOOD_GROUPS[0],
      requestRef: `REQ-${(prospect.request_id as string).slice(0, 4)}`,
      status: status as "accepted" | "screening",
    });
  }
  return rows;
}

type ScopedProspect = { id: string; requestId: string; donorId: string; status: ProspectStatus };

/**
 * Looks up a prospect and verifies it belongs to a request whose
 * destination bank is the caller's own bank - the same "bank id is never
 * a parameter, it's resolved from the session and the row is checked
 * against it" pattern Unit 12's `resolveBankShortage` established,
 * adapted for `prospects`, which (unlike `bank_shortages`) has no direct
 * `bank_id` column to filter on in one query - the ownership check has to
 * go through `requests.destination_bank_id` instead. Returns null for
 * "doesn't exist" and "exists but belongs to a different bank" alike,
 * same opaque-on-purpose shape as D3's `already_handled` (CLAUDE.md rule
 * 3's "never reveal more than the recipient is entitled to" spirit, even
 * though this isn't phone data - it still shouldn't confirm a prospect id
 * exists to a bank it doesn't belong to).
 */
async function getBankScopedProspect(
  db: DbClient,
  bankId: string,
  prospectId: string,
): Promise<ScopedProspect | null> {
  const { data: prospect, error: prospectError } = await db
    .from("prospects")
    .select("id, request_id, donor_id, status")
    .eq("id", prospectId)
    .maybeSingle();
  if (prospectError) throw prospectError;
  if (!prospect) return null;

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("destination_bank_id")
    .eq("id", prospect.request_id)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request || request.destination_bank_id !== bankId) return null;

  return {
    id: prospect.id as string,
    requestId: prospect.request_id as string,
    donorId: prospect.donor_id as string,
    status: prospect.status as ProspectStatus,
  };
}

export type ProspectActionResult = { ok: true } | { ok: false; reason: "not_found" | "conflict" };

/**
 * "Arrived" (PRD.md §8.1 B3) - `accepted` -> `screening`. The `.eq
 * ("status", "accepted")` guard (not just a pre-check) means a stale page
 * (the prospect already moved on in another tab/device) fails as
 * `conflict` rather than silently double-transitioning - same
 * re-check-don't-pre-check pattern as `acceptProspect` (Unit 24).
 */
export async function markProspectArrived(bankId: string, prospectId: string): Promise<ProspectActionResult> {
  const db = createDbClient();
  const scoped = await getBankScopedProspect(db, bankId, prospectId);
  if (!scoped) return { ok: false, reason: "not_found" };

  const { data: updated, error } = await db
    .from("prospects")
    .update({ status: "screening", screened_at: new Date().toISOString() })
    .eq("id", prospectId)
    .eq("status", "accepted")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) return { ok: false, reason: "conflict" };

  return { ok: true };
}

/**
 * "Rejected" / "No show" (PRD.md §8.1 B3) - `screening` -> `rejected`/
 * `no_show`. Neither writes anything on `donors` - CLAUDE.md's own
 * invariant ("a rejected prospect never penalises the donor; a no_show
 * does") is enforced by Unit 17's matching engine reading
 * `prospects.status` for ranking, not by anything this function does; it
 * only ever touches `prospects`/`requests`. Reuses
 * `syncRequestStageAfterProspectChange` (Unit 24) for the same "reopen to
 * finding_prospects if no other prospect is still live" derivation this
 * unit's own task text describes - not a second implementation of that
 * check.
 */
export async function setProspectScreeningOutcome(
  bankId: string,
  prospectId: string,
  outcome: "rejected" | "no_show",
): Promise<ProspectActionResult> {
  const db = createDbClient();
  const scoped = await getBankScopedProspect(db, bankId, prospectId);
  if (!scoped) return { ok: false, reason: "not_found" };

  const { data: updated, error } = await db
    .from("prospects")
    .update({ status: outcome, outcome_at: new Date().toISOString() })
    .eq("id", prospectId)
    .eq("status", "screening")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) return { ok: false, reason: "conflict" };

  await syncRequestStageAfterProspectChange(scoped.requestId);

  return { ok: true };
}

export type ConfirmDonationDetail = {
  donorName: string;
  claimedBloodGroup: BloodGroup;
};

/**
 * B4 · Confirm donation detail read (PRD.md §8.1) - scoped to the caller's
 * own bank and `screening` status only. A wrong bank, a nonexistent id,
 * and a prospect that isn't currently `screening` (already donated,
 * rejected, or never arrived) all collapse to the same `null` - same
 * opaque-on-purpose shape as `getBankScopedProspect` itself.
 */
export async function getConfirmDonationDetail(
  bankId: string,
  prospectId: string,
): Promise<ConfirmDonationDetail | null> {
  const db = createDbClient();
  const scoped = await getBankScopedProspect(db, bankId, prospectId);
  if (!scoped || scoped.status !== "screening") return null;

  const { data: donor, error: donorError } = await db
    .from("donors")
    .select("blood_group")
    .eq("id", scoped.donorId)
    .maybeSingle();
  if (donorError) throw donorError;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", scoped.donorId)
    .maybeSingle();
  if (profileError) throw profileError;

  return {
    donorName: profile?.full_name ?? "",
    claimedBloodGroup: (donor?.blood_group as BloodGroup) ?? BLOOD_GROUPS[0],
  };
}

export type ConfirmDonationResult =
  | { ok: true; donorName: string }
  | { ok: false; reason: "not_found" | "conflict" };

/**
 * B4 · Confirm donation (PRD.md §8.1, §8.2; CLAUDE.md rule 5) - the ONLY
 * code path in the entire codebase permitted to write
 * `donors.group_verified_at`/`last_donation_at`/`eligible_from` (this
 * unit's own scope note - confirmed by grepping the codebase for any
 * other writer before this unit shipped). Re-checks bank scoping and
 * `screening` status directly rather than trusting whatever the page's
 * initial `getConfirmDonationDetail` read returned - a real race (a
 * second bank-staff tab, or the donor having already been confirmed
 * moments earlier) between page load and submit, same "never trust a
 * pre-check alone" pattern as `acceptProspect`/`setProspectScreeningOutcome`
 * above.
 *
 * `eligible_from` is `last_donation_at` plus `app_settings`'
 * `donor.cooldown_months` (CLAUDE.md "Timing parameters" - never
 * hardcoded) - calendar-month addition (`setUTCMonth`), not a fixed
 * `* 30 days` approximation, since the setting is genuinely denominated in
 * months.
 *
 * Also moves the request straight to `resolved` (SPEC.md §3.1 event 11:
 * "Blood collected -> resolved", moved by "Bank / Admin") - a deliberate
 * bank action written directly here, not something
 * `syncRequestStageAfterProspectChange` computes: that function's own
 * scope (per its doc comment, Unit 24) is narrowly the
 * finding_prospects <-> evaluating_prospects transition and is a no-op for
 * every stage past that, `resolved` included.
 */
export async function confirmDonation(
  bankId: string,
  prospectId: string,
  confirmedBloodGroup: BloodGroup,
): Promise<ConfirmDonationResult> {
  if (!BLOOD_GROUPS.includes(confirmedBloodGroup)) {
    throw new Error("invalid blood group");
  }

  const db = createDbClient();
  const scoped = await getBankScopedProspect(db, bankId, prospectId);
  if (!scoped || scoped.status !== "screening") return { ok: false, reason: "not_found" };

  const { data: updatedProspect, error: prospectError } = await db
    .from("prospects")
    .update({ status: "donated", outcome_at: new Date().toISOString() })
    .eq("id", prospectId)
    .eq("status", "screening")
    .select("id")
    .maybeSingle();
  if (prospectError) throw prospectError;
  if (!updatedProspect) return { ok: false, reason: "conflict" };

  const cooldownMonths = await getAppSetting<number>("donor.cooldown_months");
  const now = new Date();
  const eligibleFrom = new Date(now);
  eligibleFrom.setUTCMonth(eligibleFrom.getUTCMonth() + cooldownMonths);

  const { error: donorError } = await db
    .from("donors")
    .update({
      blood_group: confirmedBloodGroup,
      group_verified_at: now.toISOString(),
      last_donation_at: now.toISOString(),
      eligible_from: eligibleFrom.toISOString(),
    })
    .eq("id", scoped.donorId);
  if (donorError) throw donorError;

  const { error: requestError } = await db
    .from("requests")
    .update({ stage: "resolved", resolved_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("id", scoped.requestId);
  if (requestError) throw requestError;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", scoped.donorId)
    .maybeSingle();
  if (profileError) throw profileError;

  return { ok: true, donorName: profile?.full_name ?? "" };
}
