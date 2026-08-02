import { StockDashboard } from "@/components/bank/StockDashboard";
import { loadBankStock } from "@/lib/actions/bank-stock";

// B1 · Stock dashboard (PRD.md §8.1) - real data (Unit 12). Initial read
// happens server-side, scoped to the acting bank_staff's own bank
// (CLAUDE.md rule 1/4) - never a whole-table fetch.
export default async function BankStockPage() {
  const rows = await loadBankStock();
  return <StockDashboard initialRows={rows} />;
}
