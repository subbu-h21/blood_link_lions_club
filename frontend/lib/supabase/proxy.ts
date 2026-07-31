import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Role = "searcher" | "donor" | "bank_staff" | "admin" | "coordinator";

// /donor/register is deliberately ungated, like app/(public)/ - it's the
// entry point an anonymous visitor uses to become a `searcher`/`donor`
// (Units 03/04). Gating it would block the registration flow itself.
// The rest of /donor/*, /bank/*, /admin/* require the listed roles.
// Order doesn't matter here since /donor/register is checked separately.
const PORTAL_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/donor", roles: ["donor"] },
  { prefix: "/bank", roles: ["bank_staff"] },
  { prefix: "/admin", roles: ["admin", "coordinator"] },
];

// Session refresh + role-based portal gating. CLAUDE.md rule 1: the role
// comes from the server-verified JWT claim (app_metadata.profile_role,
// injected by the custom_access_token_hook migration), never from a
// client-supplied value.
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
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/donor/register")) {
    return response;
  }

  const gate = PORTAL_ROLES.find((p) => pathname.startsWith(p.prefix));
  if (gate) {
    const claims = data?.claims as
      | { app_metadata?: { profile_role?: Role } }
      | undefined;
    const role = claims?.app_metadata?.profile_role;

    if (!role || !gate.roles.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = gate.prefix === "/donor" ? "/donor/register" : "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
