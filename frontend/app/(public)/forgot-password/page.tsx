import { ForgotPasswordRequestForm } from "@/components/auth/ForgotPasswordRequestForm";

// Self-service "Forgot password?" - step 1 of 2 (2026-08-07). Public,
// unauthenticated route (matches /bank/login, /admin/login's own
// carve-out in lib/supabase/proxy.ts) - reachable from a signed-out
// visitor by design, this is the whole point of the feature. One shared
// route for bank staff + admin/coordinator (the platform manager was
// deliberately excluded - see lib/actions/forgot-password.ts).
export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ForgotPasswordRequestForm />
    </main>
  );
}
