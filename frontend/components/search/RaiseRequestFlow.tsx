"use client";

import { useState } from "react";
import Link from "next/link";
import { PhoneOtpFlow } from "@/components/auth/PhoneOtpFlow";
import { RequestStatusView } from "@/components/search/RequestStatusView";
import { SignOutButton } from "@/components/search/SignOutButton";
import {
  checkOpenRequestAction,
  raiseRequestAction,
  resolveBanksForRaiseRequestAction,
} from "@/lib/actions/raise-request";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import { URGENCY_LEVELS, type Urgency } from "@/lib/serialise/urgency";
import type { BankOption } from "@/lib/db/blood-banks";
import type { RequestStatusView as RequestStatusData } from "@/lib/db/requests";
import type { PincodeOption } from "@/lib/db/pincodes";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const COMPONENT = "whole_blood";
const MIN_UNITS = 1;
const MAX_UNITS = 10;

type Step = "otp" | "existing" | "location" | "form" | "submitted";

/**
 * S4 raise-request (PRD.md §6.1) - restructured 2026-08-04 into a fully
 * standalone entry point, per the project owner's own explicit request:
 * previously this only worked as a hand-off from search
 * (app/(public)/request/new/page.tsx read `regionId`/`bloodGroup` from
 * the URL, a dead end on a direct/bookmarked visit), and a phone number
 * with an existing open request just saw a dead-end sentence with no way
 * to see what was actually happening with it - both fixed here.
 *
 * `pincodeOptions` (S1's own datalist source, lib/db/pincodes.ts) is now
 * this component's only server-supplied prop - it resolves its own
 * region/bank list itself (the new "location" step,
 * resolveBanksForRaiseRequestAction), the same way S1's own SearchForm
 * resolves a pincode on blur, rather than trusting a caller to supply a
 * pre-resolved regionId.
 *
 * The "existing request" step embeds RequestStatusView unmodified (the
 * same component S5/`/request/[id]` already uses) instead of a second,
 * degraded status display - real stage/counts/admin-contact/cancel, not
 * a dead end.
 */
export function RaiseRequestFlow({ pincodeOptions }: { pincodeOptions: PincodeOption[] }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("otp");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  // "existing" step state.
  const [existingRequestId, setExistingRequestId] = useState<string | null>(null);
  const [existingStatusView, setExistingStatusView] = useState<RequestStatusData | null>(null);

  // "location" step state.
  const [location, setLocation] = useState("");
  const [resolving, setResolving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);

  // "form" step state.
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [bloodGroupError, setBloodGroupError] = useState<string | null>(null);
  const [units, setUnits] = useState("");
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [bankId, setBankId] = useState("");
  const [bankError, setBankError] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<Urgency | "">("");
  const [urgencyError, setUrgencyError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  async function handleVerified(phone: string) {
    setVerifiedPhone(phone);
    const check = await checkOpenRequestAction();
    if (check.hasOpenRequest) {
      setExistingRequestId(check.requestId);
      setExistingStatusView(check.statusView);
      setStep("existing");
      return;
    }
    setStep("location");
  }

  async function resolve() {
    if (!location.trim()) {
      setLocationError(null);
      setRegionName(null);
      setBanks([]);
      return;
    }
    setResolving(true);
    const result = await resolveBanksForRaiseRequestAction(location);
    setResolving(false);
    if (!result.ok) {
      setRegionName(null);
      setBanks([]);
      setLocationError(
        result.reason === "no_banks" ? t("search.s4.noBanksMessage") : t("search.s1.noMatch"),
      );
      return;
    }
    setLocationError(null);
    setRegionName(result.regionName);
    setBanks(result.banks);
  }

  function continueToForm() {
    if (banks.length === 0) return;
    setStep("form");
  }

  async function submit() {
    const validBloodGroup = bloodGroup !== "";
    setBloodGroupError(validBloodGroup ? null : t("search.s4.invalidBloodGroup"));

    const unitsNumber = Number(units);
    const validUnits = Number.isInteger(unitsNumber) && unitsNumber >= MIN_UNITS && unitsNumber <= MAX_UNITS;
    setUnitsError(validUnits ? null : t("search.s4.invalidUnits"));

    const validBank = bankId !== "";
    setBankError(validBank ? null : t("search.s4.invalidBank"));

    const validUrgency = urgency !== "";
    setUrgencyError(validUrgency ? null : t("search.s4.invalidUrgency"));

    if (!validBloodGroup || !validUnits || !validBank || !validUrgency) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await raiseRequestAction({
        patientName: patientName.trim() || null,
        bloodGroup: bloodGroup as BloodGroup,
        unitsNeeded: unitsNumber,
        destinationBankId: bankId,
        urgency: urgency as Urgency,
      });

      if (!result.ok) {
        setSubmitting(false);
        if (result.reason === "duplicate_open_request") {
          // A race between the pre-check and this submission (e.g. two
          // tabs) - re-run the same real check the OTP step uses so this
          // still lands on the full status view, not a bare message.
          const check = await checkOpenRequestAction();
          if (check.hasOpenRequest) {
            setExistingRequestId(check.requestId);
            setExistingStatusView(check.statusView);
          }
          setStep("existing");
        } else {
          setBankError(t("search.s4.invalidBank"));
        }
        return;
      }

      setSubmitting(false);
      setSubmittedRequestId(result.requestId);
      setStep("submitted");
    } catch {
      setSubmitting(false);
      setSubmitError(t("search.s4.submitError"));
    }
  }

  if (step === "otp") {
    return <PhoneOtpFlow onVerified={handleVerified} />;
  }

  // Shown above every step past OTP verification (added 2026-08-09, real
  // gap found live: PhoneOtpFlow's own persistent-session fix means a
  // returning visitor can land on any of these steps without ever seeing
  // the phone-entry screen again, so without this there was no visible
  // reminder of which phone number they're acting as, and no way to
  // switch to a different one - e.g. raising a second request for someone
  // else - short of clearing cookies by hand. Same label-left/sign-out-
  // right arrangement app/bank/(portal)/layout.tsx already established
  // for this exact "identity + sign out" pattern.
  const sessionHeader = (
    <div className="flex w-full max-w-sm items-center justify-between">
      <span className="text-sm text-ink-500">{t("search.s4.signedInAs", { phone: verifiedPhone })}</span>
      <SignOutButton />
    </div>
  );

  if (step === "existing" && existingRequestId && existingStatusView) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        {sessionHeader}
        <div className="flex flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s4.blockedTitle")}</h1>
          <p className="text-ink-500">{t("search.s4.blockedMessage")}</p>
        </div>
        <RequestStatusView requestId={existingRequestId} initialView={existingStatusView} />
      </div>
    );
  }

  if (step === "submitted") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        {sessionHeader}
        <div className="flex flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s4.submittedTitle")}</h1>
          <p className="text-ink-500">{t("search.s4.submittedMessage")}</p>
          {submittedRequestId && (
            <Link
              href={`/request/${submittedRequestId}`}
              className="w-fit text-sm font-medium text-blood-600 underline"
            >
              {t("search.s4.viewStatusLink")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (step === "location") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        {sessionHeader}
        <div className="flex w-full flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s4.formTitle")}</h1>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="location">
          {t("search.s1.locationLabel")}
          <input
            id="location"
            list="location-options"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setRegionName(null);
              setBanks([]);
              setLocationError(null);
            }}
            onBlur={resolve}
            placeholder={t("search.s1.locationPlaceholder")}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
          <datalist id="location-options">
            {pincodeOptions.map((loc) => (
              <option key={loc.code} value={loc.code} />
            ))}
            {pincodeOptions.map((loc) => (
              <option key={loc.officeName} value={loc.officeName} />
            ))}
          </datalist>
        </label>
        {resolving && <p className="text-sm text-ink-500">{t("search.s1.resolving")}</p>}
        {regionName && (
          <p className="rounded-lg bg-banyan-100 px-3 py-2 text-sm text-banyan-700">
            {t("search.s1.regionConfirm").replace("{region}", regionName)}
          </p>
        )}
        {locationError && <p className="text-sm text-blood-600">{locationError}</p>}
        <button
          type="button"
          onClick={continueToForm}
          disabled={banks.length === 0 || resolving}
          className="mt-1 rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("search.s4.continueButton")}
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {sessionHeader}
      <div className="flex w-full flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("search.s4.formTitle")}</h1>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="blood-group">
        {t("search.s4.bloodGroupLabel")}
        <select
          id="blood-group"
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          <option value="">{t("search.s4.selectBloodGroupPlaceholder")}</option>
          {BLOOD_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </label>
      {bloodGroupError && <p className="text-sm text-blood-600">{bloodGroupError}</p>}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="component">
        {t("search.s4.componentLabel")}
        <select
          id="component"
          value={COMPONENT}
          disabled
          className="rounded-xl border border-ink-200 bg-sand-100 px-3.5 py-2.5 text-base font-normal text-ink-500 outline-none"
        >
          <option value={COMPONENT}>{t("search.s4.componentWholeBlood")}</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="units">
        {t("search.s4.unitsLabel")}
        <input
          id="units"
          type="number"
          inputMode="numeric"
          min={MIN_UNITS}
          max={MAX_UNITS}
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>
      {unitsError && <p className="text-sm text-blood-600">{unitsError}</p>}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="destination-bank">
        {t("search.s4.destinationBankLabel")}
        <select
          id="destination-bank"
          value={bankId}
          onChange={(e) => setBankId(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          <option value="">{t("search.s4.selectBankPlaceholder")}</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </label>
      {bankError && <p className="text-sm text-blood-600">{bankError}</p>}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="urgency">
        {t("search.s4.urgencyLabel")}
        <select
          id="urgency"
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as Urgency)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          <option value="">{t("search.s4.selectUrgencyPlaceholder")}</option>
          {URGENCY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level === "emergency" ? t("search.s4.urgencyEmergency") : t("search.s4.urgencyNormal")}
            </option>
          ))}
        </select>
      </label>
      {urgencyError && <p className="text-sm text-blood-600">{urgencyError}</p>}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="patient-name">
        {t("search.s4.patientNameLabel")}
        <input
          id="patient-name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder={t("search.s4.patientNamePlaceholder")}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>

      {submitError && <p className="text-sm text-blood-600">{submitError}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-1 rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t("search.s4.submitting") : t("search.s4.submitButton")}
      </button>
      </div>
    </div>
  );
}
