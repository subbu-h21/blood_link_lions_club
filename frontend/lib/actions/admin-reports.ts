"use server";

import { getActingAdmin } from "@/lib/db/admin-portal";
import {
  getReportsForModeration,
  blockReportedUser,
  type AdminReportRow,
  type BlockReportedUserResult,
} from "@/lib/db/reports";

export async function loadAdminReports(statusFilter?: "open"): Promise<AdminReportRow[]> {
  await getActingAdmin();
  return getReportsForModeration(statusFilter);
}

export async function blockReportedUserAction(reportId: string): Promise<BlockReportedUserResult> {
  const caller = await getActingAdmin();
  return blockReportedUser(caller, reportId);
}
