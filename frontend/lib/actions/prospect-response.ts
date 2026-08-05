"use server";

import { getActingDonor } from "@/lib/db/donor-portal";
import {
  getDonorRequestView,
  getMyPendingInvitations,
  acceptProspect,
  declineProspect,
  getActivePledgeDetail,
  cancelPledge,
  type RequestView,
  type PendingInvitation,
  type AcceptResult,
  type PledgeDetail,
  type CancelPledgeResult,
} from "@/lib/db/prospects";

export async function loadDonorRequestView(requestId: string): Promise<RequestView> {
  const { donorId } = await getActingDonor();
  return getDonorRequestView(donorId, requestId);
}

// D2 dashboard invitations list (2026-08-05) - thin action wrapper, same
// shape as every other read here: resolve the acting donor from the
// server-verified session, never from a client-supplied id.
export async function loadMyPendingInvitations(): Promise<PendingInvitation[]> {
  const { donorId } = await getActingDonor();
  return getMyPendingInvitations(donorId);
}

export async function acceptProspectAction(requestId: string): Promise<AcceptResult> {
  const { donorId } = await getActingDonor();
  return acceptProspect(donorId, requestId);
}

export async function declineProspectAction(requestId: string, pauseDays?: number): Promise<void> {
  const { donorId } = await getActingDonor();
  await declineProspect(donorId, requestId, pauseDays);
}

export async function loadActivePledge(): Promise<PledgeDetail | null> {
  const { donorId } = await getActingDonor();
  return getActivePledgeDetail(donorId);
}

export async function cancelPledgeAction(): Promise<CancelPledgeResult> {
  const { donorId } = await getActingDonor();
  return cancelPledge(donorId);
}
