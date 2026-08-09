import { createClient } from "@/lib/supabase/server";
import { createDbClient } from "@/lib/db/client";
import { assertNotBlocked } from "@/lib/db/profiles";
import { listAvailabilityPincodes, MAX_AVAILABILITY_PINCODES, type AvailabilityPincode } from "@/lib/db/donors";
import type { BloodGroup } from "@/lib/serialise/blood-group";

/**
 * Real bug fix (2026-08-05, found live by the project owner): D1
 * registration (app/donor/register/page.tsx) always showed the full
 * "complete your profile" form after OTP, with no check for whether that
 * phone already belongs to a registered donor - every returning donor
 * saw an empty registration form again, indistinguishable from "making
 * me create a new profile" even though nothing was actually being
 * duplicated at the DB level (profiles.phone is unique).
 *
 * `profiles.role === 'donor'` is the same signal lib/supabase/proxy.ts's
 * own role gate already trusts as "this session is a real, active
 * donor" - correctly `false` again after lib/db/donors.ts's
 * deleteDonorAccount resets the role, so a donor who deleted their
 * account and is now re-registering correctly goes through the form
 * again, not silently skipped past it.
 */
export async function isReturningDonor(profileId: string): Promise<boolean> {
  const db = createDbClient();
  const { data, error } = await db.from("profiles").select("role").eq("id", profileId).maybeSingle();
  if (error) throw error;
  return data?.role === "donor";
}

/**
 * Resolves the acting donor's own profile id from the server-verified
 * session - never from a client-supplied value (CLAUDE.md rule 2). Same
 * pattern as lib/db/bank-portal.ts's getActingBankStaff. donors.id =
 * profiles.id (Unit 02's 1:1 pattern), so the profile id IS the donor id
 * - no separate lookup needed, just a confirmation the donors row really
 * exists (it always should for a role='donor' session, since Unit 20's
 * registerDonor creates both atomically, but this is checked rather than
 * assumed).
 */
export async function getActingDonor(): Promise<{ donorId: string; fullName: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    throw new Error("No verified session");
  }
  const { sub: donorId } = data.claims as { sub: string };
  await assertNotBlocked(donorId);

  const db = createDbClient();
  // fullName added 2026-08-09 for the portal header (app/donor/(portal)/
  // layout.tsx) - every one of this function's other 15+ call sites only
  // ever destructures { donorId } (confirmed by grep before adding this),
  // so this is purely additive, nothing else changes shape.
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", donorId)
    .maybeSingle();
  if (profileError) throw profileError;

  const { data: donor, error: donorError } = await db
    .from("donors")
    .select("id")
    .eq("id", donorId)
    .maybeSingle();
  if (donorError) throw donorError;
  if (!donor) throw new Error("Session has no associated donor record");

  return { donorId, fullName: profile?.full_name ?? "" };
}

export type ActivePledge = {
  requestId: string;
  bloodGroup: string;
  destinationBank: string;
};

export type DonorHomeState = {
  isAvailable: boolean;
  pausedUntil: string | null;
  eligibleFrom: string | null;
  activePledge: ActivePledge | null;
};

/**
 * D2 · Home (PRD.md §7.1), real data (Unit 24). `activePledge` mirrors
 * the one_active_pledge_per_donor partial index's own definition
 * (accepted/screening) - there can be at most one, by construction.
 * Manual multi-step queries + row-mapping, not PostgREST relation
 * embedding - matches every other lib/db/*.ts file's established style
 * in this codebase (no generated DB types; Unit 10's own note on
 * getBankStaffContext already settled this, not worth a second pattern).
 */
export async function getDonorHomeState(donorId: string): Promise<DonorHomeState> {
  const db = createDbClient();

  const { data: donor, error: donorError } = await db
    .from("donors")
    .select("is_available, paused_until, eligible_from")
    .eq("id", donorId)
    .single();
  if (donorError) throw donorError;

  const { data: pledge, error: pledgeError } = await db
    .from("prospects")
    .select("request_id")
    .eq("donor_id", donorId)
    .in("status", ["accepted", "screening"])
    .maybeSingle();
  if (pledgeError) throw pledgeError;

  let activePledge: ActivePledge | null = null;
  if (pledge) {
    const { data: request, error: requestError } = await db
      .from("requests")
      .select("blood_group, destination_bank_id")
      .eq("id", pledge.request_id)
      .single();
    if (requestError) throw requestError;

    const { data: bank, error: bankError } = await db
      .from("blood_banks")
      .select("name")
      .eq("id", request.destination_bank_id)
      .maybeSingle();
    if (bankError) throw bankError;

    activePledge = {
      requestId: pledge.request_id,
      bloodGroup: request.blood_group,
      destinationBank: bank?.name ?? "",
    };
  }

  return {
    isAvailable: donor.is_available,
    pausedUntil: donor.paused_until,
    eligibleFrom: donor.eligible_from,
    activePledge,
  };
}

/**
 * D5 · History (PRD.md §7.1), real data (Unit 26). Same `eligible_from`
 * field D2's getDonorHomeState already reads - a small, dedicated
 * function rather than reusing that one here, since D5 doesn't need the
 * active-pledge lookup that comes bundled with it.
 */
export async function getDonorEligibleFrom(donorId: string): Promise<string | null> {
  const db = createDbClient();
  const { data: donor, error } = await db.from("donors").select("eligible_from").eq("id", donorId).single();
  if (error) throw error;
  return donor.eligible_from;
}

export type DonorSettingsState = {
  fullName: string;
  bloodGroup: BloodGroup;
  pincode: string;
  isAvailable: boolean;
  pausedUntil: string | null;
  hasActivePledge: boolean;
  availabilityPincodes: AvailabilityPincode[];
  availabilityPincodeMax: number;
};

/**
 * D6 · Settings (PRD.md §7.1), real data (Unit 52). Reuses
 * `getDonorHomeState` for the availability/pause/active-pledge fields
 * rather than re-deriving "has an active pledge" a second way - D2 and D6
 * show the identical underlying `is_available`/`paused_until` state (Unit
 * 51's own README note: "the same underlying mechanism, reachable from
 * Settings too, not a second concept").
 */
export async function getDonorSettingsState(donorId: string): Promise<DonorSettingsState> {
  const db = createDbClient();

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", donorId)
    .single();
  if (profileError) throw profileError;

  const { data: donor, error: donorError } = await db
    .from("donors")
    .select("blood_group, pincode")
    .eq("id", donorId)
    .single();
  if (donorError) throw donorError;

  const homeState = await getDonorHomeState(donorId);
  const availabilityPincodes = await listAvailabilityPincodes(donorId);

  return {
    fullName: profile.full_name ?? "",
    bloodGroup: donor.blood_group as BloodGroup,
    pincode: (donor.pincode as string | null) ?? "",
    isAvailable: homeState.isAvailable,
    pausedUntil: homeState.pausedUntil,
    hasActivePledge: homeState.activePledge !== null,
    availabilityPincodes,
    availabilityPincodeMax: MAX_AVAILABILITY_PINCODES,
  };
}

export async function setAvailability(donorId: string, isAvailable: boolean): Promise<void> {
  const db = createDbClient();
  const { error } = await db.from("donors").update({ is_available: isAvailable }).eq("id", donorId);
  if (error) throw error;
}

export async function pauseAvailability(donorId: string, days: number): Promise<void> {
  const db = createDbClient();
  const pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await db.from("donors").update({ paused_until: pausedUntil }).eq("id", donorId);
  if (error) throw error;
}

export async function resumeAvailability(donorId: string): Promise<void> {
  const db = createDbClient();
  const { error } = await db.from("donors").update({ paused_until: null }).eq("id", donorId);
  if (error) throw error;
}
