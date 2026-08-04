import { BankLoginFlow } from "@/components/auth/BankLoginFlow";

// B1 (stock dashboard) lives at /bank itself (Unit 11); this is the
// email+password login gate in front of it. Submission is mocked — real
// Supabase auth (signInWithPassword / updateUser) arrives in Unit 09.
export default function BankLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <BankLoginFlow />
    </main>
  );
}
