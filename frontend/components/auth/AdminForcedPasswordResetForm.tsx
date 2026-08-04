"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { completeForcedPasswordReset } from "@/lib/actions/bank-auth";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const MIN_PASSWORD_LENGTH = 8;

type Step = "form" | "success";

/**
 * Forced password-reset screen for admin/coordinator accounts, reached
 * either by AdminLoginFlow's redirect right after a first login, or
 * directly by lib/supabase/proxy.ts's gate whenever an admin/coordinator
 * session still has must_reset_password set. Same component either way,
 * mirroring Unit 09's bank-portal ForcedPasswordResetForm exactly.
 *
 * completeForcedPasswordReset (lib/actions/bank-auth.ts) is reused as-is,
 * not duplicated - it derives the profile id from the caller's own
 * server-verified session (CLAUDE.md rule 2) and clears that session's
 * own must_reset_password flag, with no bank-specific logic anywhere in
 * it. Genuinely shared, role-agnostic infrastructure, same class of
 * reuse as this codebase's other single-implementation shared functions.
 *
 * updateUser is an Auth-service call, allowed in the browser (CLAUDE.md
 * Rule 1). Clearing must_reset_password itself is server-only - a client
 * can never clear its own gate. refreshSession() afterward forces a
 * fresh JWT so the cleared flag takes effect immediately.
 */
export function AdminForcedPasswordResetForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("form");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resetPassword() {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setNewPasswordError(t("adminAuth.invalidNewPassword"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setNewPasswordError(t("adminAuth.passwordMismatch"));
      return;
    }
    setNewPasswordError(null);
    setPending(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPending(false);
      setNewPasswordError(t("adminAuth.resetError"));
      return;
    }

    try {
      await completeForcedPasswordReset();
      await supabase.auth.refreshSession();
    } catch {
      setPending(false);
      setNewPasswordError(t("adminAuth.resetError"));
      return;
    }

    setPending(false);
    setStep("success");
  }

  if (step === "form") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminAuth.resetTitle")}</h1>
        <p className="text-sm text-ink-500">{t("adminAuth.resetIntro")}</p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="newPassword">
          {t("adminAuth.newPasswordLabel")}
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
          {t("adminAuth.confirmPasswordLabel")}
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
          {pending ? t("adminAuth.resetting") : t("adminAuth.resetButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminAuth.successTitle")}</h1>
      <p className="text-ink-500">{t("adminAuth.successMessage")}</p>
      <Link
        href="/admin"
        className="rounded-full bg-blood-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
      >
        {t("adminAuth.continueButton")}
      </Link>
    </div>
  );
}
