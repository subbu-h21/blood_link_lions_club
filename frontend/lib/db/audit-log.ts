import { createDbClient } from "@/lib/db/client";
import type { ActingAdmin } from "@/lib/db/admin-portal";

/**
 * audit_log (PRD.md §4.6, §9.3: "Contact views audited... no exceptions";
 * "Transfer moves ownership... logged"). One shared writer, reused by
 * every unit that needs to log an action (Unit 39 - first real caller;
 * Unit 41's own text explicitly says to reuse "the same function calls",
 * not a second insert path). `actorId`/`entityId` are always known by
 * every real call site in this codebase (grepped across prompts/*.md
 * before Unit 33 made them not null) - never optional here.
 */
export async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const db = createDbClient();
  const { error } = await db.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? null,
  });
  if (error) throw error;
}

export type AuditLogRow = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export type AuditLogPage = { rows: AuditLogRow[]; hasMore: boolean };

// Real pagination (CLAUDE.md rule 4), not a generous cap - matches
// AdminDonorLookup's own established real-pagination precedent (Unit 41),
// not A1/A4/A5's own lower-traffic "cap = pagination" lists; an audit log
// grows unboundedly by definition.
const AUDIT_LOG_PAGE_SIZE = 20;

/**
 * A6 · Audit log (PRD.md §9.1, "coordinator role only"), real data
 * (Unit 50). The role check here is defensive, not redundant with
 * lib/supabase/proxy.ts's own /admin/audit-specific gate - same "route
 * gate covers normal navigation, this covers any direct call" pattern
 * already established for getActingAdmin's own role re-check (Units
 * 26/30/36). `action`/`entityType` are read as plain strings, not a
 * closed enum - Unit 33's own migration deliberately left `action`
 * unconstrained (an open-ended example list, not exhaustive), so a future
 * action value this screen doesn't yet have a translated label for still
 * displays correctly (the component itself falls back to the raw string).
 */
export async function getAuditLogEntries(
  caller: ActingAdmin,
  page: number,
  actionFilter?: string,
): Promise<AuditLogPage> {
  if (caller.role !== "coordinator") {
    throw new Error("Audit log is coordinator-only");
  }

  const db = createDbClient();
  let query = db
    .from("audit_log")
    .select("id, actor_id, action, entity_type, entity_id, created_at", { count: "exact" });
  if (actionFilter) query = query.eq("action", actionFilter);

  const offset = Math.max(0, page) * AUDIT_LOG_PAGE_SIZE;
  const { data: entries, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + AUDIT_LOG_PAGE_SIZE - 1);
  if (error) throw error;
  if (entries.length === 0) return { rows: [], hasMore: false };

  const actorIds = [...new Set(entries.map((e) => e.actor_id as string))];
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", actorIds)
    .limit(actorIds.length);
  if (profilesError) throw profilesError;
  const nameById = new Map(profiles.map((p) => [p.id as string, p.full_name as string | null]));

  const rows: AuditLogRow[] = entries.map((e) => ({
    id: e.id as string,
    actorName: nameById.get(e.actor_id as string) ?? "",
    action: e.action as string,
    entityType: e.entity_type as string,
    entityId: e.entity_id as string,
    createdAt: e.created_at as string,
  }));

  return { rows, hasMore: (count ?? 0) > offset + AUDIT_LOG_PAGE_SIZE };
}
