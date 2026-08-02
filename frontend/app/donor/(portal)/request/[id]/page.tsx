import { loadDonorRequestView } from "@/lib/actions/prospect-response";
import { RequestResponseFlow } from "@/components/donor/RequestResponseFlow";

// D3 · Request detail (PRD.md §7.1), `/donor/request/[id]` - real data
// (Unit 24). Server Component to unwrap the async `params.id` and do the
// initial server-side, session-scoped read (loadDonorRequestView) before
// handing off to the interactive Client Component - same split Unit 22's
// /request/new page and this file's own Unit 23 version already used.
export default async function DonorRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialView = await loadDonorRequestView(id);
  return <RequestResponseFlow requestId={id} initialView={initialView} />;
}
