import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session refresh only - no redirect/role logic here. CLAUDE.md rule 6:
// search stays public, no auth wall of any kind. Unit 05 extends this
// same file to add role-based portal gating on top of the refreshed
// session; it does not replace it.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add code between createServerClient and getClaims() - a
  // mistake here can make users randomly logged out (Supabase's own
  // warning on this pattern).
  await supabase.auth.getClaims();

  return response;
}
