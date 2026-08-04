import { OpsControlDashboard } from "@/components/platform/OpsControlDashboard";
import { getActingPlatformManager } from "@/lib/db/platform-portal";
import { listRegions } from "@/lib/db/platform-geography";
import { listAdmins } from "@/lib/db/platform-admins";

// Single dashboard page: create-region, create-pincode, create-admin
// sections + the admins list/reset table (small enough not to need
// sub-routes yet - easy to split later if it grows). Own
// getActingPlatformManager() call here, defensive/not redundant with the
// portal layout's own check - same "route gate covers navigation, every
// direct read re-checks" pattern app/admin/(portal)/banks/page.tsx
// already establishes.
export default async function OpsControlPage() {
  await getActingPlatformManager();

  const [regions, admins] = await Promise.all([listRegions(), listAdmins()]);

  return <OpsControlDashboard initialRegions={regions} initialAdmins={admins} />;
}
