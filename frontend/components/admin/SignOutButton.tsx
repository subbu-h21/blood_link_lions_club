"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

// signOut is an Auth-service call, allowed in the browser (CLAUDE.md
// Rule 1) - same class as signInWithPassword/updateUser elsewhere in the
// admin auth flow.
export function SignOutButton() {
  const { t } = useTranslation();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-sand-100"
    >
      {t("adminPortal.signOut")}
    </button>
  );
}
