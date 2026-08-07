"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { AuditLogRow } from "@/lib/db/audit-log";
import { loadAuditLogEntries } from "@/lib/actions/admin-audit";

// A6 · Audit log (PRD.md §9.1, "coordinator role only"), real data
// (Unit 50). `initialRows`/`initialHasMore` come from a server-side read
// (app/admin/(portal)/audit/page.tsx calling loadAuditLogEntries) -
// real, `.range()`-based pagination, same established shape as
// AdminDonorLookup's own real-pagination precedent (Unit 41), not a
// generous cap - an audit log grows unboundedly by definition. Real
// server-side coordinator-only enforcement lives in
// lib/supabase/proxy.ts (this unit's own gate) and defensively again in
// lib/db/audit-log.ts's getAuditLogEntries - this component's own
// "coordinator access only" banner is a visible label, not the actual
// access control, same distinction Unit 49's own mock version already
// drew.
const ACTION_FILTERS = ["view_contact", "transfer_region", "close_request", "block_user"] as const;

export function AdminAuditLog({
  initialRows,
  initialHasMore,
}: {
  initialRows: AuditLogRow[];
  initialHasMore: boolean;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AuditLogRow[]>(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");

  async function runLoad(nextPage: number, filter: string) {
    const result = await loadAuditLogEntries(nextPage, filter === "all" ? undefined : filter);
    setRows(result.rows);
    setHasMore(result.hasMore);
  }

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    runLoad(page, actionFilter);
  }, [page, actionFilter]);

  function onFilterChange(next: string) {
    setPage(0);
    setActionFilter(next);
  }

  // action/entityType are plain, unconstrained text (Unit 33) - fall back
  // to the raw value for anything this screen doesn't have a translated
  // label for yet, rather than assuming only these four/three values can
  // ever appear.
  function actionLabel(action: string): string {
    switch (action) {
      case "view_contact":
        return t("adminPortal.auditLog.actionViewContact");
      case "transfer_region":
        return t("adminPortal.auditLog.actionTransferRegion");
      case "close_request":
        return t("adminPortal.auditLog.actionCloseRequest");
      case "block_user":
        return t("adminPortal.auditLog.actionBlockUser");
      case "assign_to_bank":
        return t("adminPortal.auditLog.actionAssignToBank");
      case "unassign_from_bank":
        return t("adminPortal.auditLog.actionUnassignFromBank");
      case "take_ownership":
        return t("adminPortal.auditLog.actionTakeOwnership");
      case "file_report":
        return t("adminPortal.auditLog.actionFileReport");
      default:
        return action;
    }
  }

  function entityLabel(entityType: string): string {
    switch (entityType) {
      case "donor":
        return t("adminPortal.auditLog.entityDonor");
      case "request":
        return t("adminPortal.auditLog.entityRequest");
      case "profile":
        return t("adminPortal.auditLog.entityProfile");
      case "prospect":
        return t("adminPortal.auditLog.entityProspect");
      default:
        return entityType;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.auditLog.title")}</h1>

      <div className="w-fit rounded-2xl border border-soil-600 bg-soil-100 p-3 text-sm text-soil-700">
        {t("adminPortal.auditLog.coordinatorOnlyBanner")}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700" htmlFor="actionFilter">
        {t("adminPortal.auditLog.filterLabel")}
        <select
          id="actionFilter"
          value={actionFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          <option value="all">{t("adminPortal.auditLog.filterAllOption")}</option>
          {ACTION_FILTERS.map((action) => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </select>
      </label>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">{t("adminPortal.auditLog.emptyMessage")}</p>
      ) : (
        <div className="w-full max-w-3xl overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-sand-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2.5 px-3">{t("adminPortal.auditLog.columnTimestamp")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.auditLog.columnActor")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.auditLog.columnAction")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.auditLog.columnEntity")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink-100 text-ink-900 last:border-b-0">
                  <td className="py-2.5 px-3">{row.createdAt}</td>
                  <td className="py-2.5 px-3">{row.actorName}</td>
                  <td className="py-2.5 px-3">{actionLabel(row.action)}</td>
                  <td className="py-2.5 px-3">
                    {entityLabel(row.entityType)} · {row.entityId.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded-full border border-ink-200 px-3.5 py-2 font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("adminPortal.auditLog.prevPageButton")}
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="rounded-full border border-ink-200 px-3.5 py-2 font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("adminPortal.auditLog.nextPageButton")}
        </button>
      </div>
    </div>
  );
}
