"use client";

import { useState } from "react";
import { CLOSE_REASONS, type CloseReason } from "@/lib/serialise/close-reason";
import type { RequestStage } from "@/lib/serialise/stage";
import type { RequestStatusView as RequestStatusData } from "@/lib/db/requests";
import { cancelRequestAction, confirmStillNeededAction } from "@/lib/actions/request-status";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

type Step = "status" | "confirm-cancel" | "cancelled";

const CLOSED_STAGES: RequestStage[] = ["resolved", "closed"];

/**
 * S5 · Request status (PRD.md §6.1), real data (Unit 30). `initialView`
 * comes from a server-side read (app/(public)/request/[id]/page.tsx
 * calling loadRequestStatus) keyed only on the URL's request id - no
 * session backs this screen (see lib/db/requests.ts's getRequestStatus
 * doc comment for why that's a deliberate, confirmed decision, not an
 * oversight). `not_found` covers both a genuinely nonexistent id and any
 * other lookup failure - there's nothing else to distinguish it from
 * here, since there's no "wrong owner" concept without a session to check
 * against. No donor phone field exists anywhere in this shape (CLAUDE.md
 * rule 3) - `adminPhone` is the admin's own staff contact number.
 */
export function RequestStatusView({
  requestId,
  initialView,
}: {
  requestId: string;
  initialView: RequestStatusData;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("status");
  const [reason, setReason] = useState<CloseReason | "">("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [idlePrompted, setIdlePrompted] = useState(
    initialView.status === "found" ? initialView.idlePrompted : false,
  );
  const [stillNeededPending, setStillNeededPending] = useState(false);
  const [stillNeededError, setStillNeededError] = useState<string | null>(null);

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

  async function confirmCancel() {
    if (!reason) {
      setReasonError(t("search.s5.invalidReason"));
      return;
    }
    setReasonError(null);
    setCancelError(null);
    setPending(true);
    try {
      const result = await cancelRequestAction(requestId, reason);
      setPending(false);
      if (!result.ok) {
        setCancelError(t("search.s5.cancelError"));
        return;
      }
      setStep("cancelled");
    } catch {
      setPending(false);
      setCancelError(t("search.s5.cancelError"));
    }
  }

  async function confirmStillNeededClick() {
    setStillNeededError(null);
    setStillNeededPending(true);
    try {
      const result = await confirmStillNeededAction(requestId);
      setStillNeededPending(false);
      if (!result.ok) {
        setStillNeededError(t("search.s5.stillNeededError"));
        return;
      }
      setIdlePrompted(false);
    } catch {
      setStillNeededPending(false);
      setStillNeededError(t("search.s5.stillNeededError"));
    }
  }

  if (initialView.status === "not_found") {
    return (
      <div className="flex max-w-sm flex-col gap-2 p-6">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s5.notFoundTitle")}</h1>
        <p className="text-ink-500">{t("search.s5.notFoundMessage")}</p>
      </div>
    );
  }

  if (step === "cancelled") {
    return (
      <div className="flex max-w-sm flex-col gap-2 p-6">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s5.cancelledTitle")}</h1>
        <p className="text-ink-500">{t("search.s5.cancelledMessage")}</p>
      </div>
    );
  }

  if (step === "confirm-cancel") {
    return (
      <div className="flex max-w-sm flex-col gap-4 p-6">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s5.cancelButton")}</h1>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="cancel-reason">
          {t("search.s5.cancelReasonLabel")}
          <select
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as CloseReason)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          >
            <option value="">{t("search.s5.selectReasonPlaceholder")}</option>
            {CLOSE_REASONS.map((r) => (
              <option key={r} value={r}>
                {reasonLabel(r)}
              </option>
            ))}
          </select>
        </label>
        {reasonError && <p className="text-sm text-blood-600">{reasonError}</p>}
        {cancelError && <p className="text-sm text-blood-600">{cancelError}</p>}
        <button
          type="button"
          onClick={confirmCancel}
          disabled={pending}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("search.s5.cancelConfirmButton")}
        </button>
        <button
          type="button"
          onClick={() => setStep("status")}
          disabled={pending}
          className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("search.s5.cancelBackButton")}
        </button>
      </div>
    );
  }

  const view = initialView;
  const canCancel = !CLOSED_STAGES.includes(view.stage);

  return (
    <div className="flex max-w-sm flex-col gap-4 p-6">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s5.title")}</h1>

      {idlePrompted && canCancel && (
        <div className="flex flex-col gap-2 rounded-2xl border border-soil-600 bg-soil-100 p-4 text-sm text-soil-700">
          <p>{t("search.s5.idlePromptMessage")}</p>
          {stillNeededError && <p className="text-blood-600">{stillNeededError}</p>}
          <button
            type="button"
            onClick={confirmStillNeededClick}
            disabled={stillNeededPending}
            className="w-fit rounded-full bg-blood-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("search.s5.stillNeededButton")}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]">
        <p>
          <span className="text-ink-500">{t("search.s5.stageLabel")}: </span>
          {stageLabel(view.stage)}
        </p>
        <p>
          <span className="text-ink-500">{t("search.s4.bloodGroupLabel")}: </span>
          {view.bloodGroup}
        </p>
        <p>
          <span className="text-ink-500">{t("search.s4.unitsLabel")}: </span>
          {view.unitsNeeded}
        </p>
        <p>
          <span className="text-ink-500">{t("search.s5.notifiedCountLabel")}: </span>
          {view.notifiedCount}
        </p>
        <p>
          <span className="text-ink-500">{t("search.s5.acceptedCountLabel")}: </span>
          {view.acceptedCount}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]">
        <p className="text-ink-500">{t("search.s5.adminLabel")}</p>
        {view.adminName ? (
          <>
            <p className="text-ink-900">{view.adminName}</p>
            {view.adminPhone && (
              <a
                href={`tel:${view.adminPhone}`}
                className="w-fit rounded-full bg-blood-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
              >
                {t("search.s5.contactAdminButton")}
              </a>
            )}
          </>
        ) : (
          <p className="text-ink-900">{t("search.s5.noAdminYetMessage")}</p>
        )}
      </div>

      {canCancel && (
        <button
          type="button"
          onClick={() => setStep("confirm-cancel")}
          className="rounded-full border border-blood-600 px-5 py-2.5 text-sm font-semibold text-blood-600 transition hover:bg-blood-50"
        >
          {t("search.s5.cancelButton")}
        </button>
      )}
    </div>
  );
}
