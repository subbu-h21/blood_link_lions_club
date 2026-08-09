"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhoneOtpFlow } from "@/components/auth/PhoneOtpFlow";
import { registerForPushNotifications } from "@/lib/push/subscribe";
import { registerDonorAction, checkExistingDonorAction } from "@/lib/actions/donor-registration";
import { createClient } from "@/lib/supabase/client";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const MIN_AGE = 18;
const MAX_AGE = 65;
const PIN_PATTERN = /^\d{6}$/;

type Step = "otp" | "form" | "registered";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function calculateAge(dob: string): number | null {
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * D1 registration (PRD.md §7.1): phone+OTP (Unit 03/04's shared
 * PhoneOtpFlow, reused not rebuilt) followed by full name / DOB / blood
 * group / PIN code / consent, wired to real data (Unit 20 -
 * registerDonorAction). The DOB/PIN checks below run client-side for a
 * fast error message, but lib/db/donors.ts's registerDonor re-validates
 * both server-side independently - CLAUDE.md rule 1, never trust the
 * client-side check alone.
 *
 * The onVerified hook below is preserved from Unit 18, not reverted to a
 * bare <PhoneOtpFlow /> - it's where push notifications get registered
 * (PRD.md §10.1), and must keep firing regardless of what the later steps
 * of this page look like.
 *
 * After a successful submit, refreshSession() re-runs
 * custom_access_token_hook so the JWT's profile_role claim picks up
 * "donor" immediately (same fix ForcedPasswordResetForm already uses,
 * Unit 09) - without it, /donor's role gate would still see the stale
 * "searcher" claim and bounce the just-registered donor straight back
 * here.
 *
 * Bug fix (2026-08-05): handleVerified() used to advance straight to
 * "form" unconditionally - a phone number that already belongs to a
 * registered donor saw the exact same empty "complete your profile" form
 * every time, not a "welcome back" experience. checkExistingDonorAction()
 * now runs first; an already-registered donor is sent straight to their
 * dashboard instead. Deliberately checked *before* the push-notification
 * registration step below, not after - a returning donor shouldn't be
 * asked to re-opt-into push notifications every time they land here.
 */
export default function DonorRegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>("otp");
  const [pushEnabled, setPushEnabled] = useState(false);

  const [fullName, setFullName] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [bloodGroupError, setBloodGroupError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleVerified(_phone: string, { resumed }: { resumed: boolean }) {
    const alreadyRegistered = await checkExistingDonorAction();
    if (alreadyRegistered) {
      router.push("/donor");
      return;
    }
    // Push registration needs a real user gesture behind it (see
    // lib/push/subscribe.ts's own doc comment) - only attempt it right
    // after a genuine, fresh OTP submission, never when PhoneOtpFlow
    // skipped straight here because a session already existed (2026-08-09,
    // e.g. a donor who verified once, didn't finish the form, and came
    // back). A resumed visit just proceeds to the form with push left off;
    // fails soft, same as a browser without push support or a declined
    // permission prompt already does.
    if (!resumed) {
      const { subscribed } = await registerForPushNotifications();
      setPushEnabled(subscribed);
    }
    setStep("form");
  }

  async function submit() {
    const validName = fullName.trim().length > 0;
    setFullNameError(validName ? null : t("donorRegister.invalidFullName"));

    const age = calculateAge(dob);
    const validDob = age !== null && age >= MIN_AGE && age <= MAX_AGE;
    setDobError(validDob ? null : t("donorRegister.invalidDob"));

    const validBloodGroup = bloodGroup !== "";
    setBloodGroupError(validBloodGroup ? null : t("donorRegister.invalidBloodGroup"));

    const validPin = PIN_PATTERN.test(pin);
    setPinError(validPin ? null : t("donorRegister.invalidPin"));

    setConsentError(consent ? null : t("donorRegister.consentRequired"));

    if (!validName || !validDob || !validBloodGroup || !validPin || !consent) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await registerDonorAction({
        fullName: fullName.trim(),
        dob,
        bloodGroup: bloodGroup as BloodGroup,
        pincode: pin,
      });

      if (!result.ok) {
        if (result.reason === "invalid_dob") {
          setDobError(t("donorRegister.invalidDob"));
        } else {
          setPinError(t("donorRegister.pinNotFound"));
        }
        setSubmitting(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.refreshSession();
      setSubmitting(false);
      setStep("registered");
    } catch {
      setSubmitting(false);
      setSubmitError(t("donorRegister.submitError"));
    }
  }

  if (step === "otp") {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <PhoneOtpFlow onVerified={handleVerified} />
      </main>
    );
  }

  if (step === "registered") {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorRegister.registeredTitle")}</h1>
          <p className="text-ink-500">{t("donorRegister.registeredMessage")}</p>
          <p className="text-sm text-ink-500">
            {pushEnabled ? t("donorRegister.pushEnabled") : t("donorRegister.pushSkipped")}
          </p>
          <Link
            href="/donor"
            className="rounded-full bg-blood-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
          >
            {t("donorRegister.goToDashboard")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("donorRegister.formTitle")}</h1>
        <p className="text-sm text-ink-500">
          {pushEnabled ? t("donorRegister.pushEnabled") : t("donorRegister.pushSkipped")}
        </p>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="full-name">
          {t("donorRegister.fullNameLabel")}
          <input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {fullNameError && <p className="text-sm text-blood-600">{fullNameError}</p>}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="dob">
          {t("donorRegister.dobLabel")}
          <input
            id="dob"
            type="date"
            value={dob}
            max={todayIsoDate()}
            onChange={(e) => setDob(e.target.value)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {dobError && <p className="text-sm text-blood-600">{dobError}</p>}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="blood-group">
          {t("donorRegister.bloodGroupLabel")}
          <select
            id="blood-group"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          >
            <option value="">{t("donorRegister.selectBloodGroupPlaceholder")}</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        {bloodGroupError && <p className="text-sm text-blood-600">{bloodGroupError}</p>}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="pin">
          {t("donorRegister.pinLabel")}
          <input
            id="pin"
            type="text"
            inputMode="numeric"
            placeholder={t("donorRegister.pinPlaceholder")}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {pinError && <p className="text-sm text-blood-600">{pinError}</p>}

        <label className="flex items-start gap-2 text-sm text-ink-700" htmlFor="consent">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 accent-blood-600"
          />
          {t("donorRegister.consentText")}
        </label>
        {consentError && <p className="text-sm text-blood-600">{consentError}</p>}

        {submitError && <p className="text-sm text-blood-600">{submitError}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-1 rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t("donorRegister.submitting") : t("donorRegister.submitButton")}
        </button>
      </div>
    </main>
  );
}
