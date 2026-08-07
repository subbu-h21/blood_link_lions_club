"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { CLOSE_REASONS, type CloseReason } from "@/lib/serialise/close-reason";
import type { RequestStage } from "@/lib/serialise/stage";
import type { Urgency } from "@/lib/serialise/urgency";
import type { ProspectStatus } from "@/lib/serialise/donor-contact";
import type { AdminRequestDetailView, RegionOption } from "@/lib/db/admin-requests";
import { REPORT_REASONS, type ReportReason } from "@/lib/serialise/report-reason";
import {
  loadAdminRequestDetail,
  takeOwnershipAction,
  assignProspectToBankAction,
  unassignProspectFromBankAction,
  standDownProspectAction,
  loadTransferableRegionsAction,
  transferRequestAction,
  closeRequestAction,
  fileReportOnRequesterAction,
  fileReportOnProspectDonorAction,
} from "@/lib/actions/admin-request-detail";

const STANDDOWNABLE_STATUSES: ProspectStatus[] = ["invited", "accepted", "screening"];

// Mirrors lib/db/admin-requests.ts's own (private) ASSIGNABLE_STATUSES
// exactly - a prospect can only be assigned/unassigned while still
// `accepted`: not yet (still `invited`, nothing to assign) and not after
// they've physically arrived (`screening` onward - the bank already
// knows about them by then). This is purely a UI affordance (hide a
// button that would just fail server-side); the server re-checks the
// same condition on the actual write, same "client gating is
// presentation only" split every other action on this page already
// follows.
const ASSIGNABLE_STATUSES: ProspectStatus[] = ["accepted"];

/**
 * A2 · Request detail (PRD.md §9.1), real data (Unit 39). `initialDetail`
 * comes from a server-side read (app/admin/(portal)/request/[id]/
 * page.tsx calling loadAdminRequestDetail), already scoped to the acting
 * admin/coordinator (lib/db/admin-requests.ts). After every action, the
 * whole detail is re-fetched from the server rather than optimistically
 * patched client-side - the timeline and owner name are both derived from
 * several real columns/joins server-side, and hand-replicating that
 * derivation here for each of the six actions would risk drifting out of
 * sync with the real logic (unlike IncomingProspects.tsx's simpler
 * single-field optimistic update, Unit 28).
 */
export function AdminRequestDetail({
  requestId,
  initialDetail,
}: {
  requestId: string;
  initialDetail: AdminRequestDetailView | null;
}) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState(initialDetail);
  const [pending, setPending] = useState(false);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [regions, setRegions] = useState<RegionOption[] | null>(null);
  const [transferRegionId, setTransferRegionId] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);

  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState<CloseReason | "">("");
  const [closeReasonError, setCloseReasonError] = useState<string | null>(null);

  // Report (2026-08-07) - two independent report targets on this same
  // screen (the requester, and any one of the prospects), so this mirrors
  // AdminDonorLookup.tsx's own `Record<id, state>` shape for the
  // per-prospect case rather than a single shared form that would leak
  // state between different donors. The requester has only one possible
  // target, so a flat set of fields is enough there - no id to key by.
  const [reportingRequester, setReportingRequester] = useState(false);
  const [requesterReportReason, setRequesterReportReason] = useState<ReportReason | "">("");
  const [requesterReportDetails, setRequesterReportDetails] = useState("");
  const [requesterReportError, setRequesterReportError] = useState<string | null>(null);

  type ProspectReportState = { reason: ReportReason | ""; details: string; error: string | null };
  const [prospectReports, setProspectReports] = useState<Record<string, ProspectReportState>>({});

  async function refresh() {
    const fresh = await loadAdminRequestDetail(requestId);
    setDetail(fresh);
  }

  async function ensureRegionsLoaded() {
    if (regions !== null) return;
    const options = await loadTransferableRegionsAction(requestId);
    setRegions(options ?? []);
  }

  function stageLabel(s: RequestStage): string {
    switch (s) {
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

  function urgencyLabel(u: Urgency): string {
    return u === "emergency"
      ? t("adminPortal.requestDetail.urgencyEmergency")
      : t("adminPortal.requestDetail.urgencyNormal");
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

  function reasonLabel(r: CloseReason): string {
    switch (r) {
      case "found_elsewhere":
        return t("search.s5.reasonFoundElsewhere");
      case "no_longer_needed":
        return t("search.s5.reasonNoLongerNeeded");
      case "no_donor_found":
        return t("search.s5.reasonNoDonorFound");
      case "expired":
        return t("search.s5.reasonExpired");
      case "abusive":
        return t("search.s5.reasonAbusive");
    }
  }

  function reportReasonLabel(r: ReportReason): string {
    switch (r) {
      case "payment_demanded":
        return t("adminPortal.requestDetail.reportReasonPaymentDemanded");
      case "abusive_behavior":
        return t("adminPortal.requestDetail.reportReasonAbusiveBehavior");
      case "suspected_fraud":
        return t("adminPortal.requestDetail.reportReasonSuspectedFraud");
      case "other":
        return t("adminPortal.requestDetail.reportReasonOther");
    }
  }

  async function takeOwnership() {
    setPending(true);
    setActionError(null);
    try {
      const result = await takeOwnershipAction(requestId);
      if (!result.ok) {
        setActionError(t("adminPortal.requestDetail.actionError"));
        return;
      }
      await refresh();
      setOutcomeMessage(t("adminPortal.requestDetail.takeOwnershipDoneMessage"));
    } catch {
      setActionError(t("adminPortal.requestDetail.actionError"));
    } finally {
      setPending(false);
    }
  }

  async function assign(prospectId: string) {
    setPending(true);
    setActionError(null);
    try {
      const result = await assignProspectToBankAction(requestId, prospectId);
      if (!result.ok) {
        setActionError(t("adminPortal.requestDetail.actionError"));
        return;
      }
      await refresh();
      setOutcomeMessage(t("adminPortal.requestDetail.assignDoneMessage"));
    } catch {
      setActionError(t("adminPortal.requestDetail.actionError"));
    } finally {
      setPending(false);
    }
  }

  async function unassign(prospectId: string) {
    setPending(true);
    setActionError(null);
    try {
      const result = await unassignProspectFromBankAction(requestId, prospectId);
      if (!result.ok) {
        setActionError(t("adminPortal.requestDetail.actionError"));
        return;
      }
      await refresh();
      setOutcomeMessage(t("adminPortal.requestDetail.unassignDoneMessage"));
    } catch {
      setActionError(t("adminPortal.requestDetail.actionError"));
    } finally {
      setPending(false);
    }
  }

  async function standDown(prospectId: string) {
    setPending(true);
    setActionError(null);
    try {
      const result = await standDownProspectAction(requestId, prospectId);
      if (!result.ok) {
        setActionError(t("adminPortal.requestDetail.actionError"));
        return;
      }
      await refresh();
      setOutcomeMessage(t("adminPortal.requestDetail.standDownDoneMessage"));
    } catch {
      setActionError(t("adminPortal.requestDetail.actionError"));
    } finally {
      setPending(false);
    }
  }

  async function transfer() {
    if (!transferRegionId) {
      setTransferError(t("adminPortal.requestDetail.selectRegionPlaceholder"));
      return;
    }
    setTransferError(null);
    setPending(true);
    setActionError(null);
    try {
      const result = await transferRequestAction(requestId, transferRegionId);
      if (!result.ok) {
        setActionError(t("adminPortal.requestDetail.actionError"));
        return;
      }
      const regionName = regions?.find((r) => r.id === transferRegionId)?.name ?? "";
      setOutcomeMessage(t("adminPortal.requestDetail.transferDoneMessage", { region: regionName }));
      // The request has moved out of this admin's own region - nothing more
      // to refresh from here; a coordinator could still reopen it, an
      // admin cannot (region scoping, same as every other action).
    } catch {
      setActionError(t("adminPortal.requestDetail.actionError"));
    } finally {
      setPending(false);
    }
  }

  async function confirmClose() {
    if (!closeReason) {
      setCloseReasonError(t("adminPortal.requestDetail.invalidReason"));
      return;
    }
    setCloseReasonError(null);
    setPending(true);
    setActionError(null);
    try {
      const result = await closeRequestAction(requestId, closeReason);
      if (!result.ok) {
        setActionError(t("adminPortal.requestDetail.actionError"));
        return;
      }
      await refresh();
      setClosing(false);
      setOutcomeMessage(t("adminPortal.requestDetail.closeDoneMessage"));
    } catch {
      setActionError(t("adminPortal.requestDetail.actionError"));
    } finally {
      setPending(false);
    }
  }

  function startRequesterReport() {
    setReportingRequester(true);
    setRequesterReportReason("");
    setRequesterReportDetails("");
    setRequesterReportError(null);
  }

  async function confirmRequesterReport() {
    if (!requesterReportReason) {
      setRequesterReportError(t("adminPortal.requestDetail.invalidReportReason"));
      return;
    }
    setRequesterReportError(null);
    setPending(true);
    try {
      const result = await fileReportOnRequesterAction(
        requestId,
        requesterReportReason,
        requesterReportDetails.trim() || null,
      );
      if (!result.ok) {
        setRequesterReportError(t("adminPortal.requestDetail.actionError"));
        return;
      }
      // No refresh() - filing a report changes nothing about `detail`
      // itself (no stage/owner/prospect field it touches), unlike
      // assign/close/transfer, same "no visible state changed" reasoning
      // unassignProspectFromBank's own handler already uses.
      setReportingRequester(false);
      setOutcomeMessage(t("adminPortal.requestDetail.reportDoneMessage"));
    } catch {
      setRequesterReportError(t("adminPortal.requestDetail.actionError"));
    } finally {
      setPending(false);
    }
  }

  function startProspectReport(prospectId: string) {
    setProspectReports((prev) => ({ ...prev, [prospectId]: { reason: "", details: "", error: null } }));
  }

  function cancelProspectReport(prospectId: string) {
    setProspectReports((prev) => {
      const next = { ...prev };
      delete next[prospectId];
      return next;
    });
  }

  function updateProspectReportField(prospectId: string, field: "reason" | "details", value: string) {
    setProspectReports((prev) => ({
      ...prev,
      [prospectId]: { ...prev[prospectId], [field]: value },
    }));
  }

  async function confirmProspectReport(prospectId: string) {
    const state = prospectReports[prospectId];
    if (!state) return;
    if (!state.reason) {
      setProspectReports((prev) => ({
        ...prev,
        [prospectId]: { ...state, error: t("adminPortal.requestDetail.invalidReportReason") },
      }));
      return;
    }
    setProspectReports((prev) => ({ ...prev, [prospectId]: { ...state, error: null } }));
    setPending(true);
    try {
      const result = await fileReportOnProspectDonorAction(
        requestId,
        prospectId,
        state.reason,
        state.details.trim() || null,
      );
      if (!result.ok) {
        setProspectReports((prev) => ({
          ...prev,
          [prospectId]: { ...state, error: t("adminPortal.requestDetail.actionError") },
        }));
        return;
      }
      cancelProspectReport(prospectId);
      setOutcomeMessage(t("adminPortal.requestDetail.reportDoneMessage"));
    } catch {
      setProspectReports((prev) => ({
        ...prev,
        [prospectId]: { ...state, error: t("adminPortal.requestDetail.actionError") },
      }));
    } finally {
      setPending(false);
    }
  }

  if (!detail) {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.requestDetail.title")}</h1>
        <p className="text-ink-500">{t("adminPortal.requestDetail.notFoundMessage")}</p>
      </div>
    );
  }

  // Server-computed, added Unit 59 (2026-08-07) - folds the pre-existing
  // stage-based condition and the new ownership lock into one flag
  // (lib/db/admin-requests.ts's getAdminRequestDetail); this component no
  // longer derives its own local version of either half. `CLOSED_STAGES`
  // is kept here only to pick *which* explanatory message a `!canAct`
  // state deserves (already-closed vs owned-by-someone-else) - a
  // presentation choice, not a re-derivation of `canAct` itself, which
  // always comes from `detail.canAct` directly.
  const CLOSED_STAGES: RequestStage[] = ["resolved", "closed"];
  const canAct = detail.canAct;
  const showNotYourCase = !canAct && !CLOSED_STAGES.includes(detail.stage);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">
        {t("adminPortal.requestDetail.title")} #{requestId.slice(0, 8)}
      </h1>

      {showNotYourCase && (
        <p className="rounded-lg border border-soil-600 bg-soil-100 p-2 text-sm text-soil-700">
          {t("adminPortal.requestDetail.notYourCaseMessage")}
        </p>
      )}

      {outcomeMessage && (
        <p className="rounded-lg border border-banyan-600 bg-banyan-100 p-2 text-sm text-banyan-700">
          {outcomeMessage}
        </p>
      )}
      {actionError && <p className="text-sm text-blood-600">{actionError}</p>}

      <div className="flex flex-col gap-1.5 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]">
        <p>
          <span className="text-ink-500">{t("search.s5.stageLabel")}: </span>
          {stageLabel(detail.stage)}
        </p>
        <p>
          <span className="text-ink-500">{t("adminPortal.requestDetail.requesterPhoneLabel")}: </span>
          <a href={`tel:${detail.requesterPhone}`} className="font-medium text-blood-600 underline">
            {detail.requesterPhone}
          </a>
        </p>
        <p>
          <span className="text-ink-500">{t("adminPortal.requestDetail.patientNameLabel")}: </span>
          {detail.patientName || t("adminPortal.requestDetail.patientNameUnknown")}
        </p>
        <p>
          <span className="text-ink-500">{t("adminPortal.requestDetail.bloodGroupLabel")}: </span>
          {detail.bloodGroup}
        </p>
        <p>
          <span className="text-ink-500">{t("adminPortal.requestDetail.unitsLabel")}: </span>
          {detail.unitsNeeded}
        </p>
        <p>
          <span className="text-ink-500">{t("adminPortal.requestDetail.urgencyLabel")}: </span>
          {urgencyLabel(detail.urgency)}
        </p>
        <p>
          <span className="text-ink-500">{t("adminPortal.requestDetail.destinationBankLabel")}: </span>
          {detail.destinationBank.name}, {detail.destinationBank.address} (
          <a href={`tel:${detail.destinationBank.phone}`} className="font-medium text-blood-600 underline">
            {detail.destinationBank.phone}
          </a>
          )
        </p>
        {canAct && !reportingRequester && (
          <button
            type="button"
            onClick={startRequesterReport}
            disabled={pending}
            className="w-fit rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("adminPortal.requestDetail.reportButton")}
          </button>
        )}
        {reportingRequester && (
          <div className="flex flex-col gap-2 border-t border-ink-100 pt-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700" htmlFor="requesterReportReason">
              {t("adminPortal.requestDetail.reportReasonLabel")}
              <select
                id="requesterReportReason"
                value={requesterReportReason}
                onChange={(e) => setRequesterReportReason(e.target.value as ReportReason)}
                className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
              >
                <option value="">{t("adminPortal.requestDetail.selectReportReasonPlaceholder")}</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {reportReasonLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700" htmlFor="requesterReportDetails">
              {t("adminPortal.requestDetail.reportDetailsLabel")}
              <input
                id="requesterReportDetails"
                type="text"
                value={requesterReportDetails}
                onChange={(e) => setRequesterReportDetails(e.target.value)}
                placeholder={t("adminPortal.requestDetail.reportDetailsPlaceholder")}
                className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
              />
            </label>
            {requesterReportError && <p className="text-xs text-blood-600">{requesterReportError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmRequesterReport}
                disabled={pending}
                className="rounded-full bg-blood-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("adminPortal.requestDetail.reportConfirmButton")}
              </button>
              <button
                type="button"
                onClick={() => setReportingRequester(false)}
                disabled={pending}
                className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("adminPortal.requestDetail.reportCancelButton")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]">
        <p className="text-ink-500">{t("adminPortal.requestDetail.ownerLabel")}</p>
        {detail.ownerName ? (
          <p className="text-ink-900">{detail.ownerName}</p>
        ) : (
          <>
            <p className="text-ink-900">{t("adminPortal.requestDetail.ownerUnassignedMessage")}</p>
            {canAct && (
              <button
                type="button"
                onClick={takeOwnership}
                disabled={pending}
                className="w-fit rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("adminPortal.requestDetail.takeOwnershipButton")}
              </button>
            )}
          </>
        )}
      </div>

      {canAct && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setClosing(true)}
            disabled={pending}
            className="rounded-full border border-blood-600 px-3 py-2 text-sm font-medium text-blood-600 transition hover:bg-blood-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("adminPortal.requestDetail.closeButton")}
          </button>
        </div>
      )}

      {canAct && (
        <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]">
          <label className="flex flex-col gap-1.5 font-medium text-ink-700" htmlFor="transferRegion">
            {t("adminPortal.requestDetail.transferLabel")}
            <select
              id="transferRegion"
              value={transferRegionId}
              onFocus={ensureRegionsLoaded}
              onChange={(e) => setTransferRegionId(e.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            >
              <option value="">{t("adminPortal.requestDetail.selectRegionPlaceholder")}</option>
              {(regions ?? []).map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
          {transferError && <p className="text-sm text-blood-600">{transferError}</p>}
          <button
            type="button"
            onClick={transfer}
            disabled={pending}
            className="w-fit rounded-full border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("adminPortal.requestDetail.transferButton")}
          </button>
        </div>
      )}

      {closing && (
        <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]">
          <label className="flex flex-col gap-1.5 font-medium text-ink-700" htmlFor="closeReason">
            {t("adminPortal.requestDetail.closeReasonLabel")}
            <select
              id="closeReason"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value as CloseReason)}
              className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            >
              <option value="">{t("search.s5.selectReasonPlaceholder")}</option>
              {CLOSE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {reasonLabel(r)}
                </option>
              ))}
            </select>
          </label>
          {closeReasonError && <p className="text-sm text-blood-600">{closeReasonError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmClose}
              disabled={pending}
              className="rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("adminPortal.requestDetail.closeConfirmButton")}
            </button>
            <button
              type="button"
              onClick={() => setClosing(false)}
              disabled={pending}
              className="rounded-full border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("adminPortal.requestDetail.closeBackButton")}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-display font-semibold text-ink-900">{t("adminPortal.requestDetail.prospectsTitle")}</h2>
        {detail.prospects.length === 0 ? (
          <p className="text-sm text-ink-500">{t("adminPortal.requestDetail.prospectsEmptyMessage")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {detail.prospects.map((prospect) => (
              <li
                key={prospect.id}
                className="flex flex-col gap-1 rounded-2xl border border-ink-100 bg-white p-3 text-sm shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-ink-900">{prospect.donorName}</span>
                  <div className="flex items-center gap-1.5">
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
                    <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                      {prospectStatusLabel(prospect.status)}
                    </span>
                  </div>
                </div>
                <p className="text-ink-900">
                  {prospect.bloodGroup}
                  {prospect.donorAge !== null && ` · ${t("adminPortal.requestDetail.ageLabel")}: ${prospect.donorAge}`}
                </p>
                <p className="text-xs text-ink-500">
                  {t("adminPortal.requestDetail.invitedAtLabel")}: {prospect.invitedAt}
                  {prospect.respondedAt &&
                    ` · ${t("adminPortal.requestDetail.respondedAtLabel")}: ${prospect.respondedAt}`}
                  {prospect.outcomeAt &&
                    ` · ${t("adminPortal.requestDetail.outcomeAtLabel")}: ${prospect.outcomeAt}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {prospect.donorPhone && (
                    <a
                      href={`tel:${prospect.donorPhone}`}
                      className="w-fit rounded-full bg-blood-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700"
                    >
                      {t("adminPortal.requestDetail.callDonorButton")}
                    </a>
                  )}
                  {canAct && ASSIGNABLE_STATUSES.includes(prospect.status) && !prospect.assignedAt && (
                    <button
                      type="button"
                      onClick={() => assign(prospect.id)}
                      disabled={pending}
                      className="w-fit rounded-full border border-banyan-600 px-3 py-2 text-xs font-medium text-banyan-700 transition hover:bg-banyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("adminPortal.requestDetail.assignButton")}
                    </button>
                  )}
                  {canAct && ASSIGNABLE_STATUSES.includes(prospect.status) && prospect.assignedAt && (
                    <button
                      type="button"
                      onClick={() => unassign(prospect.id)}
                      disabled={pending}
                      className="w-fit rounded-full border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("adminPortal.requestDetail.unassignButton")}
                    </button>
                  )}
                  {canAct && STANDDOWNABLE_STATUSES.includes(prospect.status) && (
                    <button
                      type="button"
                      onClick={() => standDown(prospect.id)}
                      disabled={pending}
                      className="w-fit rounded-full border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("adminPortal.requestDetail.standDownButton")}
                    </button>
                  )}
                  {canAct && !prospectReports[prospect.id] && (
                    <button
                      type="button"
                      onClick={() => startProspectReport(prospect.id)}
                      disabled={pending}
                      className="w-fit rounded-full border border-ink-200 px-3 py-2 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("adminPortal.requestDetail.reportButton")}
                    </button>
                  )}
                </div>
                {prospectReports[prospect.id] && (
                  <div className="flex flex-col gap-2 border-t border-ink-100 pt-2">
                    <label
                      className="flex flex-col gap-1 text-xs font-medium text-ink-700"
                      htmlFor={`prospect-report-reason-${prospect.id}`}
                    >
                      {t("adminPortal.requestDetail.reportReasonLabel")}
                      <select
                        id={`prospect-report-reason-${prospect.id}`}
                        value={prospectReports[prospect.id].reason}
                        onChange={(e) => updateProspectReportField(prospect.id, "reason", e.target.value)}
                        className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                      >
                        <option value="">{t("adminPortal.requestDetail.selectReportReasonPlaceholder")}</option>
                        {REPORT_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {reportReasonLabel(r)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      className="flex flex-col gap-1 text-xs font-medium text-ink-700"
                      htmlFor={`prospect-report-details-${prospect.id}`}
                    >
                      {t("adminPortal.requestDetail.reportDetailsLabel")}
                      <input
                        id={`prospect-report-details-${prospect.id}`}
                        type="text"
                        value={prospectReports[prospect.id].details}
                        onChange={(e) => updateProspectReportField(prospect.id, "details", e.target.value)}
                        placeholder={t("adminPortal.requestDetail.reportDetailsPlaceholder")}
                        className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                      />
                    </label>
                    {prospectReports[prospect.id].error && (
                      <p className="text-xs text-blood-600">{prospectReports[prospect.id].error}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => confirmProspectReport(prospect.id)}
                        disabled={pending}
                        className="rounded-full bg-blood-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("adminPortal.requestDetail.reportConfirmButton")}
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelProspectReport(prospect.id)}
                        disabled={pending}
                        className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("adminPortal.requestDetail.reportCancelButton")}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display font-semibold text-ink-900">{t("adminPortal.requestDetail.timelineTitle")}</h2>
        <ol className="flex list-inside list-decimal flex-col gap-1 text-sm text-ink-700">
          {detail.timeline.map((event, index) => (
            <li key={index}>{event.description}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
