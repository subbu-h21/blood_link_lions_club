import { createDbClient } from "@/lib/db/client";
import { toStockRow, type StockRow } from "@/lib/serialise/stock";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";

// Only component this platform supports (CLAUDE.md out-of-scope:
// platelets and plasma). Never accepted from a client - every write in
// this file hardcodes it, so a crafted request can't write a component
// value the UI has no way to show.
const COMPONENT = "whole_blood";

/**
 * B1 · Stock dashboard (PRD.md §8.1), scoped to one bank - always the
 * caller's own (lib/db/bank-portal.ts's getActingBankStaff), never
 * accepted as a parameter from outside lib/db. Auto-provisions any
 * blood group the bank has never saved a figure for for at 0 units
 * (ON CONFLICT DO NOTHING) so the grid always shows all 8 rows, even
 * for a bank that just started using the portal - not a "save" in the
 * CLAUDE.md rule-10 sense, so it relies on bank_stock.updated_at's own
 * `default now()` rather than setting it explicitly.
 */
export async function getBankStock(bankId: string, freshnessThresholdHours: number): Promise<StockRow[]> {
  const db = createDbClient();

  const { error: provisionError } = await db.from("bank_stock").upsert(
    BLOOD_GROUPS.map((bloodGroup) => ({
      bank_id: bankId,
      blood_group: bloodGroup,
      component: COMPONENT,
      units: 0,
    })),
    { onConflict: "bank_id,blood_group,component", ignoreDuplicates: true },
  );
  if (provisionError) throw provisionError;

  const { data, error } = await db
    .from("bank_stock")
    .select("blood_group, component, units, updated_at")
    .eq("bank_id", bankId)
    .eq("component", COMPONENT);
  if (error) throw error;

  return data
    .map((row) => toStockRow(row, freshnessThresholdHours))
    .sort((a, b) => BLOOD_GROUPS.indexOf(a.bloodGroup as BloodGroup) - BLOOD_GROUPS.indexOf(b.bloodGroup as BloodGroup));
}

/**
 * The only write path for bank_stock. `updated_at` is set explicitly on
 * every call - PRD.md §8.2's "no exceptions" rule - because Postgres's
 * `default now()` only applies on INSERT; upsert's UPDATE branch (the
 * common case, editing an already-provisioned row) would silently skip
 * it otherwise. bankId/updatedBy come from the caller (already resolved
 * from the session by lib/actions/bank-stock.ts), never from the row
 * data itself.
 */
export async function saveBankStockRow(
  bankId: string,
  updatedBy: string,
  row: { bloodGroup: BloodGroup; units: number },
  freshnessThresholdHours: number,
): Promise<StockRow> {
  if (!Number.isInteger(row.units) || row.units < 0) {
    throw new Error("units must be a non-negative integer");
  }

  const db = createDbClient();
  const { data, error } = await db
    .from("bank_stock")
    .upsert(
      {
        bank_id: bankId,
        blood_group: row.bloodGroup,
        component: COMPONENT,
        units: row.units,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      },
      { onConflict: "bank_id,blood_group,component" },
    )
    .select("blood_group, component, units, updated_at")
    .single();
  if (error) throw error;

  return toStockRow(data, freshnessThresholdHours);
}
