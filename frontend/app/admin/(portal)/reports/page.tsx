import { AdminModeration } from "@/components/admin/AdminModeration";
import { loadAdminReports } from "@/lib/actions/admin-reports";

// A5 · Moderation (PRD.md §9.1), real data (Unit 48). District-wide, not
// region-scoped (see lib/db/reports.ts's own doc comment) - every
// admin/coordinator loads the same unfiltered queue by default.
export default async function AdminReportsPage() {
  const reports = await loadAdminReports();
  return <AdminModeration initialReports={reports} />;
}
