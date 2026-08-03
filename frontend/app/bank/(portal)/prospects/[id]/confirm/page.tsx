import { loadConfirmDonationDetail } from "@/lib/actions/bank-prospects";
import { ConfirmDonationForm } from "@/components/bank/ConfirmDonationForm";

// B4 · Confirm donation (PRD.md §8.1), real data (Unit 28). Server
// Component to unwrap the async `params.id` and do the initial
// server-side, bank-scoped read (loadConfirmDonationDetail) before
// handing off to the interactive Client Component - same split D3/S4
// already established (Units 22/24), which Unit 27's own note flagged
// this file would need once a real fetch replaced the mock.
export default async function ConfirmDonationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialDetail = await loadConfirmDonationDetail(id);
  return <ConfirmDonationForm prospectId={id} initialDetail={initialDetail} />;
}
