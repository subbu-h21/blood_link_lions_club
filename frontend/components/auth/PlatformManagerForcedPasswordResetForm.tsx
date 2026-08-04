"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { completeForcedPasswordReset } from "@/lib/actions/bank-auth";

const MIN_PASSWORD_LENGTH = 8;

type Step = "form" | "success";

/**
 * Forced password-reset screen for the platform manager, reached either
 * by PlatformManagerLoginFlow's redirect right after login, or directly
 * by lib/supabase/proxy.ts's gate whenever the session still has
 * must_reset_password set. Mirrors components/auth/
 * ForcedPasswordResetForm.tsx's shape exactly - same real updateUser() +
 * completeForcedPasswordReset() + refreshSession() sequence - but with
 * hardcoded English strings; see PlatformManagerLoginFlow.tsx's own
 * comment for why this portal is a deliberate, approved exception to
 * CLAUDE.md rule 8.
 *
 * completeForcedPasswordReset() (lib/actions/bank-auth.ts) is already
 * role-agnostic - it derives the profile id from the server-verified
 * session and only ever clears that session's own flag, so it's reused
 * here unmodified rather than duplicated for a third role.
 */
export function PlatformManagerForcedPasswordResetForm() {
  const [step, setStep] = useState<Step>("form");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resetPassword() {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setNewPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setNewPasswordError("Passwords don't match.");
      return;
    }
    setNewPasswordError(null);
    setPending(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setPending(false);
      setNewPasswordError("Couldn't reset your password. Try again.");
      return;
    }

    try {
      await completeForcedPasswordReset();
      await supabase.auth.refreshSession();
    } catch {
      setPending(false);
      setNewPasswordError("Couldn't reset your password. Try again.");
      return;
    }

    setPending(false);
    setStep("success");
  }

  if (step === "form") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">Set a new password</h1>
        <p className="text-sm text-ink-500">
          This account needs a new password before you can continue.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="newPassword">
          New password
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
          Confirm new password
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
          {pending ? "Resetting..." : "Reset password"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">Password updated</h1>
      <p className="text-ink-500">Your password has been reset.</p>
      <Link
        href="/ops-control"
        className="rounded-full bg-blood-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
      >
        Continue
      </Link>
    </div>
  );
}
