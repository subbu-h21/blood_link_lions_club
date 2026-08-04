import { PlatformManagerLoginFlow } from "@/components/auth/PlatformManagerLoginFlow";

// Email+password login gate in front of /ops-control. Listed in
// lib/supabase/proxy.ts's ungated-login carve-out (same treatment as
// /admin/login, /bank/login) - otherwise the role gate would redirect an
// anonymous visitor away before this page itself ever rendered.
export default function OpsControlLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <PlatformManagerLoginFlow />
    </main>
  );
}
