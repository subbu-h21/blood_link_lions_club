"use server";

import { getActingBankStaff } from "@/lib/db/bank-portal";
import {
  getActiveBankShortages,
  insertBankShortage,
  resolveBankShortage,
} from "@/lib/db/bank-shortages";
import type { BloodGroup } from "@/lib/serialise/blood-group";
import type { Shortage } from "@/lib/serialise/shortage";

export async function loadActiveBankShortages(): Promise<Shortage[]> {
  const { bankId } = await getActingBankStaff();
  return getActiveBankShortages(bankId);
}

// Creates the bank_shortages row only - does not notify anyone (matching
// engine doesn't exist until M3, explicit scope limit on this unit).
export async function postBankShortage(bloodGroup: BloodGroup, unitsNeeded: number): Promise<Shortage> {
  const { bankId } = await getActingBankStaff();
  return insertBankShortage(bankId, { bloodGroup, unitsNeeded });
}

export async function resolveBankShortageAction(shortageId: string): Promise<void> {
  const { bankId } = await getActingBankStaff();
  return resolveBankShortage(bankId, shortageId);
}
