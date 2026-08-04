import { AdminBankManagement } from "@/components/admin/AdminBankManagement";
import { loadAdminBanks } from "@/lib/actions/admin-banks";
import { getActingAdmin } from "@/lib/db/admin-portal";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// A4 · Bank management (PRD.md §9.1), real data (Unit 43). Server
// Component now that a real async read justifies the split (same
// precedent as A1/A3). A coordinator (no home region) sees an explicit
// message, same treatment as A1/A3 - not district-wide, unlike A2.
export default async function AdminBanksPage() {
  const { regionId } = await getActingAdmin();

  const locale = await getServerLocale();
  const t = dictionaries[locale].adminPortal;

  if (!regionId) {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t.bankManagement.title}</h1>
        <p className="text-ink-500">{t.bankManagement.noRegionMessage}</p>
      </div>
    );
  }

  const banks = await loadAdminBanks();
  return <AdminBankManagement initialBanks={banks} />;
}
