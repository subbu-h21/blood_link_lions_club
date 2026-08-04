"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { AdminReportRow, ReportRole } from "@/lib/db/reports";
import { loadAdminReports, blockReportedUserAction } from "@/lib/actions/admin-reports";

// A5 · Moderation (PRD.md §9.1), real data (Unit 48). `initialReports`
// comes from a server-side read (app/admin/(portal)/reports/page.tsx
// calling loadAdminReports) - district-wide, not region-scoped (see
// lib/db/reports.ts's own doc comment for the reasoning, confirmed with
// the project owner). Block-user targets the report's subject only, sets
// profiles.is_blocked = true, and is audited the same way a contact
// reveal is (Unit 39's precedent) - lib/db/profiles.ts's assertNotBlocked
// (called from every portal's own getActingX()) is what actually
// enforces the consequence on that user's next request.
export function AdminModeration({ initialReports }: { initialReports: AdminReportRow[] }) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<AdminReportRow[]>(initialReports);
  const [statusFilter, setStatusFilter] = useState<"all" | "open">("all");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function roleLabel(role: ReportRole): string {
    switch (role) {
      case "donor":
        return t("adminPortal.moderation.roleDonor");
      case "searcher":
        return t("adminPortal.moderation.roleSearcher");
      case "bank_staff":
        return t("adminPortal.moderation.roleBankStaff");
      case "admin":
        return t("adminPortal.moderation.roleAdmin");
      case "coordinator":
        return t("adminPortal.moderation.roleCoordinator");
    }
  }

  async function onFilterChange(next: "all" | "open") {
    setStatusFilter(next);
    const fresh = await loadAdminReports(next === "open" ? "open" : undefined);
    setReports(fresh);
  }

  async function blockUser(reportId: string) {
    setPending((p) => ({ ...p, [reportId]: true }));
    setErrors((e) => ({ ...e, [reportId]: "" }));
    const result = await blockReportedUserAction(reportId);
    setPending((p) => ({ ...p, [reportId]: false }));
    if (!result.ok) {
      setErrors((e) => ({ ...e, [reportId]: t("adminPortal.moderation.actionError") }));
      return;
    }
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "blocked" } : r)));
    setOutcome((o) => ({ ...o, [reportId]: t("adminPortal.moderation.blockDoneMessage") }));
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.moderation.title")}</h1>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700" htmlFor="statusFilter">
        {t("adminPortal.moderation.filterLabel")}
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => onFilterChange(e.target.value as "all" | "open")}
          className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          <option value="all">{t("adminPortal.moderation.filterAllOption")}</option>
          <option value="open">{t("adminPortal.moderation.filterOpenOption")}</option>
        </select>
      </label>

      {reports.length === 0 ? (
        <p className="text-sm text-ink-500">{t("adminPortal.moderation.emptyMessage")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex max-w-md flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-ink-900">
                  {report.subjectName} ({roleLabel(report.subjectRole)})
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    report.status === "blocked" ? "bg-blood-50 text-blood-600" : "bg-sand-100 text-ink-500"
                  }`}
                >
                  {report.status === "blocked"
                    ? t("adminPortal.moderation.statusBlocked")
                    : t("adminPortal.moderation.statusOpen")}
                </span>
              </div>

              <p>
                <span className="text-ink-500">{t("adminPortal.moderation.reporterLabel")}: </span>
                {report.reporterName} ({roleLabel(report.reporterRole)})
              </p>
              <p>
                <span className="text-ink-500">{t("adminPortal.moderation.reasonLabel")}: </span>
                {report.reason}
              </p>
              {report.details && (
                <p>
                  <span className="text-ink-500">{t("adminPortal.moderation.detailsLabel")}: </span>
                  {report.details}
                </p>
              )}
              <p className="text-xs text-ink-500">
                {t("adminPortal.moderation.reportedAtLabel")}: {report.createdAt}
              </p>

              {errors[report.id] && <p className="text-xs text-blood-600">{errors[report.id]}</p>}
              {outcome[report.id] && (
                <p className="rounded-lg border border-banyan-600 bg-banyan-100 p-2 text-sm text-banyan-700">
                  {outcome[report.id]}
                </p>
              )}

              {report.status !== "blocked" && (
                <button
                  type="button"
                  onClick={() => blockUser(report.id)}
                  disabled={pending[report.id]}
                  className="w-fit rounded-full border border-blood-600 px-3 py-2 text-xs font-semibold text-blood-600 transition hover:bg-blood-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("adminPortal.moderation.blockButton")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
