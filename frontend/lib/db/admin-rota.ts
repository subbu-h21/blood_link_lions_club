import { createDbClient } from "@/lib/db/client";

// A region realistically has one coordinator handful at most - same
// generous-but-explicit cap reasoning used throughout this codebase.
const MAX_COORDINATORS = 50;

/**
 * admin_rota (PRD.md §4.6, Unit 33's schema). Extracted here rather than
 * left inline in Unit 39's `transferRequestToRegion` - Unit 44's
 * escalation engine needs the identical lookup for its own "notify
 * primary"/"notify secondary" triggers, and duplicating this query a
 * second time would violate this codebase's own "shared logic gets
 * exactly one implementation" rule. Returns `null` when no active row
 * exists for that region/priority - a real, currently-reachable state
 * (zero `admin_rota` rows exist anywhere as of this unit), not an error.
 */
export async function getRotaAdmin(regionId: string, priority: 1 | 2): Promise<string | null> {
  const db = createDbClient();
  const { data, error } = await db
    .from("admin_rota")
    .select("admin_id")
    .eq("region_id", regionId)
    .eq("priority", priority)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data?.admin_id as string | undefined) ?? null;
}

/**
 * The district coordinator "fallback" tier (SPEC.md §3 item 1) is
 * role-wide, not a rota row (Unit 33's own schema only has two per-region
 * priority levels) - every profile with `role = 'coordinator'` is
 * notified, not just one, since nothing orders multiple coordinators
 * relative to each other and there's no PRD guidance on picking "the"
 * one if more than one exists.
 */
export async function getDistrictCoordinatorIds(): Promise<string[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("profiles")
    .select("id")
    .eq("role", "coordinator")
    .limit(MAX_COORDINATORS);
  if (error) throw error;
  return data.map((p) => p.id as string);
}
