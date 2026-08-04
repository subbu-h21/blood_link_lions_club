"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { completeForcedPasswordReset } from "@/lib/actions/bank-auth";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const MIN_PASSWORD_LENGTH = 8;

type Step = "form" | "success";

/**
 * Forced password-reset screen, reached either by BankLoginFlow's
 * redirect right after a first login, or directly by
 * lib/supabase/proxy.ts's gate whenever a bank_staff session still has
 * must_reset_password set — e.g. an old tab navigating straight to a
 * /bank/* URL without going through login again. Same component either
 * way, so the gate's redirect target actually enforces something instead
 * of being decorative.
 *
 * updateUser is an Auth-service call, allowed in the browser (CLAUDE.md
 * Rule 1). Clearing must_reset_password itself is server-only
 * (completeForcedPasswordReset, secret key) — a client can never clear its
 * own gate. refreshSession() afterward forces a fresh JWT so the cleared
 * flag takes effect immediately, not at the next natural token refresh.
 */
export function ForcedPasswordResetForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("form");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resetPassword() {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setNewPasswordError(t("bankAuth.invalidNewPassword"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setNewPasswordError(t("bankAuth.passwordMismatch"));
      return;
    }
    setNewPasswordError(null);
    setPending(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPending(false);
      setNewPasswordError(t("bankAuth.resetError"));
      return;
    }

    try {
      await completeForcedPasswordReset();
      await supabase.auth.refreshSession();
    } catch {
      setPending(false);
      setNewPasswordError(t("bankAuth.resetError"));
      return;
    }

    setPending(false);
    setStep("success");
  }

  if (step === "form") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankAuth.resetTitle")}</h1>
        <p className="text-sm text-ink-500">{t("bankAuth.resetIntro")}</p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="newPassword">
          {t("bankAuth.newPasswordLabel")}
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
          {t("bankAuth.confirmPasswordLabel")}
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {newPasswordError && <p className="text-sm text-blood-600">{newPasswordError}</p>}
        <button
          type="button"
          onClick={resetPassword}
          disabled={pending}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("bankAuth.resetting") : t("bankAuth.resetButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankAuth.successTitle")}</h1>
      <p className="text-ink-500">{t("bankAuth.successMessage")}</p>
      <Link
        href="/bank"
        className="rounded-full bg-blood-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
      >
        {t("bankAuth.continueButton")}
      </Link>
    </div>
  );
}
