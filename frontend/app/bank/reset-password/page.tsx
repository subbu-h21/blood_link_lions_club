import { ForcedPasswordResetForm } from "@/components/auth/ForcedPasswordResetForm";

// Reached via lib/supabase/proxy.ts's gate (any bank_staff session with
// must_reset_password set) or via BankLoginFlow's redirect right after a
// first login. Requires a bank_staff session — proxy.ts's normal role
// gate already covers that for this path, same as the rest of /bank/*.
export default function BankResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ForcedPasswordResetForm />
    </main>
  );
}
