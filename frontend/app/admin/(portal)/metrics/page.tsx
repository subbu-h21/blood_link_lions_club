import { AdminMetricsDashboard } from "@/components/admin/AdminMetricsDashboard";
import { loadPlatformMetrics } from "@/lib/actions/admin-metrics";

// Metrics dashboard (PRD.md §14), real data (Unit 57).
export default async function AdminMetricsPage() {
  const metrics = await loadPlatformMetrics();
  return <AdminMetricsDashboard metrics={metrics} />;
}
