"use server";

import { createClient } from "@/lib/supabase/server";
import { createDbClient } from "@/lib/db/client";

// The roles eligible for the new self-service reset flow (2026-08-07).
// Deliberately excludes `platform_manager` - PlatformManagerLoginFlow.tsx's
// own doc comment already documented this as a deliberate decision
// ("there is exactly one platform manager; a lost credential is a
// deliberate, out-of-band fix, not an in-app flow"), re-confirmed with the
// project owner before building this feature, not silently reversed.
// `searcher`/`donor` are phone+OTP roles with no password at all, so they
// were never a candidate either.
const SELF_SERVICE_ELIGIBLE_ROLES = ["bank_staff", "admin", "coordinator"] as const;
type EligibleRole = (typeof SELF_SERVICE_ELIGIBLE_ROLES)[number];

export type RecoveryEligibility =
  | { ok: true; role: EligibleRole }
  | { ok: false; reason: "not_eligible" | "no_session" };

/**
 * Checked by `ForgotPasswordConfirmForm.tsx` the moment a real recovery
 * session is detected - BEFORE the new-password form ever renders, not
 * after submission. That ordering matters: by the time a submission-time
 * check could run, the client-side `updateUser()` call would already have
 * changed the password - too late to meaningfully gate anything. This is
 * a real, server-verified role check (reads `profiles.role` fresh, never
 * trusts a client claim), not just a hidden button - matching this
 * codebase's own established "hiding a control is not sufficient" stance
 * elsewhere (A6 audit log, D1 etc.).
 *
 * Doesn't attempt to revoke the recovery session itself or make
 * `updateUser` technically unreachable - Supabase's own Auth API is
 * always available to any authenticated session regardless of what this
 * app's UI shows, the same real-but-narrow limitation
 * `completeForcedPasswordReset` already accepts. This is a genuine gate
 * on *this app's own self-service flow* for the ordinary case (a link
 * clicked from an email), not a claim that it makes a deliberate
 * workaround impossible for someone who already controls the account.
 *
 * `amr` check (added 2026-08-09, live-testing finding): the role check
 * alone isn't enough - ANY already-authenticated bank_staff/admin/
 * coordinator session (an ordinary login, no recovery link involved at
 * all) could otherwise reach this page and change the password with zero
 * re-verification, because this app has no other change-password screen
 * once past first login (grepped every `updateUser({ password })` call
 * site to confirm). That turns a briefly hijacked/stolen session (shared
 * device left logged in, leaked token) into a permanent account
 * takeover - attacker sets a new password, real owner locked out - with
 * no extra barrier. Supabase stamps every session's JWT with `amr`
 * (Authentication Method References); a session that actually came from
 * this recovery flow carries a `recovery` entry - confirmed live against
 * this project's real PKCE flow (`{"method":"recovery",...}`), and
 * confirmed to survive a token refresh unchanged, not re-derived per
 * request, so this stays valid for as long as a user takes to fill out
 * the form. A plain login session's `amr` is `password` instead, so it's
 * correctly rejected here. Deliberately reuses the existing "no_session"
 * reason/`invalid` UI state, not a new "not_eligible" - the problem for
 * this caller isn't their role (a real recovery link would work fine for
 * them), it's that this specific session isn't a recovery one.
 */
export async function checkRecoveryEligibility(): Promise<RecoveryEligibility> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { ok: false, reason: "no_session" };
  }
  const { sub: id, amr } = data.claims as {
    sub: string;
    amr?: ({ method: string } | string)[];
  };

  const usedRecoveryFlow = (amr ?? []).some((entry) =>
    typeof entry === "string" ? entry === "recovery" : entry.method === "recovery",
  );
  if (!usedRecoveryFlow) {
    return { ok: false, reason: "no_session" };
  }

  const db = createDbClient();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();
  if (profileError) throw profileError;

  if (!profile || !SELF_SERVICE_ELIGIBLE_ROLES.includes(profile.role as EligibleRole)) {
    return { ok: false, reason: "not_eligible" };
  }

  return { ok: true, role: profile.role as EligibleRole };
}

export type CompleteSelfServiceResetResult = { ok: true; role: EligibleRole } | { ok: false };

/**
 * Called after the client's own `updateUser({ password })` has already
 * succeeded (same ordering `completeForcedPasswordReset` already
 * established) - clears `must_reset_password` so a returning bank/admin
 * account doesn't ALSO get forced through the old first-login reset
 * screen right after choosing a new password here.
 *
 * Deliberately a separate function from `completeForcedPasswordReset`
 * (`bank-auth.ts`), even though the underlying write is identical - that
 * function is also the platform manager's own first-login forced-reset
 * path (`/ops-control/reset-password`), which must keep working exactly
 * as it does today and must NOT gain this function's own role
 * restriction. Re-checks eligibility itself rather than trusting the
 * caller already did (the confirm page's own earlier check is real, but
 * this is the actual write path, so it re-verifies rather than assuming).
 */
export async function completeSelfServicePasswordReset(): Promise<CompleteSelfServiceResetResult> {
  const eligibility = await checkRecoveryEligibility();
  if (!eligibility.ok) return { ok: false };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const { sub: id } = data!.claims as { sub: string };

  const db = createDbClient();
  const { error } = await db.from("profiles").update({ must_reset_password: false }).eq("id", id);
  if (error) throw error;

  return { ok: true, role: eligibility.role };
}
