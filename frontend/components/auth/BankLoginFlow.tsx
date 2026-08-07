"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "login" | "success";

/**
 * Bank-staff email + password login — deliberately separate from
 * PhoneOtpFlow (CLAUDE.md Conventions: `app/bank/` is email+password,
 * admin-created, not phone OTP). Accounts are never self-registered, so
 * there is no signup step. Password resets were admin-mediated only until
 * 2026-08-07, when a real self-service "Forgot password?" flow was added
 * alongside it (not replacing it) - see `ForgotPasswordRequestForm.tsx`;
 * the link below is this form's only change for that feature.
 *
 * Real Supabase auth (Unit 09): signInWithPassword is an Auth-service
 * call, allowed in the browser under CLAUDE.md's Rule 1 clarification,
 * same as the OTP flow. must_reset_password is read via getClaims() right
 * after sign-in — verified directly against the local stack that this is
 * where it actually lives: signInWithPassword's returned data.user.
 * app_metadata does NOT carry it (that's the auth.users row's own raw
 * metadata); the custom_access_token_hook migration injects the claim
 * into the JWT itself, which only getClaims() (or decoding
 * data.session.access_token by hand) exposes.
 *
 * The forced-reset screen lives at its own route, /bank/reset-password
 * (ForcedPasswordResetForm), not as a step here — lib/supabase/proxy.ts's
 * gate redirects there directly for any bank_staff session with the flag
 * still set, regardless of whether they came through this login form or
 * navigated to a /bank/* URL directly with an old session. A step here
 * would only ever be reached through this component, defeating that
 * defense-in-depth.
 */
export function BankLoginFlow() {
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
    setEmailError(validEmail ? null : t("bankAuth.invalidEmail"));
    setPasswordError(validPassword ? null : t("bankAuth.invalidPassword"));
    if (!validEmail || !validPassword) return;

    setLoginError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setLoginError(t("bankAuth.loginError"));
        return;
      }

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
      if (claimsError || !claimsData?.claims) {
        setLoginError(t("bankAuth.loginError"));
        return;
      }

      const claims = claimsData.claims as {
        app_metadata?: { must_reset_password?: boolean };
      };
      if (claims.app_metadata?.must_reset_password === true) {
        router.push("/bank/reset-password");
        return;
      }
      setStep("success");
    } catch {
      setLoginError(t("bankAuth.loginError"));
    } finally {
      setPending(false);
    }
  }

  if (step === "login") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankAuth.loginTitle")}</h1>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="email">
          {t("bankAuth.emailLabel")}
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("bankAuth.emailPlaceholder")}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {emailError && <p className="text-sm text-blood-600">{emailError}</p>}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="password">
          {t("bankAuth.passwordLabel")}
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("bankAuth.passwordPlaceholder")}
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
          {pending ? t("bankAuth.loggingIn") : t("bankAuth.loginButton")}
        </button>
        <Link href="/forgot-password" className="text-center text-sm font-medium text-blood-600 underline">
          {t("bankAuth.forgotPasswordLink")}
        </Link>
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
