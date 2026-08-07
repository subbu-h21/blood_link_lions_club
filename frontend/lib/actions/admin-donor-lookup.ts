"use server";

import { getActingAdmin } from "@/lib/db/admin-portal";
import {
  searchAdminDonors,
  listOpenRequestsForRegion,
  revealDonorContactForLookup,
  type AdminDonorSearchResult,
  type OpenRequestOption,
  type RevealLookupResult,
} from "@/lib/db/admin-donors";
import type { BloodGroup } from "@/lib/serialise/blood-group";

export async function searchAdminDonorsAction(
  filters: { bloodGroup?: BloodGroup; availableOnly?: boolean; pincode?: string },
  page: number,
): Promise<AdminDonorSearchResult> {
  const caller = await getActingAdmin();
  return searchAdminDonors(caller, filters, page);
}

export async function loadOpenRequestsForRegionAction(): Promise<OpenRequestOption[]> {
  const caller = await getActingAdmin();
  return listOpenRequestsForRegion(caller);
}

export async function revealDonorContactAction(
  donorId: string,
  requestId: string,
  reason: string,
): Promise<RevealLookupResult> {
  const caller = await getActingAdmin();
  return revealDonorContactForLookup(caller, donorId, requestId, reason);
}
