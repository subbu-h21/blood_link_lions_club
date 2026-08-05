"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import type { DonorSettingsState } from "@/lib/db/donor-portal";
import {
  updateDonorProfileAction,
  deleteDonorAccountAction,
  addAvailabilityPincodeAction,
  removeAvailabilityPincodeAction,
} from "@/lib/actions/donor-settings";
import type { AvailabilityPincode } from "@/lib/db/donors";
import {
  setAvailabilityAction,
  pauseAvailabilityAction,
  resumeAvailabilityAction,
} from "@/lib/actions/donor-portal";

const PIN_PATTERN = /^\d{6}$/;
const PAUSE_DAY_OPTIONS = [3, 7, 14, 30];

type Step = "settings" | "confirmDelete" | "deleted";

/**
 * D6 · Settings (PRD.md §7.1), real data (Unit 52). `initialSettings`
 * comes from a server-side read (app/donor/(portal)/settings/page.tsx
 * calling loadDonorSettings) - never fetched client-side.
 *
 * The pause-notifications control reuses D2's own real server actions
 * verbatim (`setAvailabilityAction`/`pauseAvailabilityAction`/
 * `resumeAvailabilityAction`, all from Unit 24), per Unit 51's own README
 * flag - not a second implementation of the identical
 * is_available/paused_until mechanism.
 *
 * Account deletion calls `deleteDonorAccountAction` (Unit 52,
 * `lib/db/donors.ts`'s `deleteDonorAccount`) - a real, working action:
 * stands down any active pledge via `cancelPledge` (Unit 26), marks the
 * donor deleted, and resets the session's own role to `searcher`.
 * `refreshSession()` afterward is not optional - the same staleness
 * gotcha already documented for Unit 09/20's own role-changing writes:
 * without it, the JWT's `profile_role` claim would still read `donor`
 * until its natural refresh, and `lib/supabase/proxy.ts`'s gate would
 * keep letting this now-deleted session back into `/donor/*` as if
 * nothing happened.
 */
export function DonorSettingsView({ initialSettings }: { initialSettings: DonorSettingsState }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("settings");

  const [fullName, setFullName] = useState(initialSettings.fullName);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(initialSettings.bloodGroup);
  const [pincode, setPincode] = useState(initialSettings.pincode);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const [isAvailable, setIsAvailable] = useState(initialSettings.isAvailable);
  const [pausedUntil, setPausedUntil] = useState(initialSettings.pausedUntil);
  const [pauseDays, setPauseDays] = useState(PAUSE_DAY_OPTIONS[0]);
  const [pausePending, setPausePending] = useState(false);

  const [deletePending, setDeletePending] = useState(false);

  const [availabilityPincodes, setAvailabilityPincodes] = useState<AvailabilityPincode[]>(
    initialSettings.availabilityPincodes,
  );
  const [newPincode, setNewPincode] = useState("");
  const [newPincodeError, setNewPincodeError] = useState<string | null>(null);
  const [addPincodePending, setAddPincodePending] = useState(false);
  const [removePincodePending, setRemovePincodePending] = useState<Record<string, boolean>>({});

  function formatDate(iso: string): string {
    return iso.slice(0, 10);
  }

  async function saveEdits() {
    const validName = fullName.trim().length > 0;
    setFullNameError(validName ? null : t("donorPortal.settings.invalidFullName"));
    const validPin = PIN_PATTERN.test(pincode);
    setPincodeError(validPin ? null : t("donorPortal.settings.invalidPin"));
    if (!validName || !validPin) return;

    setSavePending(true);
    const result = await updateDonorProfileAction({ fullName: fullName.trim(), bloodGroup, pincode });
    setSavePending(false);
    if (!result.ok) {
      setPincodeError(t("donorPortal.settings.pinNotFound"));
      return;
    }
    setSaved(true);
  }

  async function toggleAvailability(next: boolean) {
    setIsAvailable(next);
    setPausePending(true);
    await setAvailabilityAction(next);
    setPausePending(false);
  }

  async function pause() {
    setPausePending(true);
    await pauseAvailabilityAction(pauseDays);
    setPausedUntil(new Date(Date.now() + pauseDays * 24 * 60 * 60 * 1000).toISOString());
    setPausePending(false);
  }

  async function resume() {
    setPausePending(true);
    await resumeAvailabilityAction();
    setPausedUntil(null);
    setPausePending(false);
  }

  // Server messages mapped to real translated strings rather than shown
  // raw - this screen is not exempt from CLAUDE.md rule 8 the way
  // /ops-control's own English-only components are.
  function translateAvailabilityError(message: string): string {
    if (message === "PIN code not found.") return t("donorPortal.settings.pinNotFound");
    if (message === "That's already your home PIN code.") return t("donorPortal.settings.sameAsHomeMessage");
    if (message.startsWith("You can list up to")) return t("donorPortal.settings.atCapMessage");
    if (message === "That PIN code is already on your list.") return t("donorPortal.settings.duplicatePincodeMessage");
    return t("donorPortal.settings.pinNotFound");
  }

  async function addPincode() {
    if (!PIN_PATTERN.test(newPincode)) {
      setNewPincodeError(t("donorPortal.settings.invalidPin"));
      return;
    }
    setNewPincodeError(null);
    setAddPincodePending(true);
    const result = await addAvailabilityPincodeAction(newPincode);
    setAddPincodePending(false);
    if (!result.ok) {
      setNewPincodeError(translateAvailabilityError(result.error));
      return;
    }
    setAvailabilityPincodes((prev) => [...prev, { pincode: newPincode, regionName: result.regionName }]);
    setNewPincode("");
  }

  async function removePincode(pincode: string) {
    setRemovePincodePending((prev) => ({ ...prev, [pincode]: true }));
    await removeAvailabilityPincodeAction(pincode);
    setAvailabilityPincodes((prev) => prev.filter((p) => p.pincode !== pincode));
    setRemovePincodePending((prev) => ({ ...prev, [pincode]: false }));
  }

  async function confirmDelete() {
    setDeletePending(true);
    await deleteDonorAccountAction();
    const supabase = createClient();
    await supabase.auth.refreshSession();
    setDeletePending(false);
    setStep("deleted");
  }

  const paused = pausedUntil !== null && new Date(pausedUntil) > new Date();

  if (step === "deleted") {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.settings.deletedTitle")}</h1>
        <p className="text-ink-500">{t("donorPortal.settings.deletedMessage")}</p>
      </div>
    );
  }

  if (step === "confirmDelete") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-blood-600 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorPortal.settings.deleteConfirmTitle")}</h1>
        <p className="text-sm text-ink-700">
          {initialSettings.hasActivePledge
            ? t("donorPortal.settings.deleteConfirmMessageWithPledge")
            : t("donorPortal.settings.deleteConfirmMessage")}
        </p>
        <button
          type="button"
          onClick={confirmDelete}
          disabled={deletePending}
          className="w-fit rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("donorPortal.settings.deleteConfirmButton")}
        </button>
        <button
          type="button"
          onClick={() => setStep("settings")}
          disabled={deletePending}
          className="w-fit rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("donorPortal.settings.deleteBackButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">{t("donorPortal.settings.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
      <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display font-semibold text-ink-900">{t("donorPortal.settings.editSectionTitle")}</h2>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="full-name">
          {t("donorPortal.settings.fullNameLabel")}
          <input
            id="full-name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {fullNameError && <p className="text-sm text-blood-600">{fullNameError}</p>}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="blood-group">
          {t("donorPortal.settings.bloodGroupLabel")}
          <select
            id="blood-group"
            value={bloodGroup}
            onChange={(e) => {
              setBloodGroup(e.target.value as BloodGroup);
              setSaved(false);
            }}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          >
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="pin">
          {t("donorPortal.settings.pinLabel")}
          <input
            id="pin"
            type="text"
            inputMode="numeric"
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setSaved(false);
            }}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {pincodeError && <p className="text-sm text-blood-600">{pincodeError}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveEdits}
            disabled={savePending}
            className="w-fit rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("donorPortal.settings.saveButton")}
          </button>
          {saved && <span className="text-sm text-banyan-700">{t("donorPortal.settings.savedMessage")}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display font-semibold text-ink-900">{t("donorPortal.home.pauseControlLabel")}</h2>
        <label className="flex items-center gap-2 text-ink-700" htmlFor="availability-toggle">
          <input
            id="availability-toggle"
            type="checkbox"
            checked={isAvailable}
            disabled={pausePending}
            onChange={(e) => toggleAvailability(e.target.checked)}
            className="accent-blood-600"
          />
          {t("donorPortal.home.availabilityToggleLabel")}
        </label>
        {paused ? (
          <>
            <p className="text-sm text-ink-500">
              {t("donorPortal.home.pausedMessage").replace("{date}", formatDate(pausedUntil!))}
            </p>
            <button
              type="button"
              onClick={resume}
              disabled={pausePending}
              className="w-fit text-sm font-medium text-blood-600 underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("donorPortal.home.resumeButton")}
            </button>
          </>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-ink-700" htmlFor="pause-days">
              {t("donorPortal.home.pauseDaysLabel")}
              <select
                id="pause-days"
                value={pauseDays}
                onChange={(e) => setPauseDays(Number(e.target.value))}
                className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
              >
                {PAUSE_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {t("donorPortal.home.pauseDaysOption").replace("{days}", String(days))}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={pause}
              disabled={pausePending}
              className="w-fit rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("donorPortal.home.pauseButton")}
            </button>
          </>
        )}
      </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display font-semibold text-ink-900">{t("donorPortal.settings.availabilityPincodesTitle")}</h2>
        <p className="text-sm text-ink-500">{t("donorPortal.settings.availabilityPincodesIntro")}</p>

        {availabilityPincodes.length === 0 ? (
          <p className="text-sm text-ink-500">{t("donorPortal.settings.noAvailabilityPincodes")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {availabilityPincodes.map((entry) => (
              <li
                key={entry.pincode}
                className="flex items-center justify-between gap-2 rounded-xl border border-ink-100 px-3 py-2 text-sm"
              >
                <span className="text-ink-900">
                  {entry.pincode} <span className="text-ink-500">— {entry.regionName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removePincode(entry.pincode)}
                  disabled={removePincodePending[entry.pincode]}
                  className="text-sm font-medium text-blood-600 underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("donorPortal.settings.removeAvailabilityPincodeButton")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-ink-500">
          {t("donorPortal.settings.availabilityPincodeCountLabel")
            .replace("{count}", String(availabilityPincodes.length))
            .replace("{max}", String(initialSettings.availabilityPincodeMax))}
        </p>

        {availabilityPincodes.length < initialSettings.availabilityPincodeMax && (
          <div className="flex items-center gap-2">
            <input
              id="new-availability-pincode"
              type="text"
              inputMode="numeric"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("donorPortal.settings.addAvailabilityPincodePlaceholder")}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
            <button
              type="button"
              onClick={addPincode}
              disabled={addPincodePending}
              className="w-fit rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("donorPortal.settings.addAvailabilityPincodeButton")}
            </button>
          </div>
        )}
        {newPincodeError && <p className="text-sm text-blood-600">{newPincodeError}</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-blood-600 bg-blood-50 p-4">
        <h2 className="font-display font-semibold text-blood-600">{t("donorPortal.settings.deleteSectionTitle")}</h2>
        <p className="text-sm text-ink-700">{t("donorPortal.settings.deleteIntro")}</p>
        <button
          type="button"
          onClick={() => setStep("confirmDelete")}
          className="w-fit rounded-full border border-blood-600 px-3 py-2 text-sm font-semibold text-blood-600 transition hover:bg-blood-100"
        >
          {t("donorPortal.settings.deleteButton")}
        </button>
      </div>
    </div>
  );
}
