"use server";

import { createClient } from "@/lib/supabase/server";
import { createDbClient } from "@/lib/db/client";

/**
 * Clears profiles.must_reset_password after the client's own
 * auth.updateUser() password change has already succeeded. Derives the
 * profile id from the server-verified session (CLAUDE.md rule 2: never a
 * client-supplied id) - same trust boundary as
 * ensureProfileAfterVerification(): this only clears the calling
 * session's own flag, never anyone else's, and only a server action
 * (secret key) can write it - a client can never clear it directly since
 * profiles has RLS enabled with no policies (Unit 04).
 *
 * Genuinely role-agnostic - reused as-is by
 * components/auth/AdminForcedPasswordResetForm.tsx (Unit 35), not
 * duplicated into a second file, since there is no bank-specific logic
 * here to begin with (kept in this file rather than renamed, to avoid
 * unnecessary churn on an already-shipped Unit 09 file for a purely
 * cosmetic naming mismatch).
 */
export async function completeForcedPasswordReset() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    throw new Error("No verified session - call this only after updateUser() succeeds");
  }

  const { sub: id } = data.claims as { sub: string };

  const db = createDbClient();
  const { error: updateError } = await db
    .from("profiles")
    .update({ must_reset_password: false })
    .eq("id", id);

  if (updateError) throw updateError;
}
