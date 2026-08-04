"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createRequest,
  getOpenRequestIdForPhone,
  getRequestStatus,
  type CreateRequestResult,
  type RequestStatusView,
} from "@/lib/db/requests";
import { resolveLocation } from "@/lib/db/pincodes";
import { getVerifiedBanksInRegion, type BankOption } from "@/lib/db/blood-banks";
import type { BloodGroup } from "@/lib/serialise/blood-group";
import type { Urgency } from "@/lib/serialise/urgency";

/**
 * S4 wiring (PRD.md §6.1). Same pattern as
 * lib/actions/donor-registration.ts - phone/profile id come from the
 * server-verified session (CLAUDE.md rule 2), never from client input,
 * and are built from named fields only, never a spread of the client
 * object (see prompts/README.md's Unit 20 write-up for why that shape is
 * dangerous).
 */
async function getVerifiedRequester(): Promise<{ phone: string; profileId: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    throw new Error("No verified session - call this only after phone verification succeeds");
  }

  const claims = data.claims as { sub: string; phone?: string };
  if (!claims.phone) {
    throw new Error("Session has no verified phone number");
  }

  return { phone: claims.phone, profileId: claims.sub };
}

export type OpenRequestCheck =
  | { hasOpenRequest: true; requestId: string; statusView: RequestStatusView }
  | { hasOpenRequest: false };

/**
 * Fast, friendly pre-check right after OTP verification (PRD.md §6.1's
 * own ordering: "verification first... blocks with a clear message if an
 * open request already exists"). Not the authoritative enforcement -
 * raiseRequestAction's unique-index-backed rejection is (a race between
 * this check and a real submission is still caught there).
 *
 * Returns the request's own status view, not just a boolean (2026-08-04)
 * - the caller (components/search/RaiseRequestFlow.tsx) embeds it
 * directly instead of showing a dead-end "you already have a request"
 * sentence with no way to see what's actually happening. Reuses
 * getRequestStatus() unmodified (the same read S5/`/request/[id]`
 * already does), not a second implementation.
 */
export async function checkOpenRequestAction(): Promise<OpenRequestCheck> {
  const { phone } = await getVerifiedRequester();
  const requestId = await getOpenRequestIdForPhone(phone);
  if (!requestId) return { hasOpenRequest: false };
  const statusView = await getRequestStatus(requestId);
  return { hasOpenRequest: true, requestId, statusView };
}

export type ResolveBanksResult =
  | { ok: true; regionId: string; regionName: string; banks: BankOption[] }
  | { ok: false; reason: "not_found" | "no_banks" };

/**
 * S4's own pincode step (2026-08-04) - combines resolveLocation()
 * (lib/db/pincodes.ts, the same lookup S1 search already uses) and
 * getVerifiedBanksInRegion() (lib/db/blood-banks.ts) into the one read
 * this step needs, rather than two round trips. Both failure cases were
 * already handled server-side before this change (app/(public)/
 * request/new/page.tsx's old "no region"/"no banks" checks) - moved
 * here since the flow now resolves its own pincode instead of trusting
 * a URL param.
 */
export async function resolveBanksForRaiseRequestAction(rawInput: string): Promise<ResolveBanksResult> {
  const resolved = await resolveLocation(rawInput);
  if (!resolved) return { ok: false, reason: "not_found" };

  const banks = await getVerifiedBanksInRegion(resolved.regionId);
  if (banks.length === 0) return { ok: false, reason: "no_banks" };

  return { ok: true, regionId: resolved.regionId, regionName: resolved.regionName, banks };
}

export async function raiseRequestAction(input: {
  patientName: string | null;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  destinationBankId: string;
  urgency: Urgency;
}): Promise<CreateRequestResult> {
  const { phone, profileId } = await getVerifiedRequester();

  return createRequest({
    requesterPhone: phone,
    requesterProfileId: profileId,
    patientName: input.patientName,
    bloodGroup: input.bloodGroup,
    unitsNeeded: input.unitsNeeded,
    destinationBankId: input.destinationBankId,
    urgency: input.urgency,
  });
}
