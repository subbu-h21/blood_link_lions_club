"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkRecoveryEligibility, completeSelfServicePasswordReset } from "@/lib/actions/forgot-password";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const MIN_PASSWORD_LENGTH = 8;

type Step = "checking" | "invalid" | "ineligible" | "form" | "success";

const LOGIN_PATH_BY_ROLE: Record<string, string> = {
  bank_staff: "/bank/login",
  admin: "/admin/login",
  coordinator: "/admin/login",
};

/**
 * Self-service "Forgot password?" - step 2 of 2 (2026-08-07), reached
 * only via the real link Supabase emails from step 1
 * (`ForgotPasswordRequestForm.tsx`). The link's own token lives in the
 * URL *fragment* (`#access_token=...&type=recovery&...`), confirmed live
 * before building this - a fragment never reaches the server (proxy.ts,
 * any server component) at all, so establishing the session is
 * necessarily client-side only, via `@supabase/ssr`'s browser client
 * auto-detecting it on load (`detectSessionInUrl`, on by default) and
 * firing a real `PASSWORD_RECOVERY` auth event - confirmed this event
 * name exists in the actually-installed SDK version before relying on
 * it, not assumed from training data.
 *
 * Listens for that event AND checks `getSession()` once directly on
 * mount, whichever comes first - `onAuthStateChange` only fires on a
 * genuine state *transition*, so if the fragment was already processed
 * before this component's listener attached (a real possible race, not
 * hypothetical), the direct check catches it instead of hanging on
 * "checking" forever. A generous but bounded timeout concludes "invalid"
 * (expired/already-used/malformed link) if neither ever fires - this is
 * the same class of link an email client's own link-preview scanner can
 * silently consume before a human ever clicks it, so "never resolves" is
 * a real case to handle, not a hypothetical one.
 *
 * The role-eligibility check runs BEFORE the password form ever renders
 * (see `lib/actions/forgot-password.ts`'s own doc comment for why this
 * ordering specifically matters) - a platform-manager account (excluded
 * on purpose) landing here via a stray/misdirected link sees the
 * `ineligible` state, never the form.
 */
export function ForgotPasswordConfirmForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("checking");
  const [role, setRole] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const resolvedRef = useRef(false);

  async function resolveEligibility() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const eligibility = await checkRecoveryEligibility();
    if (!eligibility.ok) {
      setStep(eligibility.reason === "not_eligible" ? "ineligible" : "invalid");
      return;
    }
    setRole(eligibility.role);
    setStep("form");
  }

  useEffect(() => {
    const supabase = createClient();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolveEligibility();
      }
    });

    // Fallback: the event may already have fired before this listener
    // attached.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) resolveEligibility();
    });

    const timeout = setTimeout(() => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        setStep("invalid");
      }
    }, 5000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function submit() {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(t("forgotPassword.invalidNewPassword"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t("forgotPassword.passwordMismatch"));
      return;
    }
    setFormError(null);
    setPending(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPending(false);
      setFormError(t("forgotPassword.resetError"));
      return;
    }

    try {
      const result = await completeSelfServicePasswordReset();
      if (!result.ok) {
        setPending(false);
        setFormError(t("forgotPassword.resetError"));
        return;
      }
      setRole(result.role);
    } catch {
      setPending(false);
      setFormError(t("forgotPassword.resetError"));
      return;
    }

    setPending(false);
    setStep("success");
  }

  if (step === "checking") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-ink-500">{t("forgotPassword.checkingMessage")}</p>
      </div>
    );
  }

  if (step === "invalid") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("forgotPassword.invalidTitle")}</h1>
        <p className="text-sm text-ink-500">{t("forgotPassword.invalidMessage")}</p>
        <Link
          href="/forgot-password"
          className="rounded-full bg-blood-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
        >
          {t("forgotPassword.requestNewLinkButton")}
        </Link>
      </div>
    );
  }

  if (step === "ineligible") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("forgotPassword.ineligibleTitle")}</h1>
        <p className="text-sm text-ink-500">{t("forgotPassword.ineligibleMessage")}</p>
      </div>
    );
  }

  if (step === "success") {
    const loginPath = role ? (LOGIN_PATH_BY_ROLE[role] ?? "/") : "/";
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("forgotPassword.successTitle")}</h1>
        <p className="text-sm text-ink-500">{t("forgotPassword.successMessage")}</p>
        <Link
          href={loginPath}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
        >
          {t("forgotPassword.continueToLoginButton")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("forgotPassword.newPasswordTitle")}</h1>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="newPassword">
        {t("forgotPassword.newPasswordLabel")}
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="confirmPassword">
        {t("forgotPassword.confirmPasswordLabel")}
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>
      {formError && <p className="text-sm text-blood-600">{formError}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? t("forgotPassword.resetting") : t("forgotPassword.resetButton")}
      </button>
    </div>
  );
}
