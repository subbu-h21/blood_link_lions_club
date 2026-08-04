"use client";

import { useState } from "react";
import { cancelPledgeAction } from "@/lib/actions/prospect-response";
import type { PledgeDetail } from "@/lib/db/prospects";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

type Step = "pledge" | "confirm-cancel" | "cancelled";

/**
 * D4 · Active pledge (PRD.md §7.1), real data (Unit 26). `initialPledge`
 * comes from a server-side, session-scoped read
 * (app/donor/(portal)/pledge/page.tsx calling loadActivePledge) - never
 * fetched client-side. `null` is a real, expected state (no active
 * pledge), not an error - Unit 25's mock always assumed one existed;
 * this doesn't. `adminName`/`adminPhone` are null-safe throughout (admin
 * assignment is M4's job, this unit's own scope limit) - `scheduleNote`
 * replaces Unit 25's mock "time window" field entirely rather than
 * inventing fake schedule data, since no real appointment-time column
 * exists yet (flagged in prompts/README.md for whoever eventually builds
 * real admin scheduling).
 */
export function PledgeView({ initialPledge }: { initialPledge: PledgeDetail | null }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("pledge");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmCancel() {
    setError(null);
    setPending(true);
    try {
      const result = await cancelPledgeAction();
      setPending(false);
      if (!result.ok) {
        // no_active_pledge only happens on a genuine race (cancelled
        // from another tab/device between page load and this click) -
        // the cancelled confirmation is still the correct outcome either
        // way, since the end state (no active pledge) is the same.
        setStep("cancelled");
        return;
      }
      setStep("cancelled");
    } catch {
      setPending(false);
      setError(t("donorPortal.pledge.cancelError"));
    }
  }

  if (!initialPledge) {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.pledge.noActivePledgeTitle")}</h1>
        <p className="text-ink-500">{t("donorPortal.pledge.noActivePledgeMessage")}</p>
      </div>
    );
  }

  if (step === "cancelled") {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.pledge.cancelledTitle")}</h1>
        <p className="text-ink-500">{t("donorPortal.pledge.cancelledMessage")}</p>
      </div>
    );
  }

  if (step === "confirm-cancel") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.pledge.cancelConfirmTitle")}</h1>
        <p className="text-sm text-ink-500">{t("donorPortal.pledge.cancelConfirmMessage")}</p>
        {error && <p className="text-sm text-blood-600">{error}</p>}
        <button
          type="button"
          onClick={confirmCancel}
          disabled={pending}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("donorPortal.pledge.cancelConfirmButton")}
        </button>
        <button
          type="button"
          onClick={() => setStep("pledge")}
          disabled={pending}
          className="rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("donorPortal.pledge.cancelBackButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-ink-900">{t("donorPortal.pledge.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <div className="flex flex-col gap-1.5 rounded-2xl border border-ink-100 bg-white p-5 text-sm shadow-[var(--shadow-soft)]">
          <p>
            <span className="text-ink-500">{t("donorPortal.pledge.destinationBankLabel")}: </span>
            {initialPledge.destinationBank}
          </p>
          <p>
            <span className="text-ink-500">{t("donorPortal.pledge.addressLabel")}: </span>
            {initialPledge.bankAddress}
          </p>
          <p>
            <span className="text-ink-500">{t("donorPortal.pledge.phoneLabel")}: </span>
            <a href={`tel:${initialPledge.bankPhone}`} className="font-medium text-blood-600 underline">
              {initialPledge.bankPhone}
            </a>
          </p>
          <p className="text-ink-500">{t("donorPortal.pledge.scheduleNote")}</p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-ink-100 bg-white p-5 text-sm shadow-[var(--shadow-soft)]">
          <p className="text-ink-500">{t("donorPortal.pledge.adminLabel")}</p>
          {initialPledge.adminName ? (
            <>
              <p className="text-ink-900">{initialPledge.adminName}</p>
              {initialPledge.adminPhone && (
                <a href={`tel:${initialPledge.adminPhone}`} className="w-fit font-medium text-blood-600 underline">
                  {initialPledge.adminPhone}
                </a>
              )}
            </>
          ) : (
            <p className="text-ink-900">{t("donorPortal.pledge.noAdminYetMessage")}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setStep("confirm-cancel")}
        className="rounded-full border border-blood-600 px-5 py-2.5 text-sm font-semibold text-blood-600 transition hover:bg-blood-50"
      >
        {t("donorPortal.pledge.cancelButton")}
      </button>
    </div>
  );
}
