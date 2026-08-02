"use server";

import {
  getActingDonor,
  getDonorHomeState,
  setAvailability,
  pauseAvailability,
  resumeAvailability,
  type DonorHomeState,
} from "@/lib/db/donor-portal";

export async function loadDonorHome(): Promise<DonorHomeState> {
  const { donorId } = await getActingDonor();
  return getDonorHomeState(donorId);
}

export async function setAvailabilityAction(isAvailable: boolean): Promise<void> {
  const { donorId } = await getActingDonor();
  await setAvailability(donorId, isAvailable);
}

export async function pauseAvailabilityAction(days: number): Promise<void> {
  const { donorId } = await getActingDonor();
  await pauseAvailability(donorId, days);
}

export async function resumeAvailabilityAction(): Promise<void> {
  const { donorId } = await getActingDonor();
  await resumeAvailability(donorId);
}
