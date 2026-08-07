import { createDbClient } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/audit-log";
import type { ActingAdmin } from "@/lib/db/admin-portal";
import { REPORT_REASONS, type ReportReason } from "@/lib/serialise/report-reason";

/**
 * A5 · Moderation (PRD.md §9.1), real data (Unit 48). Deliberately
 * district-wide, not region-scoped like A1/A3/A4 - confirmed with the
 * project owner before writing this file, not assumed either way:
 * `reports` (Unit 46) has no `region_id` column at all, and the two
 * parties on a report (reporter/subject) can be in different regions or
 * have none (a bank_staff/admin profile's own `region_id`/`bank_id`
 * concept doesn't map cleanly onto "the report's region" either way).
 * SPEC.md's own S1 scenario ("admin watches for one donor recurring
 * across unrelated requests") also reads as a cross-region concern, not a
 * single-region one. Every admin/coordinator sees every report.
 *
 * `status` stays the plain, unconstrained text column Unit 46 designed
 * (no exhaustive value list anywhere in PRD/SPEC) - this file establishes
 * exactly two real values in practice, `'open'` (the column default) and
 * `'blocked'` (written by `blockReportedUser` below), without adding a
 * check constraint retroactively; a future unit adding a real dismiss/
 * investigate flow can introduce more values without a schema change.
 *
 * `details` is free-text content a real reporter typed, never run through
 * i18n - same treatment as `patientName`/donor `fullName` elsewhere
 * (CLAUDE.md rule 8 governs this app's own interface copy, not simulated
 * or real user-submitted text). `reason` itself is now (2026-08-07)
 * validated app-side against `lib/serialise/report-reason.ts`'s
 * `REPORT_REASONS` - the column still has no DB check constraint (Unit
 * 46's own deliberate choice stands), the enum lives at this layer
 * instead, same pattern as `close-reason.ts` guarding `close_reason`.
 * PRD.md §11.3's own requirement ("the report mechanism must accept
 * [selling/buying blood] as a reason") is satisfied by `payment_demanded`
 * being one of the four values in that list.
 */
export type ReportRole = "searcher" | "donor" | "bank_staff" | "admin" | "coordinator";

export type CreateReportResult =
  | { ok: true; reportId: string }
  | { ok: false; reason: "invalid_reason" | "self_report" };

/**
 * The one write path for a new report (2026-08-07) - A2's admin-filed
 * report (`lib/db/admin-requests.ts`'s `fileReportOnRequester`/
 * `fileReportOnProspectDonor`) is the only real caller today, but this
 * stays a plain, reporter-agnostic table writer (mirrors `writeAuditLog`'s
 * own shape) rather than baking A2-specific scoping in here, so a future
 * reporting entry point (e.g. bank-side, per this session's own deferred
 * discussion) can reuse it without duplicating the insert.
 * `reporterId === subjectId` is rejected defensively - not reachable
 * through A2 today (an admin is never the request's own requester or one
 * of its donors), but cheap insurance against a future caller getting
 * that wrong.
 */
export async function createReport(
  reporterId: string,
  subjectId: string,
  reason: ReportReason,
  details: string | null,
): Promise<CreateReportResult> {
  if (!REPORT_REASONS.includes(reason)) return { ok: false, reason: "invalid_reason" };
  if (reporterId === subjectId) return { ok: false, reason: "self_report" };

  const db = createDbClient();
  const { data, error } = await db
    .from("reports")
    .insert({
      reporter_id: reporterId,
      subject_id: subjectId,
      reason,
      details: details?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;

  return { ok: true, reportId: data.id as string };
}

export type AdminReportRow = {
  id: string;
  reporterName: string;
  reporterRole: ReportRole;
  subjectId: string;
  subjectName: string;
  subjectRole: ReportRole;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
};

// A single moderation queue, not paginated - same "generous cap, not real
// pagination" precedent as A1/A4's own lower-traffic admin lists (Units
// 37/43), not A3's real paginated regional donor list (which has no
// natural upper bound the way a moderation queue does).
const MAX_REPORTS = 200;

export async function getReportsForModeration(statusFilter?: "open"): Promise<AdminReportRow[]> {
  const db = createDbClient();
  let query = db
    .from("reports")
    .select("id, reporter_id, subject_id, reason, details, status, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_REPORTS);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: reports, error } = await query;
  if (error) throw error;
  if (reports.length === 0) return [];

  const profileIds = [...new Set(reports.flatMap((r) => [r.reporter_id, r.subject_id]))];
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, full_name, role")
    .in("id", profileIds)
    .limit(profileIds.length);
  if (profilesError) throw profilesError;
  const profileById = new Map(profiles.map((p) => [p.id as string, p]));

  return reports.map((r) => {
    const reporter = profileById.get(r.reporter_id as string);
    const subject = profileById.get(r.subject_id as string);
    return {
      id: r.id as string,
      reporterName: reporter?.full_name ?? "",
      reporterRole: (reporter?.role as ReportRole) ?? "searcher",
      subjectId: r.subject_id as string,
      subjectName: subject?.full_name ?? "",
      subjectRole: (subject?.role as ReportRole) ?? "searcher",
      reason: r.reason as string,
      details: r.details as string | null,
      status: r.status as string,
      createdAt: r.created_at as string,
    };
  });
}

export type BlockReportedUserResult = { ok: true } | { ok: false; reason: "not_found" };

/**
 * Blocks the report's *subject*, never the reporter (SPEC.md's own S1
 * framing: the admin acts on the person being watched, not whoever flagged
 * them). Sets `profiles.is_blocked = true` - `lib/db/profiles.ts`'s
 * `assertNotBlocked` (called from every portal's own `getActingX()`) is
 * what actually enforces the consequence, immediately, on that user's next
 * request; Unit 17's matching engine already excludes blocked donors
 * (`lib/matching/eligibility.ts`'s own `isDonorEligible`, confirmed live
 * during this unit's own verification, not assumed from the code alone).
 * Audited the same way a contact reveal is (Unit 39's own precedent) -
 * `entity_type: "profile"` since the subject could be any role, not only
 * a donor.
 */
export async function blockReportedUser(
  caller: ActingAdmin,
  reportId: string,
): Promise<BlockReportedUserResult> {
  const db = createDbClient();
  const { data: report, error } = await db
    .from("reports")
    .select("id, subject_id")
    .eq("id", reportId)
    .maybeSingle();
  if (error) throw error;
  if (!report) return { ok: false, reason: "not_found" };

  const { error: blockError } = await db
    .from("profiles")
    .update({ is_blocked: true })
    .eq("id", report.subject_id);
  if (blockError) throw blockError;

  const { error: statusError } = await db
    .from("reports")
    .update({ status: "blocked" })
    .eq("id", reportId);
  if (statusError) throw statusError;

  await writeAuditLog(caller.profileId, "block_user", "profile", report.subject_id as string, {
    reportId,
  });

  return { ok: true };
}
