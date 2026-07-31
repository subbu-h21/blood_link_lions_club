"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const RESEND_COOLDOWN_SECONDS = 30;
const PHONE_PATTERN = /^\d{10}$/;
const OTP_PATTERN = /^\d{6}$/;

type Step = "phone" | "otp" | "success";

/**
 * Shared phone + OTP flow for the searcher (raising a request) and donor
 * (register/log in) portals — CLAUDE.md rule 6, PRD.md §3. Verification is
 * mocked: any 6-digit code succeeds. Real Supabase auth wiring is Unit 04.
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
  const [phoneError, setPhoneError] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function submitPhone() {
    if (!PHONE_PATTERN.test(phone)) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    setStep("otp");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  function submitOtp() {
    if (!OTP_PATTERN.test(otp)) {
      setOtpError(true);
      return;
    }
    setOtpError(false);
    if (onVerified) {
      onVerified(phone);
    } else {
      setStep("success");
    }
  }

  function resend() {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_SECONDS);
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
        {phoneError && <p className="text-red-600 text-sm">{t("phoneOtp.invalidPhone")}</p>}
        <button
          type="button"
          onClick={submitPhone}
          className="bg-black text-white rounded px-3 py-2"
        >
          {t("phoneOtp.continueButton")}
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
        {otpError && <p className="text-red-600 text-sm">{t("phoneOtp.invalidOtp")}</p>}
        <button
          type="button"
          onClick={submitOtp}
          className="bg-black text-white rounded px-3 py-2"
        >
          {t("phoneOtp.verifyButton")}
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
