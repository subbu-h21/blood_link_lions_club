"use server";

import { createClient } from "@/lib/supabase/server";
import { registerDonor, type RegisterDonorResult } from "@/lib/db/donors";
import { isReturningDonor } from "@/lib/db/donor-portal";
import type { BloodGroup } from "@/lib/serialise/blood-group";

/**
 * Bug fix (2026-08-05) - called right after OTP verification, before
 * ever showing the registration form. `id` is the server-verified
 * session's own id (CLAUDE.md rule 2), same derivation
 * registerDonorAction below already uses - never a client-supplied
 * value, so this can't be used to probe whether an arbitrary other
 * phone number is already registered.
 */
export async function checkExistingDonorAction(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    throw new Error("No verified session - call this only after phone verification succeeds");
  }
  const { sub: id } = data.claims as { sub: string };
  return isReturningDonor(id);
}

/**
 * D1 wiring (PRD.md §7.1). Same pattern as
 * lib/actions/auth.ts's ensureProfileAfterVerification - the profile id
 * comes from the server-verified session, never from a client-supplied
 * value (CLAUDE.md rule 2).
 */
export async function registerDonorAction(input: {
  fullName: string;
  dob: string;
  bloodGroup: BloodGroup;
  pincode: string;
}): Promise<RegisterDonorResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    throw new Error("No verified session - call this only after phone verification succeeds");
  }

  const { sub: id } = data.claims as { sub: string };

  // Explicit field list, never a spread of `input` - a raw request
  // crafted directly against this action's endpoint (bypassing the UI
  // entirely) could otherwise smuggle its own `id` key into the JSON
  // body and, since object spread lets a later key win, silently
  // override the server-derived id above. CLAUDE.md rule 2.
  return registerDonor({
    id,
    fullName: input.fullName,
    dob: input.dob,
    bloodGroup: input.bloodGroup,
    pincode: input.pincode,
  });
}
