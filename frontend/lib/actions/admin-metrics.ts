"use server";

import { getActingAdmin } from "@/lib/db/admin-portal";
import { getPlatformMetrics, type PlatformMetrics } from "@/lib/db/metrics";

/**
 * Metrics dashboard (PRD.md §14), real data (Unit 57). Same
 * "use server" action + getActingAdmin() re-check shape as
 * lib/actions/admin-reports.ts's loadAdminReports - admin/coordinator
 * alike, no narrower role check (Unit 56's own design: this isn't a
 * coordinator-only screen like A6). No parameters - Unit 55's
 * getPlatformMetrics computes over full history, no date-range
 * filtering exists to pass through (see this unit's own README entry
 * for why no date-range control was added instead).
 */
export async function loadPlatformMetrics(): Promise<PlatformMetrics> {
  await getActingAdmin();
  return getPlatformMetrics();
}
