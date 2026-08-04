import { AdminLoginFlow } from "@/components/auth/AdminLoginFlow";

// A1-A6 live under /admin itself (Unit 36 onward); this is the
// email+password login gate in front of it. Submission is mocked - real
// Supabase auth (signInWithPassword / updateUser) arrives in Unit 35.
export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <AdminLoginFlow />
    </main>
  );
}
