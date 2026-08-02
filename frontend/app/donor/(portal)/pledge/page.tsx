import { loadActivePledge } from "@/lib/actions/prospect-response";
import { PledgeView } from "@/components/donor/PledgeView";

// D4 · Active pledge (PRD.md §7.1), real data (Unit 26). Server Component
// only to do the initial server-side, session-scoped read
// (loadActivePledge) - the Client Component owns the cancel-pledge
// interactivity. Same split as every other donor-portal screen needing
// both a server read and client interactivity (Units 22/23/24).
export default async function DonorPledgePage() {
  const pledge = await loadActivePledge();
  return <PledgeView initialPledge={pledge} />;
}
