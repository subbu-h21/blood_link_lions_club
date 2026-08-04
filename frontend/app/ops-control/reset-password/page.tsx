import { PlatformManagerForcedPasswordResetForm } from "@/components/auth/PlatformManagerForcedPasswordResetForm";

// Reached via lib/supabase/proxy.ts's gate (a platform_manager session
// with must_reset_password set) or via PlatformManagerLoginFlow's
// redirect right after login. Requires a platform_manager session -
// proxy.ts's normal role gate already covers that for this path, same as
// the rest of /ops-control/*.
export default function OpsControlResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <PlatformManagerForcedPasswordResetForm />
    </main>
  );
}
