import { createDbClient } from "@/lib/db/client";

/**
 * Thrown by every portal's own `getActingX()` session resolver (Unit 48)
 * when `profiles.is_blocked = true` (Unit 46's A5 moderation screen is the
 * one writer of this flag, via `lib/db/reports.ts`'s `blockReportedUser`).
 * One shared check, not three copies - `getActingDonor`/`getActingBankStaff`/
 * `getActingAdmin` all call `assertNotBlocked` first, same "shared logic
 * gets exactly one implementation" rule already applied to
 * `syncRequestStageAfterProspectChange`/`standDownProspect`/
 * `revealDonorContact`. Deliberately a real per-request DB check, not a
 * JWT claim (unlike `profile_role`/`must_reset_password`) - this task's own
 * wording ("rejected on next request") wants a block to take effect
 * immediately, not bounded by a JWT's `jwt_expiry` staleness window the way
 * a claim-based flag would be.
 */
export class BlockedUserError extends Error {}

export async function assertNotBlocked(profileId: string): Promise<void> {
  const db = createDbClient();
  const { data, error } = await db
    .from("profiles")
    .select("is_blocked")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (data?.is_blocked) {
    throw new BlockedUserError("This account has been blocked");
  }
}

export type Profile = {
  id: string;
  phone: string;
  fullName: string | null;
  role: "searcher" | "donor" | "bank_staff" | "admin" | "coordinator";
  regionId: string | null;
  bankId: string | null;
  isBlocked: boolean;
};

function toProfile(row: {
  id: string;
  phone: string;
  full_name: string | null;
  role: Profile["role"];
  region_id: string | null;
  bank_id: string | null;
  is_blocked: boolean;
}): Profile {
  return {
    id: row.id,
    phone: row.phone,
    fullName: row.full_name,
    role: row.role,
    regionId: row.region_id,
    bankId: row.bank_id,
    isBlocked: row.is_blocked,
  };
}

/**
 * Creates a `searcher`-role profile on first phone verification (PRD.md
 * §4.2). Never overwrites an existing profile's role - a returning donor
 * logging in again must not be demoted back to searcher. `id` is the
 * Supabase Auth user id (profiles.id = auth user id).
 */
export async function ensureProfile({
  id,
  phone,
}: {
  id: string;
  phone: string;
}): Promise<Profile> {
  const db = createDbClient();

  const { data: existing, error: selectError } = await db
    .from("profiles")
    .select("id, phone, full_name, role, region_id, bank_id, is_blocked")
    .eq("id", id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return toProfile(existing);

  const { data: inserted, error: insertError } = await db
    .from("profiles")
    .insert({ id, phone, role: "searcher" })
    .select("id, phone, full_name, role, region_id, bank_id, is_blocked")
    .single();

  if (insertError) throw insertError;
  return toProfile(inserted);
}
