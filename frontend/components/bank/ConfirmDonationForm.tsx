"use client";

import { useState } from "react";
import Link from "next/link";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import { confirmDonationAction } from "@/lib/actions/bank-prospects";
import type { ConfirmDonationDetail } from "@/lib/db/bank-prospects";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

/**
 * B4 · Confirm donation (PRD.md §8.1), real data (Unit 28) - "confirms or
 * corrects the donor's blood group... the only trusted path" for
 * `group_verified_at`/`last_donation_at`/`eligible_from` (CLAUDE.md rule
 * 5). `initialDetail` comes from a server-side, bank-scoped read
 * (app/bank/(portal)/prospects/[id]/confirm/page.tsx calling
 * loadConfirmDonationDetail) - null covers a wrong bank, a nonexistent id,
 * and a prospect that isn't currently `screening`, all collapsed into the
 * same "not found" state (same opaque-on-purpose shape as D3's
 * already_handled), not distinguished from each other.
 */
export function ConfirmDonationForm({
  prospectId,
  initialDetail,
}: {
  prospectId: string;
  initialDetail: ConfirmDonationDetail | null;
}) {
  const { t } = useTranslation();
  const [confirmedGroup, setConfirmedGroup] = useState<BloodGroup>(
    initialDetail?.claimedBloodGroup ?? BLOOD_GROUPS[0],
  );
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedDonorName, setConfirmedDonorName] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!initialDetail) {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <Link href="/bank/prospects" className="text-sm font-medium text-blood-600 underline">
          {t("bankPortal.confirm.backToProspectsLink")}
        </Link>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankPortal.confirm.confirmedTitle")}</h1>
        <p className="text-ink-500">{t("bankPortal.confirm.confirmedMessage").replace("{name}", confirmedDonorName)}</p>
        <Link href="/bank/prospects" className="w-fit text-sm font-medium text-blood-600 underline">
          {t("bankPortal.confirm.backToProspectsLink")}
        </Link>
      </div>
    );
  }

  async function confirmDonation() {
    setSubmitError(null);
    setPending(true);
    try {
      const result = await confirmDonationAction(prospectId, confirmedGroup);
      setPending(false);
      if (!result.ok) {
        setSubmitError(t("bankPortal.confirm.confirmError"));
        return;
      }
      setConfirmedDonorName(result.donorName);
      setConfirmed(true);
    } catch {
      setPending(false);
      setSubmitError(t("bankPortal.confirm.confirmError"));
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankPortal.confirm.title")}</h1>

      <div className="flex flex-col gap-1.5 rounded-2xl bg-sand-100 p-4 text-sm">
        <p>
          <span className="text-ink-500">{t("bankPortal.confirm.donorLabel")}: </span>
          {initialDetail.donorName}
        </p>
        <p>
          <span className="text-ink-500">{t("bankPortal.confirm.claimedGroupLabel")}: </span>
          {initialDetail.claimedBloodGroup}
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="confirmed-group">
        {t("bankPortal.confirm.confirmedGroupLabel")}
        <select
          id="confirmed-group"
          value={confirmedGroup}
          onChange={(e) => setConfirmedGroup(e.target.value as BloodGroup)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          {BLOOD_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </label>

      {submitError && <p className="text-sm text-blood-600">{submitError}</p>}

      <button
        type="button"
        onClick={confirmDonation}
        disabled={pending}
        className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("bankPortal.confirm.confirmButton")}
      </button>

      <Link href="/bank/prospects" className="w-fit text-sm font-medium text-blood-600 underline">
        {t("bankPortal.confirm.backToProspectsLink")}
      </Link>
    </div>
  );
}
