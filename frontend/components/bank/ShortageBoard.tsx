"use client";

import { useState } from "react";
import type { Shortage } from "@/lib/serialise/shortage";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import { postBankShortage, resolveBankShortageAction } from "@/lib/actions/bank-shortages";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

/**
 * B2 · Post shortage (PRD.md §8.1), wired to real data (Unit 12).
 * `initialShortages` comes from a server-side fetch scoped to the acting
 * bank_staff's own bank. Posting only creates the bank_shortages row -
 * no notification exists until the matching engine (M3), same scope
 * limit as Unit 11.
 */
export function ShortageBoard({ initialShortages }: { initialShortages: Shortage[] }) {
  const { t } = useTranslation();
  const [shortages, setShortages] = useState<Shortage[]>(initialShortages);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(BLOOD_GROUPS[0]);
  const [unitsNeeded, setUnitsNeeded] = useState("");
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  async function postShortage() {
    const units = Number(unitsNeeded);
    if (!Number.isInteger(units) || units <= 0) {
      setUnitsError(t("bankPortal.shortage.invalidUnits"));
      return;
    }
    setUnitsError(null);
    setPosting(true);
    try {
      const created = await postBankShortage(bloodGroup, units);
      setShortages((prev) => [created, ...prev]);
      setUnitsNeeded("");
    } catch {
      setUnitsError(t("bankPortal.shortage.postError"));
    } finally {
      setPosting(false);
    }
  }

  async function resolveShortage(id: string) {
    setResolvingId(id);
    setResolveError(null);
    try {
      await resolveBankShortageAction(id);
      setShortages((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setResolveError(t("bankPortal.shortage.resolveError"));
    } finally {
      setResolvingId(null);
    }
  }

  const active = shortages.filter((s) => s.isActive);

  return (
    <div className="grid max-w-3xl gap-6 sm:grid-cols-2 sm:items-start">
      <div className="flex w-full flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankPortal.shortage.title")}</h1>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="shortage-group">
          {t("bankPortal.shortage.groupLabel")}
          <select
            id="shortage-group"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          >
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="shortage-units">
          {t("bankPortal.shortage.unitsNeededLabel")}
          <input
            id="shortage-units"
            type="number"
            min={1}
            value={unitsNeeded}
            onChange={(e) => setUnitsNeeded(e.target.value)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {unitsError && <p className="text-sm text-blood-600">{unitsError}</p>}
        <button
          type="button"
          onClick={postShortage}
          disabled={posting}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("bankPortal.shortage.postButton")}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display font-semibold text-ink-900">{t("bankPortal.shortage.activeListTitle")}</h2>
        {resolveError && <p className="text-sm text-blood-600">{resolveError}</p>}
        {active.length === 0 ? (
          <p className="text-sm text-ink-500">{t("bankPortal.shortage.noActiveShortages")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-sm shadow-[var(--shadow-soft)]"
              >
                <span className="text-ink-900">
                  {t("bankPortal.shortage.unitsNeededSummary")
                    .replace("{units}", String(s.unitsNeeded))
                    .replace("{group}", s.bloodGroup)}
                </span>
                <button
                  type="button"
                  onClick={() => resolveShortage(s.id)}
                  disabled={resolvingId === s.id}
                  className="font-medium text-blood-600 underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("bankPortal.shortage.resolveButton")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
