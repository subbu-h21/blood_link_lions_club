"use server";

import { getActingBankStaff, getBankSettings, saveBankSettings, type BankSettings } from "@/lib/db/bank-portal";
import type { OpeningHours } from "@/lib/serialise/bank";

export async function loadBankSettings(): Promise<BankSettings> {
  const { bankId } = await getActingBankStaff();
  return getBankSettings(bankId);
}

export async function saveBankSettingsAction(settings: {
  address: string;
  phone: string;
  policyNotes: string;
  openingHours: OpeningHours;
}): Promise<void> {
  const { bankId } = await getActingBankStaff();
  await saveBankSettings(bankId, settings);
}
