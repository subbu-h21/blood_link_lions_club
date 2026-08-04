"use client";

import { useState } from "react";
import { DAYS, type Day, type OpeningHours } from "@/lib/serialise/bank";
import type { BankSettings } from "@/lib/db/bank-portal";
import { saveBankSettingsAction } from "@/lib/actions/bank-settings";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const DEFAULT_OPEN_FROM = "09:00";
const DEFAULT_OPEN_TO = "17:00";

/**
 * B5 · Profile (PRD.md §8.1), wired to real data (Unit 12).
 * `initialSettings` comes from a server-side fetch of the acting
 * bank_staff's own blood_banks row. Not built on BankCard - that type is
 * deliberately public/search-facing and excludes policy_notes (Unit 07's
 * own comment); this form is the bank editing its own full row, via
 * lib/db/bank-portal.ts's BankSettings shape instead.
 */
export function BankSettingsForm({ initialSettings }: { initialSettings: BankSettings }) {
  const { t } = useTranslation();
  const [address, setAddress] = useState(initialSettings.address);
  const [phone, setPhone] = useState(initialSettings.phone);
  const [policyNotes, setPolicyNotes] = useState(initialSettings.policyNotes);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(initialSettings.openingHours);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: Day, isOpen: boolean) {
    setOpeningHours((prev) => {
      const next = { ...prev };
      if (isOpen) {
        next[day] = [DEFAULT_OPEN_FROM, DEFAULT_OPEN_TO];
      } else {
        delete next[day];
      }
      return next;
    });
  }

  function setDayTime(day: Day, index: 0 | 1, value: string) {
    setOpeningHours((prev) => {
      const current = prev[day] ?? [DEFAULT_OPEN_FROM, DEFAULT_OPEN_TO];
      const updated: [string, string] = index === 0 ? [value, current[1]] : [current[0], value];
      return { ...prev, [day]: updated };
    });
  }

  function markDirty() {
    setSaved(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveBankSettingsAction({ address, phone, policyNotes, openingHours });
      setSaved(true);
    } catch {
      setError(t("bankPortal.settings.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">{t("bankPortal.settings.title")}</h1>

      <div className="flex flex-col gap-5 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="bank-address">
            {t("bankPortal.settings.addressLabel")}
            <input
              id="bank-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                markDirty();
              }}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="bank-phone">
            {t("bankPortal.settings.phoneLabel")}
            <input
              id="bank-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                markDirty();
              }}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="bank-policy-notes">
          {t("bankPortal.settings.policyNotesLabel")}
          <textarea
            id="bank-policy-notes"
            value={policyNotes}
            onChange={(e) => {
              setPolicyNotes(e.target.value);
              markDirty();
            }}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            rows={3}
          />
        </label>

        <fieldset className="flex flex-col gap-2 border-t border-ink-100 pt-4">
          <legend className="font-display font-semibold text-ink-900">{t("bankPortal.settings.openingHoursTitle")}</legend>
          {DAYS.map((day) => {
            const hours = openingHours[day];
            const isOpen = Boolean(hours);
            return (
              <div key={day} className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
                <label className="flex w-32 items-center gap-1.5" htmlFor={`day-open-${day}`}>
                  <input
                    id={`day-open-${day}`}
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => {
                      toggleDay(day, e.target.checked);
                      markDirty();
                    }}
                    className="accent-blood-600"
                  />
                  {t(`bankPortal.settings.days.${day}`)}
                </label>
                {isOpen ? (
                  <>
                    <span>{t("bankPortal.settings.openFromLabel")}</span>
                    <input
                      type="time"
                      value={hours![0]}
                      onChange={(e) => {
                        setDayTime(day, 0, e.target.value);
                        markDirty();
                      }}
                      className="rounded-lg border border-ink-200 px-2 py-1 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                    />
                    <span>{t("bankPortal.settings.openToLabel")}</span>
                    <input
                      type="time"
                      value={hours![1]}
                      onChange={(e) => {
                        setDayTime(day, 1, e.target.value);
                        markDirty();
                      }}
                      className="rounded-lg border border-ink-200 px-2 py-1 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                    />
                  </>
                ) : (
                  <span className="text-ink-500">{t("bankPortal.settings.closedLabel")}</span>
                )}
              </div>
            );
          })}
        </fieldset>

        <div className="flex items-center gap-3 border-t border-ink-100 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("bankPortal.settings.saveButton")}
          </button>
          {saved && <p className="text-sm text-banyan-700">{t("bankPortal.settings.savedMessage")}</p>}
          {error && <p className="text-sm text-blood-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
