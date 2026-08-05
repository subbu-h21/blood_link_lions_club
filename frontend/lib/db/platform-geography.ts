import { createDbClient } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/audit-log";
import type { ActingPlatformManager } from "@/lib/db/platform-portal";

export type RegionOption = {
  id: string;
  name: string;
  district: string;
  state: string;
};

/**
 * All regions, for the platform-manager dashboard's region dropdowns and
 * region list. Same "small, bounded set" reasoning lib/db/pincodes.ts's
 * getAllPincodes already documents for its own MAX_REGIONS-equivalent cap
 * - a district's regions are dozens at most, not an unbounded/growing
 * table like requests or donors (CLAUDE.md rule 4 is about unbounded
 * lists, not this).
 */
const MAX_REGIONS = 200;

export async function listRegions(): Promise<RegionOption[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("regions")
    .select("id, name, district, state")
    .order("name")
    .limit(MAX_REGIONS);
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    district: row.district,
    state: row.state,
  }));
}

export type CreateRegionResult =
  | { ok: true; region: RegionOption }
  | { ok: false; error: string };

/**
 * Add-only for this build (no edit/deactivate yet, per the explicit scope
 * decision for this feature). name/district/state are all `not null` on
 * the table (Unit 02) - trimmed and validated non-empty here rather than
 * left to a raw not-null-violation error, so the form gets a real
 * message instead of a generic failure.
 *
 * Name uniqueness (2026-08-04, found live by the project owner - the form
 * had no check at all and let the same region name be submitted twice):
 * checked case-insensitively in JS against the same small, bounded read
 * `listRegions()` already relies on (regions are a handful of rows, not
 * an unbounded table - same reasoning as everywhere else in this file),
 * not an `.ilike()` query - this codebase already found once (Unit 15)
 * that hand-rolling ILIKE-safe escaping is a real bug surface, not worth
 * reintroducing for a table this small. The real enforcement is the new
 * `regions_name_unique_ci` migration index; this check exists only to
 * turn that constraint's raw 23505 into a message someone can act on.
 */
export async function createRegion(
  caller: ActingPlatformManager,
  input: { name: string; district: string; state: string },
): Promise<CreateRegionResult> {
  const name = input.name.trim();
  const district = input.district.trim();
  const state = input.state.trim();
  if (!name || !district || !state) {
    return { ok: false, error: "Name, district, and state are all required." };
  }

  const db = createDbClient();

  const existing = await listRegions();
  if (existing.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `A region named "${name}" already exists.` };
  }

  const { data, error } = await db
    .from("regions")
    .insert({ name, district, state })
    .select("id, name, district, state")
    .single();
  if (error) {
    // Defensive, not redundant: the JS check above has a real (if
    // narrow) race window between reading `existing` and this insert -
    // the migration's unique index is what actually can't be beaten,
    // caught here as the same friendly message rather than a raw 23505.
    if (error.code === "23505") {
      return { ok: false, error: `A region named "${name}" already exists.` };
    }
    throw error;
  }

  await writeAuditLog(caller.profileId, "create_region", "regions", data.id, { name, district, state });

  return { ok: true, region: { id: data.id, name: data.name, district: data.district, state: data.state } };
}
