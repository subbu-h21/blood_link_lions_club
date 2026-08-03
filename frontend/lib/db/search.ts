import { createDbClient } from "@/lib/db/client";
import { toBankCard } from "@/lib/serialise/bank";
import { toStockRow } from "@/lib/serialise/stock";
import type { SearchResult, BankWithStock } from "@/lib/serialise/search";

// Bounded per-region read (CLAUDE.md rule 4), not a whole-table fetch -
// scoped to one region_id already, this just caps it explicitly too.
const MAX_BANKS_PER_REGION = 100;
// 8 groups (bank_stock's own unique constraint) x MAX_BANKS_PER_REGION.
const MAX_STOCK_ROWS = MAX_BANKS_PER_REGION * 8;
// A region realistically borders a handful of others - generous cap.
const MAX_ADJACENT_REGIONS = 50;

/**
 * S2 · Results (PRD.md §6.1), real data (Unit 14). Scoped to exactly one
 * region - never all banks (rule 4) - and only banks that are both
 * `is_verified` (PRD.md §8.2: "is_verified = false accounts cannot post
 * stock publicly") and `is_active`. Every call logs a search_logs row,
 * including ones that find zero banks - PRD.md §6.2 "Every search
 * logged", regardless of outcome. Returns null only when regionId
 * itself doesn't resolve to a real region (e.g. a hand-edited URL) - not
 * logged, since there's nothing coherent to log against.
 */
export async function getSearchResults(
  regionId: string,
  bloodGroup: string | null,
  locationInput: string | null,
  freshnessThresholdHours: number,
): Promise<SearchResult | null> {
  const db = createDbClient();

  const { data: region, error: regionError } = await db
    .from("regions")
    .select("name")
    .eq("id", regionId)
    .maybeSingle();
  if (regionError) throw regionError;
  if (!region) return null;

  const { data: bankRows, error: banksError } = await db
    .from("blood_banks")
    .select("id, name, address, phone, opening_hours")
    .eq("region_id", regionId)
    .eq("is_verified", true)
    .eq("is_active", true)
    .limit(MAX_BANKS_PER_REGION);
  if (banksError) throw banksError;

  const bankIds = bankRows.map((row) => row.id);
  const stockByBank = new Map<string, { blood_group: string; component: string; units: number; updated_at: string }[]>();

  if (bankIds.length > 0) {
    const { data: stockRows, error: stockError } = await db
      .from("bank_stock")
      .select("bank_id, blood_group, component, units, updated_at")
      .in("bank_id", bankIds)
      .eq("component", "whole_blood")
      .limit(MAX_STOCK_ROWS);
    if (stockError) throw stockError;

    for (const row of stockRows) {
      const existing = stockByBank.get(row.bank_id) ?? [];
      existing.push(row);
      stockByBank.set(row.bank_id, existing);
    }
  }

  const banks: BankWithStock[] = bankRows.map((bankRow) => ({
    ...toBankCard(bankRow),
    stock: (stockByBank.get(bankRow.id) ?? []).map((row) => toStockRow(row, freshnessThresholdHours)),
  }));

  const { data: adjacency, error: adjacencyError } = await db
    .from("region_adjacency")
    .select("neighbour_region_id")
    .eq("region_id", regionId)
    .limit(MAX_ADJACENT_REGIONS);
  if (adjacencyError) throw adjacencyError;

  let adjacentRegions: { id: string; name: string }[] = [];
  if (adjacency.length > 0) {
    const { data: neighbourRegions, error: neighbourError } = await db
      .from("regions")
      .select("id, name")
      .in("id", adjacency.map((row) => row.neighbour_region_id))
      .limit(MAX_ADJACENT_REGIONS);
    if (neighbourError) throw neighbourError;
    adjacentRegions = neighbourRegions;
  }

  // Unit 55's "Tier 1 hit rate" signal: whether this exact search actually
  // found stock, computed from the same bank/stock read this function
  // already did above - not a second query. Null (not false) when no
  // blood_group was specified at all (e.g. a bare adjacent-region-chip
  // visit) - there's no specific need to have "found" an answer for.
  const stockFound: boolean | null =
    bloodGroup === null
      ? null
      : bankRows.some((bankRow) =>
          (stockByBank.get(bankRow.id) ?? []).some(
            (row) => row.blood_group === bloodGroup && row.units > 0,
          ),
        );

  const { error: logError } = await db.from("search_logs").insert({
    region_id: regionId,
    blood_group: bloodGroup,
    pincode_or_town_input: locationInput,
    searched_at: new Date().toISOString(),
    stock_found: stockFound,
  });
  if (logError) throw logError;

  return { region: { id: regionId, name: region.name }, banks, adjacentRegions };
}
