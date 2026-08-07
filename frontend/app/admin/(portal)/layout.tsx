import Link from "next/link";
import { getAdminContext } from "@/lib/db/admin-portal";
import { BlockedUserError } from "@/lib/db/profiles";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { AdminPushToggle } from "@/components/admin/AdminPushToggle";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// Route group, not a URL segment - /admin still resolves to
// (portal)/page.tsx. Keeps the authenticated shell (nav + admin header)
// off /admin/login and /admin/reset-password, which live as siblings
// outside this group and must render before/without an admin-portal
// session - same pattern as app/bank/(portal)/layout.tsx.
//
// No role check here (this unit's own scope limit, mirroring Unit 10) -
// lib/supabase/proxy.ts already gates every /admin/* path except
// login/reset-password to admin/coordinator sessions; duplicating that
// check here would be a second source of truth for the same decision.
//
// Nav is 6 items (Queue/Donors/Banks/Reports/Audit/Metrics), not 7 - A2
// (request detail, /admin/request/[id]) is a dynamic per-row route
// reached from A1, not a persistent nav destination, same treatment as
// D3/B4's dynamic routes in Units 19/27. A5/A6 are stub placeholders
// until M5 (Units 47-50), per this unit's own task text - shown to every
// admin/coordinator session equally; A6's real coordinator-only
// restriction is a visible label (Unit 49), not a hidden nav link,
// matching CLAUDE.md's own "hiding nav links is not sufficient" framing.
// Metrics (Unit 56) is admin/coordinator alike, no narrower gate - PRD.md
// §14 doesn't restrict this to coordinators the way A6 is.
export default async function AdminPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  const t = dictionaries[locale].adminPortal;

  let admin;
  try {
    admin = await getAdminContext();
  } catch (error) {
    if (error instanceof BlockedUserError) {
      return (
        <div className="flex min-h-full flex-col bg-sand-100">
          <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
            <span className="text-sm text-ink-500" />
            <SignOutButton />
          </header>
          <main className="flex-1 p-6">
            <div className="flex max-w-sm flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
              <h1 className="font-display text-lg font-semibold text-ink-900">{t.blockedTitle}</h1>
              <p className="text-ink-500">{t.blockedMessage}</p>
            </div>
          </main>
        </div>
      );
    }
    throw error;
  }

  const roleLabel = admin.role === "coordinator" ? t.roleCoordinator : t.roleAdmin;
  const headerLabel = admin.regionName
    ? t.headerWithRegion.replace("{role}", roleLabel).replace("{region}", admin.regionName)
    : t.headerNoRegion.replace("{role}", roleLabel);

  const navLinkClass =
    "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-blood-50 hover:text-blood-600";

  return (
    <div className="flex min-h-full flex-col bg-sand-100">
      <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
        <span className="font-display text-sm font-semibold text-ink-900">{headerLabel}</span>
        <div className="flex items-center gap-2">
          <AdminPushToggle />
          <SignOutButton />
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-ink-100 bg-white px-4 py-2">
        <Link href="/admin" className={navLinkClass}>
          {t.navQueue}
        </Link>
        <Link href="/admin/donors" className={navLinkClass}>
          {t.navDonors}
        </Link>
        <Link href="/admin/banks" className={navLinkClass}>
          {t.navBanks}
        </Link>
        <Link href="/admin/reports" className={navLinkClass}>
          {t.navReports}
        </Link>
        <Link href="/admin/audit" className={navLinkClass}>
          {t.navAudit}
        </Link>
        <Link href="/admin/metrics" className={navLinkClass}>
          {t.navMetrics}
        </Link>
      </nav>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
