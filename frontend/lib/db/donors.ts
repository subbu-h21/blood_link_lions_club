import { createDbClient } from "@/lib/db/client";
import { resolveLocation } from "@/lib/db/pincodes";
import { cancelPledge } from "@/lib/db/prospects";
import type { BloodGroup } from "@/lib/serialise/blood-group";

const MIN_AGE = 18;
const MAX_AGE = 65;

// Multi-pincode availability (2026-08-05, user-requested, user-confirmed
// cap): without a cap, one donor could list every pincode in the
// district and get matched to every single request everywhere -
// defeats the point of region-scoped matching and would concentrate
// notification load onto that one donor.
export const MAX_AVAILABILITY_PINCODES = 5;

// Bump when donorRegister.consentText's meaning changes materially
// (lib/i18n/en.ts / kn.ts) - SPEC.md §11.1 requires the version of the
// consent text shown to be recorded alongside the timestamp.
//
// Confirmed, not silently skipped (Unit 53, per that unit's own explicit
// "confirm consent_at/consent_version actually references the version of
// this text" instruction): Unit 53 added a fuller, publicly-reachable
// /privacy page (PRD.md §11.1) covering the same three required facts
// this checkbox text already states (server storage; name/blood group
// visible to admins/banks; phone shared only after acceptance), plus
// additional detail (searcher-side data, grievance contact) that this
// checkbox never claimed to cover in the first place. Since
// `donorRegister.consentText` itself is unchanged - the exact string a
// donor at `consent_version = "1"` actually agreed to still reads
// identically today - this version stays at "1", not bumped. A future
// change to `donorRegister.consentText`'s own wording (not the privacy
// page's) is what should bump this.
const CONSENT_VERSION = "1";

// Mirrors app/donor/register/page.tsx's client-side calculateAge exactly -
// a deliberately separate copy from that one specifically, not a shared
// import. That file is a client component and can't import from lib/db
// (CLAUDE.md Conventions: "Client components never import it"), and Unit
// 20's own scope note is explicit that server-side validation is a
// second, independent enforcement of the same range, never trust to the
// client alone.
//
// Exported (2026-08-06) for lib/db/admin-requests.ts's own age display on
// A1/A2 - that file is also server-only, so there's no client/server
// boundary reason to duplicate a third copy the way the donor-register
// page's is duplicated; two server-side files sharing one pure function
// is exactly this codebase's own "one implementation, not two that could
// drift" preference, same reasoning as `standDownProspect`/
// `syncRequestStageAfterProspectChange`.
export function calculateAge(dob: string): number | null {
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

export type RegisterDonorInput = {
  id: string;
  fullName: string;
  dob: string;
  bloodGroup: BloodGroup;
  pincode: string;
};

export type RegisterDonorResult =
  | { ok: true }
  | { ok: false; reason: "invalid_dob" | "invalid_pincode" };

/**
 * D1 wiring (PRD.md §7.1, §4.3). `id` is the caller's own server-verified
 * profile id (lib/actions/donor-registration.ts derives it from the
 * session, never from client input - CLAUDE.md rule 2).
 *
 * The `donors` upsert (not a plain insert) makes this idempotent for a
 * returning donor who lands back on /donor/register (e.g. via Unit 19's
 * SignOutButton, which redirects there) - `id` is the primary key, so a
 * second submission updates the same row instead of hitting a unique-
 * violation. Re-recording consent_at/consent_version on every submission
 * is correct, not a bug: the timestamp should reflect when THIS consent
 * text was shown and agreed to, not be preserved stale from a first visit.
 */
export async function registerDonor(input: RegisterDonorInput): Promise<RegisterDonorResult> {
  const age = calculateAge(input.dob);
  if (age === null || age < MIN_AGE || age > MAX_AGE) {
    return { ok: false, reason: "invalid_dob" };
  }

  const location = await resolveLocation(input.pincode);
  if (!location) {
    return { ok: false, reason: "invalid_pincode" };
  }

  const db = createDbClient();

  const { error: profileError } = await db
    .from("profiles")
    .update({ full_name: input.fullName, role: "donor" })
    .eq("id", input.id);
  if (profileError) throw profileError;

  const { error: donorError } = await db.from("donors").upsert(
    {
      id: input.id,
      blood_group: input.bloodGroup,
      dob: input.dob,
      pincode: input.pincode,
      region_id: location.regionId,
      consent_at: new Date().toISOString(),
      consent_version: CONSENT_VERSION,
    },
    { onConflict: "id" },
  );
  if (donorError) throw donorError;

  return { ok: true };
}

export type UpdateDonorProfileInput = {
  fullName: string;
  bloodGroup: BloodGroup;
  pincode: string;
};

export type UpdateDonorProfileResult = { ok: true } | { ok: false; reason: "invalid_pincode" };

/**
 * D6 · Settings edit (PRD.md §7.1: "Edit blood group, PIN code, name"),
 * real data (Unit 52). Mirrors `registerDonor`'s own PIN validation
 * exactly (`resolveLocation`, never trust a client-supplied region) - DOB
 * is deliberately not editable here, matching PRD's own D6 field list
 * (D1's age gate is a one-time registration check, not a mutable field).
 * SPEC.md §3.2 row 13 allows editing "at any time" with no stated
 * restriction relative to an active pledge, so none is added here.
 */
export async function updateDonorProfile(
  donorId: string,
  input: UpdateDonorProfileInput,
): Promise<UpdateDonorProfileResult> {
  const location = await resolveLocation(input.pincode);
  if (!location) return { ok: false, reason: "invalid_pincode" };

  const db = createDbClient();

  const { error: profileError } = await db
    .from("profiles")
    .update({ full_name: input.fullName })
    .eq("id", donorId);
  if (profileError) throw profileError;

  const { error: donorError } = await db
    .from("donors")
    .update({ blood_group: input.bloodGroup, pincode: input.pincode, region_id: location.regionId })
    .eq("id", donorId);
  if (donorError) throw donorError;

  return { ok: true };
}

export type AvailabilityPincode = { pincode: string; regionName: string };

/**
 * D6 · multi-pincode availability (2026-08-05, user-requested) - the
 * donor's own "also available in" list, additional to their home
 * pincode/region on `donors` itself (which stays exactly as-is and is
 * shown separately by getDonorSettingsState). Small, bounded set (capped
 * at MAX_AVAILABILITY_PINCODES) - same "no real CLAUDE.md rule-4 concern"
 * reasoning as every other per-owner bounded list read in this codebase.
 */
export async function listAvailabilityPincodes(donorId: string): Promise<AvailabilityPincode[]> {
  const db = createDbClient();
  const { data: links, error: linksError } = await db
    .from("donor_availability_pincodes")
    .select("pincode, region_id")
    .eq("donor_id", donorId)
    .order("created_at", { ascending: true })
    .limit(MAX_AVAILABILITY_PINCODES);
  if (linksError) throw linksError;
  if (links.length === 0) return [];

  // Separate lookup rather than an embedded PostgREST join - matches
  // this codebase's own established preference (e.g. audit-log.ts's
  // getAuditLogEntries fetching actor names as a second query, not a
  // joined select) over an unverified combined-query pattern.
  const regionIds = [...new Set(links.map((row) => row.region_id))];
  const { data: regions, error: regionsError } = await db
    .from("regions")
    .select("id, name")
    .in("id", regionIds)
    .limit(regionIds.length);
  if (regionsError) throw regionsError;
  const regionNameById = new Map(regions.map((r) => [r.id as string, r.name as string]));

  return links.map((row) => ({
    pincode: row.pincode as string,
    regionName: regionNameById.get(row.region_id as string) ?? "",
  }));
}

export type AddAvailabilityPincodeResult = { ok: true; regionName: string } | { ok: false; error: string };

/**
 * Validates the same way every other PIN-code field in this app does
 * (`resolveLocation`, never trust a client-supplied region), then two
 * app-level guards before the insert: rejects a pincode that resolves to
 * the donor's own current home region (redundant with the always-active
 * home pincode, confusing to show twice) and rejects once already at the
 * user-confirmed cap. The table's own primary key (donor_id, pincode) is
 * the real, authoritative duplicate guard - its 23505 is mapped to the
 * same friendly message the pre-check above would already have caught in
 * the common case, not a second, different one.
 */
export async function addAvailabilityPincode(
  donorId: string,
  pincode: string,
): Promise<AddAvailabilityPincodeResult> {
  const location = await resolveLocation(pincode);
  if (!location) {
    return { ok: false, error: "PIN code not found." };
  }

  const db = createDbClient();

  const { data: donor, error: donorError } = await db
    .from("donors")
    .select("pincode")
    .eq("id", donorId)
    .single();
  if (donorError) throw donorError;
  if (donor.pincode === pincode) {
    return { ok: false, error: "That's already your home PIN code." };
  }

  const { count, error: countError } = await db
    .from("donor_availability_pincodes")
    .select("pincode", { count: "exact", head: true })
    .eq("donor_id", donorId);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_AVAILABILITY_PINCODES) {
    return { ok: false, error: `You can list up to ${MAX_AVAILABILITY_PINCODES} PIN codes.` };
  }

  const { error: insertError } = await db.from("donor_availability_pincodes").insert({
    donor_id: donorId,
    pincode,
    region_id: location.regionId,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, error: "That PIN code is already on your list." };
    }
    throw insertError;
  }

  return { ok: true, regionName: location.regionName };
}

/**
 * Scoped to `donorId` in the query itself, not just checked beforehand -
 * a donor can only ever remove a row that is actually theirs, since
 * `donorId` is always the session-derived caller (lib/actions/
 * donor-settings.ts's getActingDonor()), never a parameter a caller
 * chooses.
 */
export async function removeAvailabilityPincode(donorId: string, pincode: string): Promise<void> {
  const db = createDbClient();
  const { error } = await db
    .from("donor_availability_pincodes")
    .delete()
    .eq("donor_id", donorId)
    .eq("pincode", pincode);
  if (error) throw error;
}

/**
 * D6 · Account deletion (PRD.md §7.1, §12 Epic 4: "Account deletion
 * removes the donor and stands down any pledge"; SPEC.md D10: "Donor
 * deletes account mid-pledge -> Prospect auto-stood_down, admin
 * notified"), real data (Unit 52).
 *
 * Reuses `cancelPledge` (Unit 26) verbatim for the stand-down half -
 * that function already does exactly what SPEC.md D10 asks for
 * (`standDownProspect` + `requests.prospect_cancelled_at` set
 * unconditionally, the same signal an admin already relies on to learn a
 * donor backed out) - not a second, deletion-specific stand-down path.
 * `{ ok: false, reason: "no_active_pledge" }` is a normal, silent no-op
 * here (most deletions have no active pledge to stand down), not an
 * error to surface.
 *
 * Ordering matters for safety, not just correctness, given this client
 * (`@supabase/supabase-js` over PostgREST) has no real multi-statement
 * transaction across separate `.from()` calls - the same known,
 * already-documented limitation as `createRequest` (Unit 22). Standing
 * down the pledge *before* marking the donor deleted means the only
 * possible partial-failure state (a crash between the two steps) leaves
 * a correctly-stood-down prospect and a donor who simply isn't deleted
 * yet - safe and retriable. The reverse order could leave a donor marked
 * deleted (and excluded from matching) while their own prospect still
 * looks live to the bank/admin, with no cancellation signal ever sent -
 * a real hazard this ordering avoids.
 *
 * `profiles.role` is reset to `searcher` - not left as `donor` - so this
 * is a real, working action, not a soft "hide from UI" flag (this unit's
 * own explicit scope note): without this, `getActingDonor()` would keep
 * succeeding for the deleted donor's own session (their `donors` row
 * still exists, just flagged), leaving every D2-D6 screen fully usable
 * as if nothing happened. Resetting the role means
 * `lib/supabase/proxy.ts`'s existing role gate handles the rest for
 * free - the next visit to any `/donor/*` route (except `/donor/register`
 * itself) redirects there, the same experience a never-registered
 * searcher gets, with no new error class needed. `donors.deleted_at`
 * itself remains the permanent, authoritative deletion record regardless
 * of this role change - Unit 17's matching engine and Unit 41's A3 donor
 * lookup both already filter on it directly, not on `profiles.role`.
 *
 * `profiles.full_name` is also nulled - a real anonymisation, not just the
 * `deleted_at` flag alone (found at Unit 54's M5 review gate, resolved
 * with the project owner: the generic security-review checklist's
 * "account deletion removes personal data; donation history is
 * anonymised, not deleted" is broader than PRD.md §12 Epic 4's own
 * literal text, and the project owner confirmed the broader reading
 * should win here). This is a genuine anonymisation, not a hard delete -
 * `donors`/`prospects` rows themselves are untouched (Unit 55's future
 * metrics need the aggregate history), but any historical view joining
 * back to this profile (a bank's B3 list, an admin's A2 timeline) now
 * shows no name for this donor, only ever their already-anonymous
 * `donor_id`.
 *
 * `profiles.phone` is deliberately NOT nulled here, unlike `full_name` -
 * confirmed safe to leave as a narrower, more conservative scope after
 * checking, not assumed: nothing in this codebase ever looks up a
 * profile *by* phone (grepped every `lib/db/*.ts` - every lookup is by
 * `id`, resolved from the session), so scrubbing it isn't needed to
 * prevent any *lookup* leak, and every real phone-reveal gate
 * (`revealDonorContact`) already keys off live `prospects.status`, not
 * this column - a deleted donor's own prospect is always `stood_down` (or
 * some other terminal status) by the time this function returns, so no
 * reveal path can ever return their phone again regardless of what this
 * column holds. Nulling it would also introduce a real, if narrow, type
 * inconsistency (`lib/db/profiles.ts`'s `Profile.phone` type is
 * `string`, not `string | null`) for a donor who deletes their account
 * and later returns as a plain searcher via the same phone number -
 * `ensureProfile` never *updates* an existing row, so a nulled phone
 * would stay null forever even after a real, successful future OTP
 * verification. Scrubbing the name captures the actual "personal data"
 * concern (identity, not the number's mere presence in a column already
 * proven unreachable through every real code path) without that
 * regression risk.
 */
export async function deleteDonorAccount(donorId: string): Promise<void> {
  await cancelPledge(donorId);

  const db = createDbClient();

  // Multi-pincode availability (2026-08-05): matching already excludes
  // this donor via the `donors.deleted_at is null` filter below
  // regardless of these rows' presence, so this isn't required for
  // correctness - removed anyway for the same data-minimisation reason
  // this function already nulls `full_name`.
  const { error: availabilityError } = await db
    .from("donor_availability_pincodes")
    .delete()
    .eq("donor_id", donorId);
  if (availabilityError) throw availabilityError;

  const { error: donorError } = await db
    .from("donors")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", donorId);
  if (donorError) throw donorError;

  const { error: profileError } = await db
    .from("profiles")
    .update({ role: "searcher", full_name: null })
    .eq("id", donorId);
  if (profileError) throw profileError;
}

/**
 * Scheduled job (1) of 3 (Unit 31, PRD.md §7.3) - monthly reset of
 * `notif_count_month`/`notif_month`. Not strictly required for matching
 * correctness - `lib/matching/eligibility.ts`'s `isDonorEligible` already
 * treats a stale `notif_month` as "count doesn't apply" (Unit 17), and
 * `incrementNotifCounts` (`lib/db/requests.ts`, Unit 22) already lazily
 * resets on the next write - but a physical reset keeps the stored value
 * honest for any future direct reader that doesn't replicate that same
 * staleness check (an admin donor-lookup screen, a metrics query). Only
 * touches rows whose stored month doesn't already match the current one -
 * a donor notified earlier *this* month already has the correct value and
 * must not be zeroed back out mid-month.
 */
export async function resetStaleNotifCounts(): Promise<number> {
  const db = createDbClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);

  const { error, count } = await db
    .from("donors")
    .update({ notif_count_month: 0, notif_month: monthStartIso }, { count: "exact" })
    .or(`notif_month.is.null,notif_month.neq.${monthStartIso}`);
  if (error) throw error;

  return count ?? 0;
}
