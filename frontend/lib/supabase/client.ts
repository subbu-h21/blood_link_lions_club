import { createBrowserClient } from "@supabase/ssr";

// Auth only (signInWithOtp / verifyOtp) — never used for table access.
// CLAUDE.md rule 1: the browser never talks to the database. Table reads
// and writes go through lib/db/, called from server actions/routes.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
