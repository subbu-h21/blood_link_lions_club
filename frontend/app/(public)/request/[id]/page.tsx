import { loadRequestStatus } from "@/lib/actions/request-status";
import { RequestStatusView } from "@/components/search/RequestStatusView";

// S5 · Request status (PRD.md §6.1), real data (Unit 30). Server Component
// to unwrap the async `params.id` and do the initial read
// (loadRequestStatus) before handing off to the interactive Client
// Component - same split D3/S4/B4 already established once each of those
// units added a real fetch (Units 22/24/28).
export default async function RequestStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialView = await loadRequestStatus(id);
  return (
    <main className="flex flex-1 justify-center">
      <div className="w-full max-w-sm">
        <RequestStatusView requestId={id} initialView={initialView} />
      </div>
    </main>
  );
}
