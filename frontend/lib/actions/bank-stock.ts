"use server";

import { getActingBankStaff } from "@/lib/db/bank-portal";
import { getBankStock, saveBankStockRow } from "@/lib/db/bank-stock";
import { getAppSetting } from "@/lib/db/app-settings";
import type { StockRow } from "@/lib/serialise/stock";
import type { BloodGroup } from "@/lib/serialise/blood-group";

async function freshnessThreshold(): Promise<number> {
  return getAppSetting<number>("bank.stock_freshness_hours");
}

export async function loadBankStock(): Promise<StockRow[]> {
  const { bankId } = await getActingBankStaff();
  return getBankStock(bankId, await freshnessThreshold());
}

export async function updateBankStockUnits(bloodGroup: BloodGroup, units: number): Promise<StockRow> {
  const { profileId, bankId } = await getActingBankStaff();
  return saveBankStockRow(bankId, profileId, { bloodGroup, units }, await freshnessThreshold());
}
