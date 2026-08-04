"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

// signOut is an Auth-service call, allowed in the browser (CLAUDE.md
// Rule 1) - same as components/bank/SignOutButton.tsx. Redirects to
// /donor/register rather than a separate login route - the donor portal
// has no distinct login page, /donor/register's phone+OTP step doubles as
// login for a returning donor (lib/supabase/proxy.ts already leaves that
// path ungated).
export function SignOutButton() {
  const { t } = useTranslation();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/donor/register");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-sand-100"
    >
      {t("donorPortal.signOut")}
    </button>
  );
}
