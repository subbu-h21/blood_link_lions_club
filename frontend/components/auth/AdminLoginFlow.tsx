"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "login" | "success";

/**
 * Admin/coordinator email + password login - deliberately separate from
 * BankLoginFlow (CLAUDE.md Conventions: `app/admin/` is email+password,
 * super-admin-created, a different account-creation authority and role
 * set than `app/bank/`), even though the shape mirrors it closely.
 * Accounts are never self-registered, so there is no signup step.
 * Password resets were super-admin-mediated only until 2026-08-07, when a
 * real self-service "Forgot password?" flow was added alongside it (not
 * replacing it) - see `ForgotPasswordRequestForm.tsx`; the link below is
 * this form's only change for that feature.
 *
 * Real Supabase auth (Unit 35): signInWithPassword is an Auth-service
 * call, allowed in the browser under CLAUDE.md's Rule 1 clarification.
 * must_reset_password is read via getClaims() right after sign-in, not
 * from data.user.app_metadata - the same distinction Unit 09 already
 * verified live for the bank-staff flow (the JWT claim, injected by
 * custom_access_token_hook, is the only place it actually lives).
 *
 * The forced-reset screen lives at its own route, /admin/reset-password
 * (AdminForcedPasswordResetForm), not as a step here - matching Unit 09's
 * bank-portal precedent exactly: lib/supabase/proxy.ts's gate redirects
 * there for any admin/coordinator session with the flag still set,
 * regardless of whether the visitor came through this form or navigated
 * directly with an old session. This unit's own Unit 34 predecessor
 * originally had this as an inline step (no real claim existed yet to
 * gate against) - now that a real flag exists, it moves to its own route
 * for the same reason Unit 09 moved it.
 */
export function AdminLoginFlow() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function login() {
    const validEmail = EMAIL_PATTERN.test(email);
    const validPassword = password.length > 0;
    setEmailError(validEmail ? null : t("adminAuth.invalidEmail"));
    setPasswordError(validPassword ? null : t("adminAuth.invalidPassword"));
    if (!validEmail || !validPassword) return;

    setLoginError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setLoginError(t("adminAuth.loginError"));
        return;
      }

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
      if (claimsError || !claimsData?.claims) {
        setLoginError(t("adminAuth.loginError"));
        return;
      }

      const claims = claimsData.claims as {
        app_metadata?: { must_reset_password?: boolean };
      };
      if (claims.app_metadata?.must_reset_password === true) {
        router.push("/admin/reset-password");
        return;
      }
      setStep("success");
    } catch {
      setLoginError(t("adminAuth.loginError"));
    } finally {
      setPending(false);
    }
  }

  if (step === "login") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminAuth.loginTitle")}</h1>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="email">
          {t("adminAuth.emailLabel")}
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("adminAuth.emailPlaceholder")}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {emailError && <p className="text-sm text-blood-600">{emailError}</p>}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="password">
          {t("adminAuth.passwordLabel")}
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("adminAuth.passwordPlaceholder")}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {passwordError && <p className="text-sm text-blood-600">{passwordError}</p>}
        {loginError && <p className="text-sm text-blood-600">{loginError}</p>}
        <button
          type="button"
          onClick={login}
          disabled={pending}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("adminAuth.loggingIn") : t("adminAuth.loginButton")}
        </button>
        <Link href="/forgot-password" className="text-center text-sm font-medium text-blood-600 underline">
          {t("adminAuth.forgotPasswordLink")}
        </Link>
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
