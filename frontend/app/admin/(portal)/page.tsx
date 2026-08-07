import { AdminQueueBoard } from "@/components/admin/AdminQueueBoard";
import { AdminMyCases } from "@/components/admin/AdminMyCases";
import { getActingAdmin } from "@/lib/db/admin-portal";
import { getAdminQueue, getEscalationThresholds, getMyCases } from "@/lib/db/requests";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// A1 · Queue (PRD.md §9.1), real data (Unit 37) + My Cases (Unit 59,
// 2026-08-07, same page - confirmed with the project owner, not a
// separate nav tab). Server Component now that a real async read
// justifies the split (Unit 36's own note: "the split happens once Unit
// 37 adds a real fetch to justify it"), same precedent as S4/D3/B4's own
// real-wiring units. Scoped strictly to the acting admin's own regionId,
// resolved server-side from the session - never a client-supplied region
// (CLAUDE.md rule 2).
//
// A coordinator has no home region (SPEC.md §3 item 1: district-wide
// role, not region-scoped) - shown a plain explanatory empty state for
// the Queue half instead of querying with a null region, which would
// return zero rows either way (requests.region_id is NOT NULL) but
// silently, without telling the coordinator why their queue is always
// empty. My Cases, unlike the Queue, is owner-scoped rather than
// region-scoped (`getMyCases` reads `owner_admin_id`, not `regionId`) -
// a coordinator can still own a request via A2's own district-wide
// override, so it renders for them too, not folded into the "no region"
// branch.
export default async function AdminQueuePage() {
  const caller = await getActingAdmin();
  const { regionId } = caller;

  const locale = await getServerLocale();
  const t = dictionaries[locale].adminPortal.queue;

  if (!regionId) {
    const myCases = await getMyCases(caller);
    return (
      <div className="flex flex-col gap-8">
        <div className="flex max-w-sm flex-col gap-2">
          <h1 className="font-display text-lg font-semibold text-ink-900">{t.title}</h1>
          <p className="text-ink-500">{t.noRegionMessage}</p>
        </div>
        <AdminMyCases initialRows={myCases} />
      </div>
    );
  }

  const [rows, thresholds, myCases] = await Promise.all([
    getAdminQueue(regionId),
    getEscalationThresholds(),
    getMyCases(caller),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <AdminQueueBoard initialRows={rows} escalationThresholds={thresholds} />
      <AdminMyCases initialRows={myCases} />
    </div>
  );
}
