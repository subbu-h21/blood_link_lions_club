"use server";

import { getAllPincodes, resolveLocation, type PincodeOption, type ResolvedLocation } from "@/lib/db/pincodes";
import { getSearchResults } from "@/lib/db/search";
import { getAppSetting } from "@/lib/db/app-settings";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import type { SearchResult } from "@/lib/serialise/search";

// CLAUDE.md rule 6: search stays public - none of these check a session,
// deliberately. Only raising a request (a different unit) requires OTP.

export async function getPincodeOptions(): Promise<PincodeOption[]> {
  return getAllPincodes();
}

export async function resolveLocationAction(rawInput: string): Promise<ResolvedLocation | null> {
  return resolveLocation(rawInput);
}

function isValidBloodGroup(value: string | null): value is BloodGroup {
  return value !== null && (BLOOD_GROUPS as readonly string[]).includes(value);
}

export async function getSearchResultsAction(
  regionId: string,
  bloodGroupInput: string | null,
  locationInput: string | null,
): Promise<SearchResult | null> {
  const bloodGroup = isValidBloodGroup(bloodGroupInput) ? bloodGroupInput : null;
  const freshnessThresholdHours = await getAppSetting<number>("bank.stock_freshness_hours");
  return getSearchResults(regionId, bloodGroup, locationInput, freshnessThresholdHours);
}
