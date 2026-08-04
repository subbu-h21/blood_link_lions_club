"use server";

import { getActingPlatformManager } from "@/lib/db/platform-portal";
import { createRegion, listRegions, type RegionOption, type CreateRegionResult } from "@/lib/db/platform-geography";
import { createPincode, type CreatePincodeResult } from "@/lib/db/pincodes";
import {
  createAdminAccount,
  resetAdminPassword,
  listAdmins,
  type RotaPriority,
  type CreateAdminResult,
  type ResetAdminPasswordResult,
  type AdminRow,
} from "@/lib/db/platform-admins";

// Every export here calls getActingPlatformManager() first - the same
// "route gate covers normal navigation, this covers any direct call"
// reasoning every other portal's own lib/actions file already documents
// (e.g. lib/actions/admin-banks.ts). A crafted request straight at one of
// these Server Actions is rejected the same as normal navigation to
// /ops-control/* would be by lib/supabase/proxy.ts.

export async function loadRegionsAction(): Promise<RegionOption[]> {
  await getActingPlatformManager();
  return listRegions();
}

export async function createRegionAction(input: {
  name: string;
  district: string;
  state: string;
}): Promise<CreateRegionResult> {
  const caller = await getActingPlatformManager();
  return createRegion(caller, input);
}

export async function createPincodeAction(input: {
  code: string;
  regionId: string;
  officeName?: string;
  taluk?: string;
  district?: string;
}): Promise<CreatePincodeResult> {
  await getActingPlatformManager();
  return createPincode(input);
}

export async function createAdminAction(input: {
  email: string;
  fullName: string;
  regionId: string;
  priority: RotaPriority;
}): Promise<CreateAdminResult> {
  const caller = await getActingPlatformManager();
  return createAdminAccount(caller, input);
}

export async function resetAdminPasswordAction(adminId: string): Promise<ResetAdminPasswordResult> {
  const caller = await getActingPlatformManager();
  return resetAdminPassword(caller, adminId);
}

export async function loadAdminsAction(): Promise<AdminRow[]> {
  await getActingPlatformManager();
  return listAdmins();
}
