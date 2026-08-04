"use server";

import { getActingAdmin } from "@/lib/db/admin-portal";
import {
  getAdminBanks,
  setBankVerified,
  setBankActive,
  saveBankPolicyNotes,
  createBank,
  updateBankDetails,
  type AdminBankRow,
  type AdminBankActionResult,
  type BankDetailsInput,
  type CreateBankResult,
  type UpdateBankDetailsResult,
} from "@/lib/db/admin-banks";

export async function loadAdminBanks(): Promise<AdminBankRow[]> {
  const caller = await getActingAdmin();
  return getAdminBanks(caller);
}

export async function setBankVerifiedAction(bankId: string, isVerified: boolean): Promise<AdminBankActionResult> {
  const caller = await getActingAdmin();
  return setBankVerified(caller, bankId, isVerified);
}

export async function setBankActiveAction(bankId: string, isActive: boolean): Promise<AdminBankActionResult> {
  const caller = await getActingAdmin();
  return setBankActive(caller, bankId, isActive);
}

export async function saveBankPolicyNotesAction(bankId: string, policyNotes: string): Promise<AdminBankActionResult> {
  const caller = await getActingAdmin();
  return saveBankPolicyNotes(caller, bankId, policyNotes);
}

export async function createBankAction(
  input: BankDetailsInput & { staffEmail: string; staffFullName: string },
): Promise<CreateBankResult> {
  const caller = await getActingAdmin();
  return createBank(caller, input);
}

export async function updateBankDetailsAction(
  bankId: string,
  input: BankDetailsInput,
): Promise<UpdateBankDetailsResult> {
  const caller = await getActingAdmin();
  return updateBankDetails(caller, bankId, input);
}
