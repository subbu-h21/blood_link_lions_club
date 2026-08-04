import { createDbClient } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/audit-log";
import { generateTempPassword } from "@/lib/auth/temp-password";
import type { ActingAdmin } from "@/lib/db/admin-portal";

type DbClient = ReturnType<typeof createDbClient>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A4 · Bank management (PRD.md §9.1), real data (Unit 43). Region-scoped
 * the same way A1/A3 are (Units 37/41) - a coordinator (no home region)
 * gets an empty result, not district-wide bank management: this is a
 * browse/manage-list screen like A1/A3, not an act-on-a-specific-
 * escalated-item screen like A2, so it doesn't inherit A2's district-wide
 * exception (same reasoning already applied twice, not re-derived from
 * scratch each time).
 */
export type AdminBankRow = {
  id: string;
  name: string;
  address: string;
  phone: string;
  isVerified: boolean;
  isActive: boolean;
  policyNotes: string;
  licenceNo: string | null;
  pincode: string | null;
};

// A region realistically has a handful of banks - same generous-but-
// explicit cap reasoning as search.ts's MAX_BANKS_PER_REGION.
const MAX_BANKS_PER_REGION = 100;

export async function getAdminBanks(caller: ActingAdmin): Promise<AdminBankRow[]> {
  if (!caller.regionId) return [];
  const db = createDbClient();
  const { data, error } = await db
    .from("blood_banks")
    .select("id, name, address, phone, is_verified, is_active, policy_notes, licence_no, pincode")
    .eq("region_id", caller.regionId)
    .order("name", { ascending: true })
    .limit(MAX_BANKS_PER_REGION);
  if (error) throw error;
  return data.map((b) => ({
    id: b.id as string,
    name: b.name as string,
    address: b.address as string,
    phone: b.phone as string,
    isVerified: b.is_verified as boolean,
    isActive: b.is_active as boolean,
    policyNotes: (b.policy_notes as string | null) ?? "",
    licenceNo: b.licence_no as string | null,
    pincode: b.pincode as string | null,
  }));
}

/**
 * Same "id is never a parameter, it's checked against the caller's own
 * scope" pattern as every other admin-portal action in this codebase
 * (`getScopedRequestRow` in admin-requests.ts, `getBankScopedProspect` in
 * bank-prospects.ts) - a bank id from a different region is never
 * distinguishable from a nonexistent one.
 */
async function getScopedBank(
  db: DbClient,
  caller: ActingAdmin,
  bankId: string,
): Promise<{ id: string; region_id: string } | null> {
  if (!caller.regionId) return null;
  const { data, error } = await db
    .from("blood_banks")
    .select("id, region_id")
    .eq("id", bankId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.region_id !== caller.regionId) return null;
  return data;
}

export type AdminBankActionResult = { ok: true } | { ok: false; reason: "not_found" };

/**
 * "Verify"/"Revoke verification" (PRD.md §9.1 A4, §8.2: "`is_verified =
 * false` accounts cannot post stock publicly"). Deliberately does NOT
 * touch bank-portal access - `lib/db/bank-portal.ts`'s own
 * `getActingBankStaff` keys the portal-access gate on `is_active` only,
 * not `is_verified`, per that same PRD rule's precise wording (public
 * posting only, not portal access) - a newly-onboarded bank must still be
 * able to use its own portal to set up stock/settings before an admin
 * verifies it.
 */
export async function setBankVerified(
  caller: ActingAdmin,
  bankId: string,
  isVerified: boolean,
): Promise<AdminBankActionResult> {
  const db = createDbClient();
  const scoped = await getScopedBank(db, caller, bankId);
  if (!scoped) return { ok: false, reason: "not_found" };
  const { error } = await db.from("blood_banks").update({ is_verified: isVerified }).eq("id", bankId);
  if (error) throw error;
  return { ok: true };
}

/**
 * "Suspend"/"Reactivate" (PRD.md §9.1 A4). `is_active = false` is the one
 * flag that blocks bank-portal access too (`getActingBankStaff`, Unit
 * 43) - confirmed directly against both Unit 14's public search (already
 * filters on `is_active`, Unit 14's own code) and Unit 12's bank-portal
 * access (this unit's own new gate), not assumed that fixing one
 * automatically covers the other.
 */
export async function setBankActive(
  caller: ActingAdmin,
  bankId: string,
  isActive: boolean,
): Promise<AdminBankActionResult> {
  const db = createDbClient();
  const scoped = await getScopedBank(db, caller, bankId);
  if (!scoped) return { ok: false, reason: "not_found" };
  const { error } = await db.from("blood_banks").update({ is_active: isActive }).eq("id", bankId);
  if (error) throw error;
  return { ok: true };
}

/**
 * Policy notes (PRD.md §9.1 A4) - the same field B5 (Unit 12's
 * `saveBankSettings`) also writes; both are legitimate writers of the
 * same column (a bank editing its own notes, an admin editing on its
 * behalf), not a conflict - there is no "owner" of this one field the way
 * `owner_admin_id` has one owner for a request.
 */
export async function saveBankPolicyNotes(
  caller: ActingAdmin,
  bankId: string,
  policyNotes: string,
): Promise<AdminBankActionResult> {
  const db = createDbClient();
  const scoped = await getScopedBank(db, caller, bankId);
  if (!scoped) return { ok: false, reason: "not_found" };
  const { error } = await db.from("blood_banks").update({ policy_notes: policyNotes }).eq("id", bankId);
  if (error) throw error;
  return { ok: true };
}

export type BankDetailsInput = {
  name: string;
  address: string;
  phone: string;
  licenceNo?: string;
  pincode?: string;
};

function validateBankDetails(input: BankDetailsInput): string | null {
  if (!input.name.trim() || !input.address.trim() || !input.phone.trim()) {
    return "Name, address, and phone are all required.";
  }
  return null;
}

export type CreateBankResult =
  | { ok: true; bankId: string; staffEmail: string; tempPassword: string }
  | { ok: false; error: string };

/**
 * Creates a real blood_banks row AND its staff login together
 * (auth.admin.createUser + a bank_staff profile), same "the two are
 * meant to succeed together, not two independent writes" reasoning as
 * lib/db/platform-admins.ts's createAdminAccount - user-confirmed
 * decision (2026-08-04): without a login, a newly added bank could never
 * post its own stock or use B1-B5 at all. Region is always the acting
 * admin's own (caller.regionId) - never a parameter, matching every
 * other admin-portal write in this file (getScopedBank never trusts a
 * client-supplied region either).
 *
 * A district-wide coordinator (caller.regionId === null) never reaches
 * this function in practice - app/admin/(portal)/banks/page.tsx already
 * shows the "no home region" message and never renders
 * AdminBankManagement at all in that case - but this function still
 * checks defensively rather than assuming the page-level guard is the
 * only caller, same "route gate covers navigation, every direct call
 * re-checks" pattern as getActingAdmin/getActingPlatformManager.
 */
export async function createBank(
  caller: ActingAdmin,
  input: BankDetailsInput & { staffEmail: string; staffFullName: string },
): Promise<CreateBankResult> {
  if (!caller.regionId) {
    return { ok: false, error: "No home region to add a bank to." };
  }
  const detailsError = validateBankDetails(input);
  if (detailsError) return { ok: false, error: detailsError };

  const staffEmail = input.staffEmail.trim().toLowerCase();
  const staffFullName = input.staffFullName.trim();
  if (!EMAIL_PATTERN.test(staffEmail)) {
    return { ok: false, error: "Enter a valid staff email address." };
  }
  if (!staffFullName) {
    return { ok: false, error: "Staff full name is required." };
  }

  const db = createDbClient();

  const { data: bank, error: bankError } = await db
    .from("blood_banks")
    .insert({
      region_id: caller.regionId,
      name: input.name.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      licence_no: input.licenceNo?.trim() || null,
      pincode: input.pincode?.trim() || null,
    })
    .select("id")
    .single();
  if (bankError) {
    if (bankError.code === "23503") {
      return { ok: false, error: "PIN code does not exist." };
    }
    throw bankError;
  }

  const tempPassword = generateTempPassword();
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: staffEmail,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError) {
    // The bank and its staff login are meant to succeed together - roll
    // the bank back rather than leave an unowned, unusable listing.
    await db.from("blood_banks").delete().eq("id", bank.id);
    if (createError.message.toLowerCase().includes("already been registered")) {
      return { ok: false, error: `${staffEmail} is already registered.` };
    }
    throw createError;
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: created.user.id,
    phone: null,
    full_name: staffFullName,
    role: "bank_staff",
    bank_id: bank.id,
    must_reset_password: true,
  });
  if (profileError) {
    await db.auth.admin.deleteUser(created.user.id).catch(() => {});
    await db.from("blood_banks").delete().eq("id", bank.id);
    throw profileError;
  }

  await writeAuditLog(caller.profileId, "create_bank", "blood_banks", bank.id, {
    name: input.name.trim(),
    staffEmail,
    regionId: caller.regionId,
  });

  return { ok: true, bankId: bank.id, staffEmail, tempPassword };
}

export type UpdateBankDetailsResult = { ok: true } | { ok: false; error: string };

/**
 * Region stays out of this input entirely (BankDetailsInput has no
 * region field) - a deliberate, user-confirmed scope limit (2026-08-04):
 * changing a bank's region would move it out of its creating admin's own
 * scope into another's, which this build doesn't support. No audit_log
 * write here, matching this screen's own already-reviewed asymmetry
 * (setBankVerified/setBankActive/saveBankPolicyNotes above don't log
 * either - bank metadata isn't donor contact data, per CLAUDE.md's
 * literal audit-requirement scope).
 */
export async function updateBankDetails(
  caller: ActingAdmin,
  bankId: string,
  input: BankDetailsInput,
): Promise<UpdateBankDetailsResult> {
  const detailsError = validateBankDetails(input);
  if (detailsError) return { ok: false, error: detailsError };

  const db = createDbClient();
  const scoped = await getScopedBank(db, caller, bankId);
  if (!scoped) return { ok: false, error: "Bank not found." };

  const { error } = await db
    .from("blood_banks")
    .update({
      name: input.name.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      licence_no: input.licenceNo?.trim() || null,
      pincode: input.pincode?.trim() || null,
    })
    .eq("id", bankId);
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "PIN code does not exist." };
    }
    throw error;
  }

  return { ok: true };
}
