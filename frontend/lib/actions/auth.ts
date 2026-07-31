"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/db/profiles";

/**
 * Called right after a client-side verifyOtp() succeeds. Deliberately
 * takes no arguments - id/phone are derived from the server-verified
 * session, never from client-supplied values (CLAUDE.md rule 2: never
 * trust a client-supplied identity for a privileged write).
 */
export async function ensureProfileAfterVerification() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    throw new Error("No verified session - call this only after verifyOtp succeeds");
  }

  const { sub: id, phone } = data.claims as { sub: string; phone?: string };
  if (!phone) {
    throw new Error("Session has no verified phone number");
  }

  return ensureProfile({ id, phone });
}
