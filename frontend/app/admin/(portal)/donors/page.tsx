import { AdminDonorLookup } from "@/components/admin/AdminDonorLookup";
import { searchAdminDonorsAction, loadOpenRequestsForRegionAction } from "@/lib/actions/admin-donor-lookup";
import { getPincodesForRegion } from "@/lib/db/pincodes";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";
import { getActingAdmin } from "@/lib/db/admin-portal";

// A3 · Donor lookup (PRD.md §9.1), real data (Unit 41). Server Component
// now that a real async read justifies the split (same precedent as A1/
// Unit 37) - a coordinator (no home region) sees an explicit message
// instead of an empty list with no explanation, same treatment as A1.
export default async function AdminDonorsPage() {
  const { regionId } = await getActingAdmin();

  const locale = await getServerLocale();
  const t = dictionaries[locale].adminPortal.donorLookup;

  if (!regionId) {
    return (
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-display text-lg font-semibold text-ink-900">{t.title}</h1>
        <p className="text-ink-500">{t.noRegionMessage}</p>
      </div>
    );
  }

  const [initialResult, initialOpenRequests, pincodeOptions] = await Promise.all([
    searchAdminDonorsAction({}, 0),
    loadOpenRequestsForRegionAction(),
    getPincodesForRegion(regionId),
  ]);

  return (
    <AdminDonorLookup
      initialRows={initialResult.rows}
      initialHasMore={initialResult.hasMore}
      initialOpenRequests={initialOpenRequests}
      pincodeOptions={pincodeOptions}
    />
  );
}
