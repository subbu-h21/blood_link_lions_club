import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The only client allowed to query application tables. Uses the secret
// key (server-only env, never the browser) - RLS is enabled on every
// table as a backstop (see Unit 04's migration) but this client bypasses
// it, same trust level as the old service_role key. Import only from
// lib/db/*; never from a Client Component (CLAUDE.md rule 1).
export function createDbClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
