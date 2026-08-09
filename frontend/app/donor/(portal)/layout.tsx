import Link from "next/link";
import { SignOutButton } from "@/components/donor/SignOutButton";
import { getActingDonor } from "@/lib/db/donor-portal";
import { BlockedUserError } from "@/lib/db/profiles";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// Route group, not a URL segment - /donor still resolves to
// (portal)/page.tsx. Keeps the authenticated shell (nav) off
// /donor/register, which lives as a sibling outside this group and must
// render before/without a donor-role session - same pattern as
// app/bank/(portal)/layout.tsx.
//
// No role check here - lib/supabase/proxy.ts already gates every
// /donor/* path except /donor/register to donor sessions; duplicating
// that check here would be a second source of truth for the same
// decision.
//
// This layout never needed donor-scoped data of its own before (unlike
// bank/admin, which show a name/region in the header) - it now calls
// getActingDonor() defensively anyway (Unit 48), purely to catch
// BlockedUserError before any page underneath renders, same "one shared
// gate, not per-page checks" reasoning as app/bank/(portal)/layout.tsx's
// own BankSuspendedError catch (Unit 43).
export default async function DonorPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  const t = dictionaries[locale].donorPortal;

  let donor;
  try {
    donor = await getActingDonor();
  } catch (error) {
    if (error instanceof BlockedUserError) {
      return (
        <div className="flex min-h-full flex-col bg-sand-100">
          <header className="flex items-center justify-end border-b border-ink-100 bg-white px-6 py-3">
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

  const navLinkClass =
    "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-700 transition hover:bg-blood-50 hover:text-blood-600";

  return (
    <div className="flex min-h-full flex-col bg-sand-100">
      <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
        <span className="font-display text-sm font-semibold text-ink-900">{donor.fullName}</span>
        <SignOutButton />
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-ink-100 bg-white px-4 py-2">
        <Link href="/donor" className={navLinkClass}>
          {t.navHome}
        </Link>
        <Link href="/donor/pledge" className={navLinkClass}>
          {t.navPledge}
        </Link>
        <Link href="/donor/history" className={navLinkClass}>
          {t.navHistory}
        </Link>
        <Link href="/donor/settings" className={navLinkClass}>
          {t.navSettings}
        </Link>
      </nav>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
