import { getPincodeOptions } from "@/lib/actions/search";
import { RaiseRequestFlow } from "@/components/search/RaiseRequestFlow";

// S4 raise-request (PRD.md §6.1) - a standalone entry point (2026-08-04),
// no longer a hand-off from search: RaiseRequestFlow resolves its own
// pincode/region/bank list itself (its own "location" step), the same
// way S1's own page does, rather than trusting a `regionId`/`bloodGroup`
// query string that made a direct or bookmarked visit a dead end.
// `pincodeOptions` is the exact same datalist source app/(public)/
// page.tsx already fetches for S1 - no new read.
export default async function RaiseRequestPage() {
  const pincodeOptions = await getPincodeOptions();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <RaiseRequestFlow pincodeOptions={pincodeOptions} />
    </main>
  );
}
