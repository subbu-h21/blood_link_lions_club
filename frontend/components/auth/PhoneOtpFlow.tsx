"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureProfileAfterVerification } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const RESEND_COOLDOWN_SECONDS = 30;
const PHONE_PATTERN = /^\d{10}$/;
const OTP_PATTERN = /^\d{6}$/;
const COUNTRY_CODE = "+91";

type Step = "phone" | "otp" | "success";

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
 */
export function PhoneOtpFlow({
  onVerified,
}: {
  onVerified?: (phone: string) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, setPending] = useState(false);

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
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: COUNTRY_CODE + phone,
    });
    setPending(false);
    if (error) {
      setPhoneError(t("phoneOtp.sendError"));
      return;
    }
    setStep("otp");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyOtp() {
    if (!OTP_PATTERN.test(otp)) {
      setOtpError(t("phoneOtp.invalidOtp"));
      return;
    }
    setOtpError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: COUNTRY_CODE + phone,
      token: otp,
      type: "sms",
    });
    if (error) {
      setPending(false);
      setOtpError(t("phoneOtp.verifyError"));
      return;
    }
    await ensureProfileAfterVerification();
    setPending(false);
    if (onVerified) {
      onVerified(phone);
    } else {
      setStep("success");
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({ phone: COUNTRY_CODE + phone });
  }

  if (step === "phone") {
    return (
      <div className="flex flex-col gap-3 max-w-sm">
        <h1 className="text-lg font-semibold">{t("phoneOtp.title")}</h1>
        <label className="flex flex-col gap-1" htmlFor="phone">
          {t("phoneOtp.phoneLabel")}
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder={t("phoneOtp.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="border rounded px-3 py-2"
          />
        </label>
        {phoneError && <p className="text-red-600 text-sm">{phoneError}</p>}
        <button
          type="button"
          onClick={sendOtp}
          disabled={pending}
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {pending ? t("phoneOtp.sending") : t("phoneOtp.continueButton")}
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-3 max-w-sm">
        <h1 className="text-lg font-semibold">{t("phoneOtp.otpTitle")}</h1>
        <p className="text-sm text-gray-600">{t("phoneOtp.otpSentTo", { phone })}</p>
        <label className="flex flex-col gap-1" htmlFor="otp">
          {t("phoneOtp.otpLabel")}
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="border rounded px-3 py-2"
          />
        </label>
        {otpError && <p className="text-red-600 text-sm">{otpError}</p>}
        <button
          type="button"
          onClick={verifyOtp}
          disabled={pending}
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {pending ? t("phoneOtp.verifying") : t("phoneOtp.verifyButton")}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => setStep("phone")} className="underline">
            {t("phoneOtp.changeNumber")}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className={cooldown > 0 ? "text-gray-400" : "underline"}
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
    <div className="flex flex-col gap-2 max-w-sm">
      <h1 className="text-lg font-semibold">{t("phoneOtp.successTitle")}</h1>
      <p>{t("phoneOtp.successMessage", { phone })}</p>
    </div>
  );
}
