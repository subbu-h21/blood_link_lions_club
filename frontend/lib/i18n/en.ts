export type Dictionary = {
  languageToggle: {
    english: string;
    kannada: string;
  };
  phoneOtp: {
    title: string;
    phoneLabel: string;
    phonePlaceholder: string;
    continueButton: string;
    invalidPhone: string;
    otpTitle: string;
    otpSentTo: string;
    otpLabel: string;
    verifyButton: string;
    invalidOtp: string;
    resendButton: string;
    resendCooldown: string;
    changeNumber: string;
    successTitle: string;
    successMessage: string;
    sendError: string;
    verifyError: string;
    sending: string;
    verifying: string;
  };
};

const en: Dictionary = {
  languageToggle: {
    english: "English",
    kannada: "ಕನ್ನಡ",
  },
  phoneOtp: {
    title: "Enter your phone number",
    phoneLabel: "Phone number",
    phonePlaceholder: "10-digit mobile number",
    continueButton: "Send code",
    invalidPhone: "Enter a valid 10-digit phone number",
    otpTitle: "Enter the code",
    otpSentTo: "We sent a 6-digit code to {phone}",
    otpLabel: "6-digit code",
    verifyButton: "Verify",
    invalidOtp: "Enter the 6-digit code",
    resendButton: "Resend code",
    resendCooldown: "Resend code in {seconds}s",
    changeNumber: "Change number",
    successTitle: "Verified",
    successMessage: "Phone number {phone} verified.",
    sendError: "Could not send the code. Try again.",
    verifyError: "That code didn't work. Check it and try again.",
    sending: "Sending...",
    verifying: "Verifying...",
  },
};

export default en;
