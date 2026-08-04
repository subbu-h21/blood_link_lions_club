"use server";

import { getActingBankStaff } from "@/lib/db/bank-portal";
import {
  getIncomingProspects,
  markProspectArrived,
  setProspectScreeningOutcome,
  getConfirmDonationDetail,
  confirmDonation,
  type IncomingProspect,
  type ProspectActionResult,
  type ConfirmDonationDetail,
  type ConfirmDonationResult,
} from "@/lib/db/bank-prospects";
import type { BloodGroup } from "@/lib/serialise/blood-group";

export async function loadIncomingProspects(): Promise<IncomingProspect[]> {
  const { profileId, bankId } = await getActingBankStaff();
  return getIncomingProspects(bankId, profileId);
}

export async function markProspectArrivedAction(prospectId: string): Promise<ProspectActionResult> {
  const { bankId } = await getActingBankStaff();
  return markProspectArrived(bankId, prospectId);
}

export async function setProspectScreeningOutcomeAction(
  prospectId: string,
  outcome: "rejected" | "no_show",
): Promise<ProspectActionResult> {
  const { bankId } = await getActingBankStaff();
  return setProspectScreeningOutcome(bankId, prospectId, outcome);
}

export async function loadConfirmDonationDetail(prospectId: string): Promise<ConfirmDonationDetail | null> {
  const { bankId } = await getActingBankStaff();
  return getConfirmDonationDetail(bankId, prospectId);
}

export async function confirmDonationAction(
  prospectId: string,
  confirmedBloodGroup: BloodGroup,
): Promise<ConfirmDonationResult> {
  const { bankId } = await getActingBankStaff();
  return confirmDonation(bankId, prospectId, confirmedBloodGroup);
}
