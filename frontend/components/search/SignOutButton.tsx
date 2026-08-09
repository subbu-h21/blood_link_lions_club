"use client";

import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

// signOut is an Auth-service call, allowed in the browser (CLAUDE.md
// Rule 1) - same as components/donor/SignOutButton.tsx and
// components/bank/SignOutButton.tsx. Added 2026-08-09 alongside
// PhoneOtpFlow's persistent-session fix: once a session could be reused
// across visits, there was no way left to switch to a different phone
// number (raise a request for someone else, or a mistyped number) short
// of clearing cookies by hand. Redirects to /request/new - the same
// phone+OTP step doubles as sign-in for a returning phone number, same
// pattern as the donor portal's own sign-out.
//
// Deliberately `window.location.href`, not `router.push` (2026-08-09,
// real bug found live): unlike the donor/bank sign-out buttons, this one
// is rendered ON /request/new itself, so a client-side push to the same
// path is a same-route no-op in the App Router - the URL didn't even
// change, and RaiseRequestFlow's own `step`/`verifiedPhone` state kept
// showing the signed-out session's last screen. A full navigation forces
// a real remount, which is what "log out" has to mean here regardless of
// which step the flow was on.
export function SignOutButton() {
  const { t } = useTranslation();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/request/new";
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-sand-100"
    >
      {t("search.s4.signOut")}
    </button>
  );
}
