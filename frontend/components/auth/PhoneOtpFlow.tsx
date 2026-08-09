"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureProfileAfterVerification } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const RESEND_COOLDOWN_SECONDS = 30;
const PHONE_PATTERN = /^\d{10}$/;
const OTP_PATTERN = /^\d{6}$/;
const COUNTRY_CODE = "+91";

type Step = "checking" | "phone" | "otp" | "success";

/**
 * Shared phone + OTP flow for the searcher (raising a request) and donor
 * (register/log in) portals — CLAUDE.md rule 6, PRD.md §3. Real Supabase
 * phone-OTP auth (Unit 04) — no SMS provider is configured yet (PRD.md
 * §15 item 6), so local dev only works for the test numbers in
 * supabase/config.toml's [auth.sms.test_otp].
 *
 * If `onVerified` is supplied, the caller takes over after verification
 * (e.g. showing a registration or request form in a later unit). If not,
 * this component shows its own generic success screen.
 *
 * Skips straight past both steps if a valid phone-verified session
 * already exists (added 2026-08-09, real UX/server-load finding: every
 * visit to /donor/register or the raise-request flow forced a fresh OTP
 * from scratch, even seconds after a real one, because both callers
 * always start this component at "phone" unconditionally - annoying for
 * a real donor pressing back, and a needless SMS-provider hit on every
 * one). `getClaims()` is the same server-verified check
 * `getVerifiedRequester()`/`checkRecoveryEligibility()` already use
 * elsewhere in this codebase - `claims.phone` is populated only by a
 * genuine `verifyOtp` sign-in (bank/admin email+password sessions have
 * no phone claim at all), so this can't be fooled by an unrelated
 * portal's lingering session. A plain `supabase.auth.signOut()` (the
 * donor/searcher "sign out" button) clears the session entirely, so the
 * very next visit finds nothing here and correctly falls through to a
 * fresh "phone" step - no special-casing needed for that side.
 *
 * `onVerified`'s second argument tells the caller whether this was a
 * fresh, real OTP submission (`resumed: false`) or a skip via an
 * already-existing session (`resumed: true`) - this distinction matters
 * to `lib/push/subscribe.ts`'s own documented constraint that push
 * registration must "never" fire "automatically from a page-load
 * effect" (most browsers silently refuse/ignore a permission prompt not
 * backed by a genuine user gesture like a click). `app/donor/register`'s
 * `handleVerified` uses this to only attempt push opt-in on a real,
 * fresh verification, never on a resumed one.
 */
export function PhoneOtpFlow({
  onVerified,
}: {
  onVerified?: (phone: string, info: { resumed: boolean }) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("checking");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let resolved = false;

    // Belt and suspenders (2026-08-09 review, no reproduced failure but
    // cheap to guard anyway): if getClaims() ever hangs or throws instead
    // of cleanly resolving with {error} - a real network failure and a
    // corrupted stored session were both tried live and neither triggered
    // this, but nothing rules out every possible cause - this component
    // must not get stuck on "checking" forever with no way forward, which
    // would be worse than the OTP-every-time problem this fix solves.
    // Same bounded-timeout pattern ForgotPasswordConfirmForm.tsx already
    // uses for its own analogous "checking" step.
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setStep("phone");
      }
    }, 5000);

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getClaims();
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        const claims = data?.claims as { phone?: string } | undefined;
        if (!error && claims?.phone) {
          // Confirmed live: the JWT's phone claim is bare digits with no
          // "+" (e.g. "919900000006"), unlike COUNTRY_CODE's own "+91" -
          // a startsWith(COUNTRY_CODE) check here would never match and
          // silently skip stripping. PHONE_PATTERN guarantees the local
          // number is always exactly 10 digits, so slice(-10) is exact
          // regardless of prefix shape, not a prefix-string guess.
          const existingPhone = claims.phone.slice(-10);
          if (onVerified) {
            onVerified(existingPhone, { resumed: true });
          } else {
            setStep("success");
          }
        } else {
          setStep("phone");
        }
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          setStep("phone");
        }
      }
    })();

    return () => {
      resolved = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendOtp() {
    if (!PHONE_PATTERN.test(phone)) {
      setPhoneError(t("phoneOtp.invalidPhone"));
      return;
    }
    setPhoneError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: COUNTRY_CODE + phone,
      });
      if (error) {
        setPhoneError(t("phoneOtp.sendError"));
        return;
      }
      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setPhoneError(t("phoneOtp.sendError"));
    } finally {
      setPending(false);
    }
  }

  async function verifyOtp() {
    if (!OTP_PATTERN.test(otp)) {
      setOtpError(t("phoneOtp.invalidOtp"));
      return;
    }
    setOtpError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        phone: COUNTRY_CODE + phone,
        token: otp,
        type: "sms",
      });
      if (error) {
        setOtpError(t("phoneOtp.verifyError"));
        return;
      }
      await ensureProfileAfterVerification();
      if (onVerified) {
        onVerified(phone, { resumed: false });
      } else {
        setStep("success");
      }
    } catch {
      setOtpError(t("phoneOtp.verifyError"));
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({ phone: COUNTRY_CODE + phone });
  }

  if (step === "checking") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-ink-500">{t("phoneOtp.checkingSession")}</p>
      </div>
    );
  }

  if (step === "phone") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("phoneOtp.title")}</h1>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="phone">
          {t("phoneOtp.phoneLabel")}
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder={t("phoneOtp.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {phoneError && <p className="text-sm text-blood-600">{phoneError}</p>}
        <button
          type="button"
          onClick={sendOtp}
          disabled={pending}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("phoneOtp.sending") : t("phoneOtp.continueButton")}
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t("phoneOtp.otpTitle")}</h1>
        <p className="text-sm text-ink-500">{t("phoneOtp.otpSentTo", { phone })}</p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="otp">
          {t("phoneOtp.otpLabel")}
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          />
        </label>
        {otpError && <p className="text-sm text-blood-600">{otpError}</p>}
        <button
          type="button"
          onClick={verifyOtp}
          disabled={pending}
          className="rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("phoneOtp.verifying") : t("phoneOtp.verifyButton")}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => setStep("phone")} className="font-medium text-blood-600 underline">
            {t("phoneOtp.changeNumber")}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className={cooldown > 0 ? "text-ink-500" : "font-medium text-blood-600 underline"}
          >
            {cooldown > 0
              ? t("phoneOtp.resendCooldown", { seconds: cooldown })
              : t("phoneOtp.resendButton")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-2 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("phoneOtp.successTitle")}</h1>
      <p className="text-ink-500">{t("phoneOtp.successMessage", { phone })}</p>
    </div>
  );
}
