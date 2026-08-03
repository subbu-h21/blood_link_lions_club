import { AdminAuditLog } from "@/components/admin/AdminAuditLog";
import { loadAuditLogEntries } from "@/lib/actions/admin-audit";

// A6 · Audit log (PRD.md §9.1, "coordinator role only"), real data
// (Unit 50). Real server-side gating lives in lib/supabase/proxy.ts (this
// unit's own /admin/audit-specific gate) - an admin session never even
// reaches this Server Component render. lib/db/audit-log.ts's own
// getAuditLogEntries re-checks the role defensively too.
export default async function AdminAuditPage() {
  const { rows, hasMore } = await loadAuditLogEntries(0);
  return <AdminAuditLog initialRows={rows} initialHasMore={hasMore} />;
}
