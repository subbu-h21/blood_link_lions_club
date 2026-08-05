"use server";

import { getActingDonor, getDonorSettingsState, type DonorSettingsState } from "@/lib/db/donor-portal";
import {
  updateDonorProfile,
  deleteDonorAccount,
  addAvailabilityPincode,
  removeAvailabilityPincode,
  type UpdateDonorProfileInput,
  type UpdateDonorProfileResult,
  type AddAvailabilityPincodeResult,
} from "@/lib/db/donors";

export async function loadDonorSettings(): Promise<DonorSettingsState> {
  const { donorId } = await getActingDonor();
  return getDonorSettingsState(donorId);
}

export async function updateDonorProfileAction(
  input: UpdateDonorProfileInput,
): Promise<UpdateDonorProfileResult> {
  const { donorId } = await getActingDonor();
  return updateDonorProfile(donorId, input);
}

export async function deleteDonorAccountAction(): Promise<void> {
  const { donorId } = await getActingDonor();
  await deleteDonorAccount(donorId);
}

export async function addAvailabilityPincodeAction(pincode: string): Promise<AddAvailabilityPincodeResult> {
  const { donorId } = await getActingDonor();
  return addAvailabilityPincode(donorId, pincode);
}

export async function removeAvailabilityPincodeAction(pincode: string): Promise<void> {
  const { donorId } = await getActingDonor();
  await removeAvailabilityPincode(donorId, pincode);
}
