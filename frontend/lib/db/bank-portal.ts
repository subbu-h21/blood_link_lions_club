import { createClient } from "@/lib/supabase/server";
import { createDbClient } from "@/lib/db/client";
import { assertNotBlocked } from "@/lib/db/profiles";
import type { OpeningHours } from "@/lib/serialise/bank";

export type ActingBankStaff = {
  profileId: string;
  bankId: string;
};

/**
 * Thrown when the acting bank_staff's own bank has been suspended
 * (`is_active = false`) by an admin (Unit 43, A4). Distinct from the
 * generic "no verified session"/"no associated bank" errors so the
 * portal layout can show a specific message rather than a bare error
 * page. Deliberately keyed on `is_active` only, not `is_verified` -
 * PRD.md §8.2's own rule text ties `is_verified` to public search
 * visibility only ("accounts cannot post stock publicly"), not portal
 * access; a newly-onboarded, not-yet-verified bank must still be able to
 * use its own portal to set up stock/settings before an admin verifies
 * it, or verification would have no real data to review in the first
 * place.
 */
export class BankSuspendedError extends Error {}

/**
 * Resolves the acting bank_staff's own profile id and bank id from the
 * server-verified session - never from a client-supplied value (CLAUDE.md
 * rule 2). Every bank-portal read/write in lib/db/bank-stock.ts and
 * lib/db/bank-shortages.ts calls this first and scopes its query to the
 * returned bankId, so there is no code path where a crafted request can
 * name a different bank - the bank id an action operates on is never a
 * parameter, it's this lookup's result.
 *
 * Also the one place a suspended bank's own staff get rejected (Unit 43)
 * - every bank-portal action already calls this first, so extending it
 * here means the gate applies everywhere for free, not just the pages a
 * UI-level check would cover; a crafted request straight at a server
 * action is rejected the same as normal navigation.
 */
export async function getActingBankStaff(): Promise<ActingBankStaff> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    throw new Error("No verified session");
  }
  const { sub: profileId } = data.claims as { sub: string };
  await assertNotBlocked(profileId);

  const db = createDbClient();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("bank_id")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.bank_id) {
    throw new Error("Session has no associated bank");
  }

  const { data: bank, error: bankError } = await db
    .from("blood_banks")
    .select("is_active")
    .eq("id", profile.bank_id)
    .maybeSingle();
  if (bankError) throw bankError;
  if (!bank || !bank.is_active) {
    throw new BankSuspendedError("This bank account has been suspended");
  }

  return { profileId, bankId: profile.bank_id };
}

export type BankStaffContext = {
  bankId: string;
  bankName: string;
};

/** For the portal shell's header (Unit 10). */
export async function getBankStaffContext(): Promise<BankStaffContext | null> {
  const { bankId } = await getActingBankStaff();

  const db = createDbClient();
  const { data: bank, error } = await db
    .from("blood_banks")
    .select("name")
    .eq("id", bankId)
    .maybeSingle();
  if (error) throw error;
  if (!bank) return null;

  return { bankId, bankName: bank.name };
}

export type BankSettings = {
  address: string;
  phone: string;
  policyNotes: string;
  openingHours: OpeningHours;
};

/**
 * B5 · Profile (PRD.md §8.1) - address/phone/policy_notes/opening_hours
 * only. Deliberately excludes name, licence_no, region_id, pincode, and
 * is_verified - none of those are editable from this screen; is_verified
 * in particular is admin-only (A4, Unit 42), never bank-staff-writable.
 */
export async function getBankSettings(bankId: string): Promise<BankSettings> {
  const db = createDbClient();
  const { data, error } = await db
    .from("blood_banks")
    .select("address, phone, policy_notes, opening_hours")
    .eq("id", bankId)
    .single();
  if (error) throw error;

  return {
    address: data.address,
    phone: data.phone,
    policyNotes: data.policy_notes ?? "",
    openingHours: (data.opening_hours as OpeningHours | null) ?? {},
  };
}

export async function saveBankSettings(
  bankId: string,
  settings: { address: string; phone: string; policyNotes: string; openingHours: OpeningHours },
): Promise<void> {
  const db = createDbClient();
  const { error } = await db
    .from("blood_banks")
    .update({
      address: settings.address,
      phone: settings.phone,
      policy_notes: settings.policyNotes,
      opening_hours: settings.openingHours,
    })
    .eq("id", bankId);
  if (error) throw error;
}
