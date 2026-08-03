"use server";

import { getActingAdmin } from "@/lib/db/admin-portal";
import { getAuditLogEntries, type AuditLogPage } from "@/lib/db/audit-log";

export async function loadAuditLogEntries(page: number, actionFilter?: string): Promise<AuditLogPage> {
  const caller = await getActingAdmin();
  return getAuditLogEntries(caller, page, actionFilter);
}
