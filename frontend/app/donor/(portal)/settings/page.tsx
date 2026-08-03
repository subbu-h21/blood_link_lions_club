import { DonorSettingsView } from "@/components/donor/DonorSettingsView";
import { loadDonorSettings } from "@/lib/actions/donor-settings";

// D6 · Settings (PRD.md §7.1), real data (Unit 52).
export default async function DonorSettingsPage() {
  const settings = await loadDonorSettings();
  return <DonorSettingsView initialSettings={settings} />;
}
