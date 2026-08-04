"use client";

import { useState } from "react";
import { CreateRegionForm } from "@/components/platform/CreateRegionForm";
import { CreatePincodeForm } from "@/components/platform/CreatePincodeForm";
import { CreateAdminForm } from "@/components/platform/CreateAdminForm";
import { AdminsList } from "@/components/platform/AdminsList";
import { loadAdminsAction } from "@/lib/actions/platform-manager";
import type { RegionOption } from "@/lib/db/platform-geography";
import type { AdminRow } from "@/lib/db/platform-admins";

// Hardcoded English - see components/auth/PlatformManagerLoginFlow.tsx's
// comment for why /ops-control is a deliberate exception to CLAUDE.md
// rule 8.
//
// Owns the region/admin lists as client state, seeded from the server
// page's own reads (app/ops-control/(portal)/page.tsx), so a newly
// created region shows up immediately in the pincode/admin dropdowns and
// a newly created (or reset) admin shows up immediately in the list,
// without a full page reload - same "receive initial*, manage local
// state" shape as components/admin/AdminBankManagement.tsx.
export function OpsControlDashboard({
  initialRegions,
  initialAdmins,
}: {
  initialRegions: RegionOption[];
  initialAdmins: AdminRow[];
}) {
  const [regions, setRegions] = useState<RegionOption[]>(initialRegions);
  const [admins, setAdmins] = useState<AdminRow[]>(initialAdmins);

  function handleRegionCreated(region: RegionOption) {
    setRegions((prev) => [...prev, region].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function refreshAdmins() {
    setAdmins(await loadAdminsAction());
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">Platform manager</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CreateRegionForm onCreated={handleRegionCreated} />
        <CreatePincodeForm regions={regions} />
        <CreateAdminForm regions={regions} onCreated={refreshAdmins} />
        <AdminsList admins={admins} />
      </div>
    </div>
  );
}
