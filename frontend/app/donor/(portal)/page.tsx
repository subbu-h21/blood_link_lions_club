import { loadDonorHome } from "@/lib/actions/donor-portal";
import { loadMyPendingInvitations } from "@/lib/actions/prospect-response";
import { DonorHomeView } from "@/components/donor/DonorHomeView";

// D2 · Home (PRD.md §7.1), real data (Unit 24). Server Component only to
// do the initial server-side read (loadDonorHome, session-derived - the
// donor id is never a URL/prop value); the Client Component owns the
// toggle/pause interactivity. Same split as Units 22/23 already
// established for this exact reason (a page needing both a server read
// and client interactivity can't be one component).
//
// loadMyPendingInvitations (2026-08-05/06) added alongside loadDonorHome
// for the same reason - the dashboard's own in-app list of this donor's
// live invitations, an alternative to "the only way to see one is a push
// notification link." Both reads are independent and session-scoped, run
// together rather than as a second round trip from the client.
export default async function DonorHomePage() {
  const [initialState, initialInvitations] = await Promise.all([loadDonorHome(), loadMyPendingInvitations()]);
  return <DonorHomeView initialState={initialState} initialInvitations={initialInvitations} />;
}
