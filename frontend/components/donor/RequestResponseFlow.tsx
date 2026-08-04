"use client";

import { useState } from "react";
import { acceptProspectAction, declineProspectAction } from "@/lib/actions/prospect-response";
import type { RequestView } from "@/lib/db/prospects";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const PAUSE_DAY_OPTIONS = [3, 7, 14, 30];

type Outcome = "pending" | "accepted" | "not_now" | "paused" | "already_handled" | "already_pledged";

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * D3 · Request detail (PRD.md §7.1), real data (Unit 24). `initialView`
 * comes from a server-side, session-scoped read
 * (app/donor/(portal)/request/[id]/page.tsx calling
 * loadDonorRequestView) - never fetched client-side, and never trusts a
 * client-supplied donor id (CLAUDE.md rule 2).
 *
 * "I can donate" turns a real `prospects.status` transition to
 * `accepted`, enforced against `one_active_pledge_per_donor`
 * (`already_pledged` below is that index's rejection, not a pre-check -
 * see lib/db/prospects.ts's acceptProspect). "Not now"/"Not for a while"
 * deliberately do not change prospects.status - see that same file's
 * declineProspect for why `rejected`/`stood_down` don't fit a donor's own
 * decline. Unit 23's `MOCK_REQUEST` and `already-handled` sentinel are
 * both gone entirely, not adapted - the real "already handled" case is
 * driven by getDonorRequestView's own read of the prospect/request
 * state.
 */
export function RequestResponseFlow({
  requestId,
  initialView,
}: {
  requestId: string;
  initialView: RequestView;
}) {
  const { t } = useTranslation();
  const [outcome, setOutcome] = useState<Outcome>(
    initialView.status === "already_handled" ? "already_handled" : "pending",
  );
  const [pauseDays, setPauseDays] = useState(PAUSE_DAY_OPTIONS[0]);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [acceptedBank, setAcceptedBank] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function accept() {
    setSubmitError(null);
    setPending(true);
    try {
      const result = await acceptProspectAction(requestId);
      setPending(false);
      if (!result.ok) {
        setOutcome(result.reason === "already_pledged" ? "already_pledged" : "already_handled");
        return;
      }
      setAcceptedBank(result.destinationBank);
      setOutcome("accepted");
    } catch {
      setPending(false);
      setSubmitError(t("donorPortal.request.submitError"));
    }
  }

  async function notNow() {
    setSubmitError(null);
    setPending(true);
    try {
      await declineProspectAction(requestId);
      setPending(false);
      setOutcome("not_now");
    } catch {
      setPending(false);
      setSubmitError(t("donorPortal.request.submitError"));
    }
  }

  async function confirmPause() {
    setSubmitError(null);
    setPending(true);
    try {
      await declineProspectAction(requestId, pauseDays);
      setPending(false);
      setPausedUntil(futureDate(pauseDays));
      setOutcome("paused");
    } catch {
      setPending(false);
      setSubmitError(t("donorPortal.request.submitError"));
    }
  }

  if (outcome === "already_handled") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.request.alreadyHandledTitle")}</h1>
        <p className="text-ink-500">{t("donorPortal.request.alreadyHandledMessage")}</p>
      </div>
    );
  }

  if (outcome === "already_pledged") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.request.alreadyPledgedTitle")}</h1>
        <p className="text-ink-500">{t("donorPortal.request.alreadyPledgedMessage")}</p>
      </div>
    );
  }

  if (outcome === "accepted") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-banyan-600 bg-banyan-100 p-6">
        <h1 className="font-display text-lg font-semibold text-banyan-700">{t("donorPortal.request.acceptedTitle")}</h1>
        <p className="text-banyan-700">{t("donorPortal.request.acceptedMessage").replace("{bank}", acceptedBank)}</p>
      </div>
    );
  }

  if (outcome === "not_now") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.request.notNowTitle")}</h1>
        <p className="text-ink-500">{t("donorPortal.request.notNowMessage")}</p>
      </div>
    );
  }

  if (outcome === "paused") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.request.pausedTitle")}</h1>
        <p className="text-ink-500">{t("donorPortal.request.pausedMessage").replace("{date}", pausedUntil ?? "")}</p>
      </div>
    );
  }

  // outcome === "pending" only ever reaches here when initialView.status
  // === "live" (the already_handled initial state short-circuits above).
  const view = initialView as Extract<RequestView, { status: "live" }>;

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.request.title")}</h1>

      <div className="flex flex-col gap-1.5 rounded-2xl bg-sand-100 p-4 text-sm">
        <p>
          <span className="text-ink-500">{t("donorPortal.request.bloodGroupLabel")}: </span>
          {view.bloodGroup}
        </p>
        <p>
          <span className="text-ink-500">{t("donorPortal.request.destinationBankLabel")}: </span>
          {view.destinationBank}
        </p>
        <p>
          <span className="text-ink-500">{t("donorPortal.request.urgencyLabel")}: </span>
          {view.urgency === "emergency"
            ? t("donorPortal.request.urgencyEmergency")
            : t("donorPortal.request.urgencyNormal")}
        </p>
        <p>
          <span className="text-ink-500">{t("donorPortal.request.regionLabel")}: </span>
          {view.region}
        </p>
      </div>

      {submitError && <p className="text-sm text-blood-600">{submitError}</p>}

      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("donorPortal.request.canDonateButton")}
      </button>
      <button
        type="button"
        onClick={notNow}
        disabled={pending}
        className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("donorPortal.request.notNowButton")}
      </button>

      <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 p-3">
        <span className="text-sm font-medium text-ink-700">{t("donorPortal.request.notForAWhileButton")}</span>
        <label className="flex items-center gap-2 text-sm text-ink-700" htmlFor="pause-days">
          {t("donorPortal.request.pauseDaysLabel")}
          <select
            id="pause-days"
            value={pauseDays}
            onChange={(e) => setPauseDays(Number(e.target.value))}
            className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          >
            {PAUSE_DAY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {t("donorPortal.request.pauseDaysOption").replace("{days}", String(days))}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={confirmPause}
          disabled={pending}
          className="w-fit rounded-full border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("donorPortal.request.confirmPauseButton")}
        </button>
      </div>
    </div>
  );
}
