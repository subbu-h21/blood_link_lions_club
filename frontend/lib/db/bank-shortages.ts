import { createDbClient } from "@/lib/db/client";
import { toShortage, type Shortage } from "@/lib/serialise/shortage";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";

// Scoped to one bank's active shortages only, realistically a handful at
// once - still capped explicitly (CLAUDE.md rule 4) rather than leaving
// it open-ended, since nothing stops a bank posting many without
// resolving them.
const MAX_ACTIVE_SHORTAGES = 50;

/** B2 · Post shortage (PRD.md §8.1), active list only - all this screen shows. */
export async function getActiveBankShortages(bankId: string): Promise<Shortage[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("bank_shortages")
    .select("id, blood_group, units_needed, is_active, created_at")
    .eq("bank_id", bankId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(MAX_ACTIVE_SHORTAGES);
  if (error) throw error;

  return data.map(toShortage);
}

export async function insertBankShortage(
  bankId: string,
  row: { bloodGroup: BloodGroup; unitsNeeded: number },
): Promise<Shortage> {
  if (!BLOOD_GROUPS.includes(row.bloodGroup)) {
    throw new Error("invalid blood group");
  }
  if (!Number.isInteger(row.unitsNeeded) || row.unitsNeeded <= 0) {
    throw new Error("unitsNeeded must be a positive integer");
  }

  const db = createDbClient();
  const { data, error } = await db
    .from("bank_shortages")
    .insert({
      bank_id: bankId,
      blood_group: row.bloodGroup,
      units_needed: row.unitsNeeded,
      is_active: true,
    })
    .select("id, blood_group, units_needed, is_active, created_at")
    .single();
  if (error) throw error;

  return toShortage(data);
}

/**
 * Scoped to `bankId` in the WHERE clause, not just looked up by
 * `shortageId` - the defence against a crafted request naming a
 * shortage that belongs to a different bank (PRD.md §8.2 "bank staff
 * see assigned prospects only" is the prospects version of this same
 * rule; shortages need the identical scoping). A mismatched id/bank
 * pair matches zero rows and is a silent no-op, not an error - same
 * shape of response either way, so it reveals nothing about whether the
 * id exists at all.
 */
export async function resolveBankShortage(bankId: string, shortageId: string): Promise<void> {
  const db = createDbClient();
  const { error } = await db
    .from("bank_shortages")
    .update({ is_active: false, resolved_at: new Date().toISOString() })
    .eq("id", shortageId)
    .eq("bank_id", bankId);
  if (error) throw error;
}
