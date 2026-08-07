import { ForgotPasswordConfirmForm } from "@/components/auth/ForgotPasswordConfirmForm";

// Self-service "Forgot password?" - step 2 of 2 (2026-08-07), the
// `redirectTo` target Supabase's own recovery email links to. The real
// session-establishing token lives in the URL fragment, which never
// reaches this Server Component at all - all of the real work happens
// client-side in ForgotPasswordConfirmForm (see its own doc comment).
export default function ForgotPasswordConfirmPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ForgotPasswordConfirmForm />
    </main>
  );
}
