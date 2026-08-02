"use server";

import { getActingDonor, getDonorEligibleFrom } from "@/lib/db/donor-portal";
import { getDonationHistory, type DonationRecord } from "@/lib/db/prospects";

export type DonorHistory = {
  donations: DonationRecord[];
  eligibleFrom: string | null;
};

export async function loadDonorHistory(): Promise<DonorHistory> {
  const { donorId } = await getActingDonor();
  const [donations, eligibleFrom] = await Promise.all([
    getDonationHistory(donorId),
    getDonorEligibleFrom(donorId),
  ]);
  return { donations, eligibleFrom };
}
