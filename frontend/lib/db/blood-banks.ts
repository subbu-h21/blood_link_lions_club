import { createDbClient } from "@/lib/db/client";

// Same per-region cap as lib/db/search.ts's MAX_BANKS_PER_REGION - a
// region realistically has a handful of banks, not hundreds.
const MAX_BANKS_PER_REGION = 100;

export type BankOption = { id: string; name: string };

/**
 * S4's destination-bank dropdown (PRD.md §6.1: "dropdown of region
 * banks"). Deliberately lean (id/name only, no stock/hours) - unlike
 * lib/db/search.ts's getSearchResults, this is populating a `<select>`,
 * not rendering bank cards. Same is_verified/is_active scoping as S2
 * (Unit 14) and B-side gating (Unit 12) - an unverified or inactive bank
 * cannot receive a request any more than it can post stock publicly.
 */
export async function getVerifiedBanksInRegion(regionId: string): Promise<BankOption[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("blood_banks")
    .select("id, name")
    .eq("region_id", regionId)
    .eq("is_verified", true)
    .eq("is_active", true)
    .limit(MAX_BANKS_PER_REGION);
  if (error) throw error;
  return data;
}
