import { BankSettingsForm } from "@/components/bank/BankSettingsForm";
import { loadBankSettings } from "@/lib/actions/bank-settings";

// B5 · Profile (PRD.md §8.1) - real data (Unit 12), scoped to the acting
// bank_staff's own blood_banks row.
export default async function BankSettingsPage() {
  const settings = await loadBankSettings();
  return <BankSettingsForm initialSettings={settings} />;
}
