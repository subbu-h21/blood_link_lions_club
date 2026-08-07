"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { REQUEST_STAGES, type RequestStage } from "@/lib/serialise/stage";
import type { Urgency } from "@/lib/serialise/urgency";
import type { AdminQueueRow, EscalationThresholds } from "@/lib/db/requests";
import { takeOwnershipAction } from "@/lib/actions/admin-request-detail";

// A1 · Queue (PRD.md §9.1), real data (Unit 37). `initialRows`/
// `escalationThresholds` come from a server-side read
// (lib/db/requests.ts's getAdminQueue/getEscalationThresholds), already
// scoped to the acting admin's own region - never a whole-table fetch.
// Sort and the escalation flag are computed here, not server-side - both
// are relative to "now" at render time, same treatment already given to
// other genuinely clock-relative UI in this codebase (S2's open/closed
// badge, D2's cooldown date).
const URGENCY_RANK: Record<Urgency, number> = { emergency: 0, normal: 1 };

function ageMinutes(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

function isPastEscalationThreshold(
  row: AdminQueueRow,
  minutes: number,
  thresholds: EscalationThresholds,
): boolean {
  if (row.stage !== "finding_prospects") return false;
  const threshold = row.urgency === "emergency" ? thresholds.emergencyMinutes : thresholds.normalMinutes;
  return minutes >= threshold;
}

/**
 * PRD.md §9.3/§12 Epic 6: "Unowned request with prospects raises an
 * alert" (Unit 44's own verify item) - a genuinely different condition
 * from the escalation-threshold flag above (that one is age/stage-based
 * and only ever applies to `finding_prospects`; this one applies to any
 * open stage the moment a real prospect exists with nobody yet
 * responsible for it). Both `ownerName`/`prospectsCount` already come
 * from the existing server read (Unit 37) - no new query needed, this is
 * a client-side derivation of data already being fetched.
 */
function isUnownedWithProspects(row: AdminQueueRow): boolean {
  return row.ownerName === null && row.prospectsCount > 0;
}

/**
 * **Reverted to a plain table, Unit 59 (2026-08-07).** The inline
 * expand-in-place prospects panel + assign/unassign added 2026-08-06 has
 * moved to `AdminMyCases.tsx` (near-verbatim, not deleted) - a request
 * with prospects now requires an admin to consciously Handle it before
 * anyone can act on it at all (the exclusive ownership lock this unit
 * adds server-side in `lib/db/admin-requests.ts`), so the Queue itself
 * goes back to being a plain, scannable list with one new action: Handle.
 */
export function AdminQueueBoard({
  initialRows,
  escalationThresholds,
}: {
  initialRows: AdminQueueRow[];
  escalationThresholds: EscalationThresholds;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState<RequestStage | "all">("all");

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);

  async function confirmHandle(requestId: string) {
    setPendingId(requestId);
    setHandleError(null);
    try {
      const result = await takeOwnershipAction(requestId);
      if (!result.ok) {
        setHandleError(t("adminPortal.queue.handleError"));
        return;
      }
      setConfirmingId(null);
      // This row's own Owner/Handle columns come from `initialRows` (a
      // static server-computed prop) - `router.refresh()` re-fetches both
      // this Queue and the sibling My Cases table on the same page, since
      // Handle changes what both should show.
      router.refresh();
    } catch {
      setHandleError(t("adminPortal.queue.handleError"));
    } finally {
      setPendingId(null);
    }
  }

  function stageLabel(stage: RequestStage): string {
    switch (stage) {
      case "finding_prospects":
        return t("search.s5.stageFindingProspects");
      case "evaluating_prospects":
        return t("search.s5.stageEvaluatingProspects");
      case "scheduled":
        return t("search.s5.stageScheduled");
      case "resolved":
        return t("search.s5.stageResolved");
      case "closed":
        return t("search.s5.stageClosed");
    }
  }

  function urgencyLabel(urgency: Urgency): string {
    return urgency === "emergency"
      ? t("adminPortal.queue.urgencyEmergency")
      : t("adminPortal.queue.urgencyNormal");
  }

  function ageLabel(minutes: number): string {
    if (minutes < 60) return t("adminPortal.queue.ageMinutes", { minutes });
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return t("adminPortal.queue.ageHours", { hours, minutes: remaining });
  }

  const rows = useMemo(() => {
    const filtered =
      stageFilter === "all" ? initialRows : initialRows.filter((row) => row.stage === stageFilter);
    return [...filtered]
      .map((row) => ({ row, minutes: ageMinutes(row.createdAt) }))
      .sort((a, b) => {
        const urgencyDiff = URGENCY_RANK[a.row.urgency] - URGENCY_RANK[b.row.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return b.minutes - a.minutes;
      });
  }, [initialRows, stageFilter]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.queue.title")}</h1>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700" htmlFor="stageFilter">
        {t("adminPortal.queue.filterLabel")}
        <select
          id="stageFilter"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as RequestStage | "all")}
          className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          <option value="all">{t("adminPortal.queue.filterAllOption")}</option>
          {REQUEST_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stageLabel(stage)}
            </option>
          ))}
        </select>
      </label>

      {handleError && <p className="text-sm text-blood-600">{handleError}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">{t("adminPortal.queue.emptyMessage")}</p>
      ) : (
        <div className="w-full max-w-4xl overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-sand-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnAge")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnUrgency")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnStage")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnBloodGroup")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnProspects")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnOwner")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnHandle")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, minutes }) => (
                <tr key={row.id} className="border-b border-ink-100 text-ink-900 last:border-b-0">
                  <td className="py-2.5 px-3">
                    {ageLabel(minutes)}
                    {isPastEscalationThreshold(row, minutes, escalationThresholds) && (
                      <span className="ml-2 rounded-full bg-blood-50 px-2 py-0.5 text-xs font-medium text-blood-600">
                        {t("adminPortal.queue.escalationFlag")}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">{urgencyLabel(row.urgency)}</td>
                  <td className="py-2.5 px-3">{stageLabel(row.stage)}</td>
                  <td className="py-2.5 px-3">{row.bloodGroup}</td>
                  <td className="py-2.5 px-3">{row.prospectsCount}</td>
                  <td className="py-2.5 px-3">
                    {row.ownerName ?? t("adminPortal.queue.ownerUnassigned")}
                    {isUnownedWithProspects(row) && (
                      <span className="ml-2 rounded-full bg-blood-50 px-2 py-0.5 text-xs font-medium text-blood-600">
                        {t("adminPortal.queue.unownedAlertFlag")}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {row.ownerName !== null ? (
                      <span className="text-ink-500">{t("adminPortal.queue.handleTakenLabel")}</span>
                    ) : confirmingId === row.id ? (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-ink-700">{t("adminPortal.queue.confirmHandleMessage")}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => confirmHandle(row.id)}
                            disabled={pendingId === row.id}
                            className="rounded-full bg-blood-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t("adminPortal.queue.confirmHandleButton")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={pendingId === row.id}
                            className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t("adminPortal.queue.cancelHandleButton")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setHandleError(null);
                          setConfirmingId(row.id);
                        }}
                        className="rounded-full border border-blood-600 px-3 py-1.5 text-xs font-medium text-blood-600 transition hover:bg-blood-50"
                      >
                        {t("adminPortal.queue.handleButton")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
