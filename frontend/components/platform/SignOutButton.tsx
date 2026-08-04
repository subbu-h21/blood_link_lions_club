"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Hardcoded English - see PlatformManagerLoginFlow.tsx's comment for why
// /ops-control is a deliberate exception to CLAUDE.md rule 8. signOut is
// an Auth-service call, allowed in the browser (CLAUDE.md Rule 1) - same
// class as every other portal's own sign-out button.
export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/ops-control/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-sand-100"
    >
      Sign out
    </button>
  );
}
