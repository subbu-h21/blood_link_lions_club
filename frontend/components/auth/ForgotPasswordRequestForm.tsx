"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Self-service "Forgot password?" - step 1 of 2 (2026-08-07). Shared
 * across bank staff and admin/coordinator (the only two email+password
 * account tiers this covers - the platform manager was deliberately
 * excluded, confirmed with the project owner, see
 * `lib/actions/forgot-password.ts`'s own doc comment; donors use phone
 * OTP, no password to forget). One shared component/route
 * (`/forgot-password`), not duplicated per portal - `resetPasswordForEmail`
 * doesn't need to know which portal the account belongs to, only the
 * confirm step (step 2) does, and that's resolved server-side from the
 * account's own real role, never a value this form passes along.
 *
 * `resetPasswordForEmail` is an Auth-service call (CLAUDE.md rule 1's
 * browser-safe list, extended 2026-08-07 to include this one specifically
 * for this feature - see CLAUDE.md's own updated note). Always shows the
 * same "check your inbox" outcome regardless of whether the email
 * actually belongs to a real account - confirmed live before building
 * this that Supabase's own SDK already returns the identical
 * `{ data: {}, error: null }` shape either way, so this form doesn't need
 * to (and must not) infer or reveal account existence itself.
 */
export function ForgotPasswordRequestForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [genericError, setGenericError] = useState<string | null>(null);

  async function submit() {
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError(t("forgotPassword.invalidEmail"));
      return;
    }
    setEmailError(null);
    setGenericError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password/confirm`,
      });
      // A genuine transport/service-level error (not "email doesn't
      // exist" - Supabase never distinguishes that case) still gets a
      // real, if generic, error message rather than a false "sent".
      if (error) {
        setGenericError(t("forgotPassword.requestError"));
        return;
      }
      setSent(true);
    } catch {
      setGenericError(t("forgotPassword.requestError"));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("forgotPassword.sentTitle")}</h1>
        <p className="text-sm text-ink-500">{t("forgotPassword.sentMessage")}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("forgotPassword.requestTitle")}</h1>
      <p className="text-sm text-ink-500">{t("forgotPassword.requestIntro")}</p>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="email">
        {t("forgotPassword.emailLabel")}
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>
      {emailError && <p className="text-sm text-blood-600">{emailError}</p>}
      {genericError && <p className="text-sm text-blood-600">{genericError}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? t("forgotPassword.sending") : t("forgotPassword.sendLinkButton")}
      </button>
    </div>
  );
}
