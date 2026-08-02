import { ShortageBoard } from "@/components/bank/ShortageBoard";
import { loadActiveBankShortages } from "@/lib/actions/bank-shortages";

// B2 · Post shortage (PRD.md §8.1) - real data (Unit 12). Posting only
// creates the bank_shortages row; notification wiring needs the matching
// engine (M3).
export default async function BankShortagePage() {
  const shortages = await loadActiveBankShortages();
  return <ShortageBoard initialShortages={shortages} />;
}
