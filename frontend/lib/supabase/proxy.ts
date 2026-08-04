import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Role = "searcher" | "donor" | "bank_staff" | "admin" | "coordinator" | "platform_manager";

// /donor/register, /bank/login, and /admin/login are deliberately
// ungated, like app/(public)/ - they're the entry points an anonymous
// visitor uses to become a `searcher`/`donor` (Units 03/04), to
// authenticate as bank staff (Unit 08), or to authenticate as
// admin/coordinator (Unit 34) - same carve-out Unit 08 needed for
// /bank/login, found the same way (an anonymous visit would otherwise be
// redirected away by the role gate below before the login page itself
// ever renders). Gating any of these would block the flow itself.
// The rest of /donor/*, /bank/*, /admin/* require the listed roles.
// Order matters now (Unit 50): `.find()` returns the first matching
// entry, so /admin/audit (coordinator-only, PRD.md §9.1 A6) must be
// listed before the general /admin entry, or the broader admin/
// coordinator gate would always match first and this narrower one would
// never be reached. redirectTo defaults to the existing "/" (or
// "/donor/register" for /donor) behaviour when omitted - only the new
// audit gate overrides it, since an admin rejected from this one
// coordinator-only sub-route still has a perfectly valid /admin session
// to go back to, unlike a genuine cross-portal mismatch.
const PORTAL_ROLES: { prefix: string; roles: Role[]; redirectTo?: string }[] = [
  { prefix: "/admin/audit", roles: ["coordinator"], redirectTo: "/admin" },
  { prefix: "/donor", roles: ["donor"] },
  { prefix: "/bank", roles: ["bank_staff"] },
  { prefix: "/admin", roles: ["admin", "coordinator"] },
  // Platform manager (Units beyond 58): a fifth, hidden portal - not
  // linked from any nav, not reachable by any other role. The real
  // protection is this gate, not the route name (CLAUDE.md rule 1: the
  // role comes from the server-verified JWT claim, same as every other
  // portal here).
  { prefix: "/ops-control", roles: ["platform_manager"] },
];

// Forced password-reset-on-first-login (Unit 09), keyed by portal prefix so
// Unit 35 (admin/coordinator forced reset) adds a row here, not a second
// mechanism. Whichever role matches PORTAL_ROLES above for this prefix, if
// their must_reset_password claim is true, every path under the prefix
// except resetPath itself redirects to resetPath - never the reverse, or
// the reset page would redirect to itself.
const RESET_PASSWORD_GATES: { prefix: string; resetPath: string }[] = [
  { prefix: "/bank", resetPath: "/bank/reset-password" },
  { prefix: "/admin", resetPath: "/admin/reset-password" },
  { prefix: "/ops-control", resetPath: "/ops-control/reset-password" },
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

  if (
    pathname.startsWith("/donor/register") ||
    pathname.startsWith("/bank/login") ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/ops-control/login")
  ) {
    return response;
  }

  const gate = PORTAL_ROLES.find((p) => pathname.startsWith(p.prefix));
  if (gate) {
    const claims = data?.claims as
      | { app_metadata?: { profile_role?: Role; must_reset_password?: boolean } }
      | undefined;
    const role = claims?.app_metadata?.profile_role;

    if (!role || !gate.roles.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = gate.redirectTo ?? (gate.prefix === "/donor" ? "/donor/register" : "/");
      return NextResponse.redirect(url);
    }

    // Matched by `pathname.startsWith`, not `g.prefix === gate.prefix` -
    // the /admin/audit gate above has its own, more specific prefix, but
    // the forced-password-reset check is a portal-wide concern (Unit 09),
    // not a per-sub-route one. Using an exact-prefix match here would
    // silently skip the reset gate for any coordinator visiting
    // /admin/audit directly with must_reset_password still true - found
    // and fixed while wiring this unit, not shipped as a real regression.
    const resetGate = RESET_PASSWORD_GATES.find((g) => pathname.startsWith(g.prefix));
    const mustReset = claims?.app_metadata?.must_reset_password === true;
    if (resetGate && mustReset && pathname !== resetGate.resetPath) {
      const url = request.nextUrl.clone();
      url.pathname = resetGate.resetPath;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
