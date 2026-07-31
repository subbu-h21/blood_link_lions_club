import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-aware client for Server Components/Actions - reads who is
// logged in via auth.getClaims(). Not for table access (no service-level
// privileges); that's lib/db/client.ts, called only from lib/db/*.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component - ignorable because proxy.ts
            // refreshes the session on every request.
          }
        },
      },
    },
  );
}
