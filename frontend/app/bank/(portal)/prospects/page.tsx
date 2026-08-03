import { IncomingProspects } from "@/components/bank/IncomingProspects";
import { loadIncomingProspects } from "@/lib/actions/bank-prospects";

// B3 · Incoming prospects (PRD.md §8.1), real data (Unit 28) - donors
// scheduled to attend this bank, scoped to the acting bank_staff's own
// bank (Unit 27 was mock-only UI).
export default async function BankProspectsPage() {
  const prospects = await loadIncomingProspects();
  return <IncomingProspects initialProspects={prospects} />;
}
