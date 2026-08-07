"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { RequestStage } from "@/lib/serialise/stage";
import type { ProspectStatus } from "@/lib/serialise/donor-contact";
import type { Urgency } from "@/lib/serialise/urgency";
import type { AdminQueueRow } from "@/lib/db/requests";
import type { AdminRequestDetailView } from "@/lib/db/admin-requests";
import {
  loadAdminRequestDetail,
  assignProspectToBankAction,
  unassignProspectFromBankAction,
} from "@/lib/actions/admin-request-detail";

// A prospect can only be assigned/unassigned while still `accepted` -
// mirrors lib/db/admin-requests.ts's own (private) ASSIGNABLE_STATUSES
// and AdminRequestDetail.tsx's identical local copy exactly.
const ASSIGNABLE_STATUSES: ProspectStatus[] = ["accepted"];

const URGENCY_RANK: Record<Urgency, number> = { emergency: 0, normal: 1 };

function ageMinutes(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}

/**
 * "My Cases" (Unit 59, 2026-08-07) - where Handle sends an admin. This is
 * the expand-in-place prospects panel (name, age, blood group, status,
 * call, assign/unassign) that used to live directly in
 * `AdminQueueBoard.tsx` (added 2026-08-06) - **relocated here verbatim**,
 * not rewritten, now pointed at `getMyCases` (owner-scoped) instead of
 * `getAdminQueue` (region-scoped). `initialRows` comes from a server-side
 * read already scoped to this caller's own `owner_admin_id` - never a
 * client-supplied filter.
 *
 * No stage filter dropdown here (unlike the Queue) - `getMyCases` only
 * ever returns open-stage rows to begin with, so a filter would have
 * nothing to narrow. No escalation flag either - that's specifically
 * about *unowned* aging requests (PRD's "no prospect" trigger); every row
 * here already has an owner, this admin.
 */
export function AdminMyCases({ initialRows }: { initialRows: AdminQueueRow[] }) {
  const { t } = useTranslation();
  const router = useRouter();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailByRequest, setDetailByRequest] = useState<Map<string, AdminRequestDetailView>>(new Map());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingProspectId, setPendingProspectId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  async function refreshDetail(requestId: string) {
    const detail = await loadAdminRequestDetail(requestId);
    if (detail) {
      setDetailByRequest((prev) => new Map(prev).set(requestId, detail));
    }
  }

  async function toggleExpand(requestId: string) {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);
    setPanelError(null);
    if (!detailByRequest.has(requestId)) {
      setLoadingId(requestId);
      try {
        await refreshDetail(requestId);
      } catch {
        setPanelError(t("adminPortal.myCases.prospectsLoadError"));
      } finally {
        setLoadingId(null);
      }
    }
  }

  async function handleAssign(requestId: string, prospectId: string) {
    setPendingProspectId(prospectId);
    setPanelError(null);
    try {
      const result = await assignProspectToBankAction(requestId, prospectId);
      if (!result.ok) {
        setPanelError(t("adminPortal.myCases.assignError"));
        return;
      }
      await refreshDetail(requestId);
      // Assigning can advance request.stage to 'scheduled' - this row's
      // own Stage/Prospects columns come from `initialRows` (a static
      // server-computed prop), which router.refresh() re-fetches and
      // reconciles without losing `expandedId`/`detailByRequest` local
      // state (same fix as AdminQueueBoard.tsx's own identical action,
      // and DonorHomeView.tsx before it).
      router.refresh();
    } catch {
      setPanelError(t("adminPortal.myCases.assignError"));
    } finally {
      setPendingProspectId(null);
    }
  }

  async function handleUnassign(requestId: string, prospectId: string) {
    setPendingProspectId(prospectId);
    setPanelError(null);
    try {
      const result = await unassignProspectFromBankAction(requestId, prospectId);
      if (!result.ok) {
        setPanelError(t("adminPortal.myCases.assignError"));
        return;
      }
      await refreshDetail(requestId);
      // Unassigning never changes request.stage - no router.refresh()
      // needed here, same reasoning as AdminQueueBoard.tsx's own version.
    } catch {
      setPanelError(t("adminPortal.myCases.assignError"));
    } finally {
      setPendingProspectId(null);
    }
  }

  function prospectStatusLabel(status: ProspectStatus): string {
    switch (status) {
      case "invited":
        return t("adminPortal.requestDetail.prospectStatusInvited");
      case "accepted":
        return t("adminPortal.requestDetail.prospectStatusAccepted");
      case "screening":
        return t("adminPortal.requestDetail.prospectStatusScreening");
      case "donated":
        return t("adminPortal.requestDetail.prospectStatusDonated");
      case "rejected":
        return t("adminPortal.requestDetail.prospectStatusRejected");
      case "no_show":
        return t("adminPortal.requestDetail.prospectStatusNoShow");
      case "stood_down":
        return t("adminPortal.requestDetail.prospectStatusStoodDown");
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
    return [...initialRows]
      .map((row) => ({ row, minutes: ageMinutes(row.createdAt) }))
      .sort((a, b) => {
        const urgencyDiff = URGENCY_RANK[a.row.urgency] - URGENCY_RANK[b.row.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return b.minutes - a.minutes;
      });
  }, [initialRows]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.myCases.title")}</h2>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">{t("adminPortal.myCases.emptyMessage")}</p>
      ) : (
        <div className="w-full max-w-3xl overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-sand-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnAge")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnUrgency")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnStage")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnBloodGroup")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.queue.columnProspects")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, minutes }) => {
                const isExpanded = expandedId === row.id;
                const detail = detailByRequest.get(row.id);
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() => toggleExpand(row.id)}
                      className="cursor-pointer border-b border-ink-100 text-ink-900 last:border-b-0 hover:bg-sand-100"
                    >
                      <td className="py-2.5 px-3">
                        <span className="mr-1.5 inline-block w-3 text-ink-500">{isExpanded ? "▾" : "▸"}</span>
                        {ageLabel(minutes)}
                      </td>
                      <td className="py-2.5 px-3">{urgencyLabel(row.urgency)}</td>
                      <td className="py-2.5 px-3">{stageLabel(row.stage)}</td>
                      <td className="py-2.5 px-3">{row.bloodGroup}</td>
                      <td className="py-2.5 px-3">{row.prospectsCount}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${row.id}-panel`} className="border-b border-ink-100 bg-sand-50">
                        <td colSpan={5} className="p-3">
                          {loadingId === row.id ? (
                            <p className="text-sm text-ink-500">{t("adminPortal.myCases.loadingProspectsMessage")}</p>
                          ) : panelError ? (
                            <p className="text-sm text-blood-600">{panelError}</p>
                          ) : !detail || detail.prospects.length === 0 ? (
                            <p className="text-sm text-ink-500">{t("adminPortal.requestDetail.prospectsEmptyMessage")}</p>
                          ) : (
                            <ul className="flex flex-col gap-2">
                              {detail.prospects.map((prospect) => (
                                <li
                                  key={prospect.id}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-white p-2.5 text-sm"
                                >
                                  <span className="font-medium text-ink-900">{prospect.donorName}</span>
                                  {prospect.donorAge !== null && (
                                    <span className="text-ink-500">
                                      {t("adminPortal.requestDetail.ageLabel")}: {prospect.donorAge}
                                    </span>
                                  )}
                                  <span className="text-ink-500">{prospect.bloodGroup}</span>
                                  <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                                    {prospectStatusLabel(prospect.status)}
                                  </span>
                                  {ASSIGNABLE_STATUSES.includes(prospect.status) && (
                                    <span
                                      className={
                                        prospect.assignedAt
                                          ? "rounded-full bg-banyan-100 px-2 py-0.5 text-xs font-medium text-banyan-700"
                                          : "rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-ink-500"
                                      }
                                    >
                                      {prospect.assignedAt
                                        ? t("adminPortal.requestDetail.assignedLabel")
                                        : t("adminPortal.requestDetail.notAssignedLabel")}
                                    </span>
                                  )}
                                  <span className="ml-auto flex gap-2">
                                    {prospect.donorPhone && (
                                      <a
                                        href={`tel:${prospect.donorPhone}`}
                                        className="rounded-full bg-blood-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700"
                                      >
                                        {t("adminPortal.requestDetail.callDonorButton")}
                                      </a>
                                    )}
                                    {ASSIGNABLE_STATUSES.includes(prospect.status) && !prospect.assignedAt && (
                                      <button
                                        type="button"
                                        onClick={() => handleAssign(row.id, prospect.id)}
                                        disabled={pendingProspectId === prospect.id}
                                        className="rounded-full border border-banyan-600 px-3 py-1.5 text-xs font-medium text-banyan-700 transition hover:bg-banyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {t("adminPortal.requestDetail.assignButton")}
                                      </button>
                                    )}
                                    {ASSIGNABLE_STATUSES.includes(prospect.status) && prospect.assignedAt && (
                                      <button
                                        type="button"
                                        onClick={() => handleUnassign(row.id, prospect.id)}
                                        disabled={pendingProspectId === prospect.id}
                                        className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {t("adminPortal.requestDetail.unassignButton")}
                                      </button>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
