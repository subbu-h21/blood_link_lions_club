import { AdminRequestDetail } from "@/components/admin/AdminRequestDetail";
import { loadAdminRequestDetail } from "@/lib/actions/admin-request-detail";

// A2 · Request detail (PRD.md §9.1), real data (Unit 39). Server
// Component now that a real async read justifies the split (same
// precedent as A1/Unit 37, D3/S4/B4 before it) - unwraps the async
// `params.id` and does the initial scoped read server-side.
export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialDetail = await loadAdminRequestDetail(id);

  return <AdminRequestDetail requestId={id} initialDetail={initialDetail} />;
}
