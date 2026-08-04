"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "login" | "success";

/**
 * Platform manager email + password login. Mirrors
 * components/auth/AdminLoginFlow.tsx's shape exactly (same real
 * signInWithPassword + getClaims()-based must_reset_password redirect),
 * but with hardcoded English strings instead of useTranslation() -
 * /ops-control is a deliberate, user-approved exception to CLAUDE.md rule
 * 8 (every other user-facing string in this app exists in en+kn): this
 * portal has exactly one operator, ever, and building full i18n plumbing
 * for a screen only they will ever see isn't worth the effort. Nothing
 * else about rule 8 changes - every other portal keeps full en/kn parity.
 *
 * No signup step (there is no self-service account creation for this
 * role - see lib/db/platform-portal.ts and
 * frontend/scripts/create-platform-manager.mjs) and no "forgot password"
 * control (there is exactly one platform manager; a lost credential is a
 * deliberate, out-of-band fix, not an in-app flow - see FUTURE-WORK.md).
 *
 * signInWithPassword is an Auth-service call, allowed in the browser
 * under CLAUDE.md's Rule 1 clarification.
 */
export function PlatformManagerLoginFlow() {
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
    setEmailError(validEmail ? null : "Enter a valid email address.");
    setPasswordError(validPassword ? null : "Enter your password.");
    if (!validEmail || !validPassword) return;

    setLoginError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        setLoginError("Incorrect email or password.");
        return;
      }

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
      if (claimsError || !claimsData?.claims) {
        setLoginError("Incorrect email or password.");
        return;
      }

      const claims = claimsData.claims as {
        app_metadata?: { must_reset_password?: boolean };
      };
      if (claims.app_metadata?.must_reset_password === true) {
        router.push("/ops-control/reset-password");
        return;
      }
      setStep("success");
    } catch {
      setLoginError("Incorrect email or password.");
    } finally {
      setPending(false);
    }
  }

  if (step === "login") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">Platform manager sign in</h1>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.org"
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {emailError && <p className="text-sm text-blood-600">{emailError}</p>}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="password">
          Password
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">Signed in</h1>
      <p className="text-ink-500">You&rsquo;re signed in as the platform manager.</p>
      <Link
        href="/ops-control"
        className="rounded-full bg-blood-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
      >
        Continue
      </Link>
    </div>
  );
}
