import { AdminForcedPasswordResetForm } from "@/components/auth/AdminForcedPasswordResetForm";

// Reached via lib/supabase/proxy.ts's gate (any admin/coordinator session
// with must_reset_password set) or via AdminLoginFlow's redirect right
// after a first login. Requires an admin/coordinator session - proxy.ts's
// normal role gate already covers that for this path, same as the rest
// of /admin/*.
export default function AdminResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <AdminForcedPasswordResetForm />
    </main>
  );
}
