import Link from "next/link";
import { getBankStaffContext, BankSuspendedError } from "@/lib/db/bank-portal";
import { BlockedUserError } from "@/lib/db/profiles";
import { SignOutButton } from "@/components/bank/SignOutButton";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// Route group, not a URL segment - /bank still resolves to
// (portal)/page.tsx. Keeps the authenticated shell (nav + bank header) off
// /bank/login and /bank/reset-password, which live as siblings outside
// this group and must render before/without a bank-portal session.
//
// No role check here (Unit 10's own scope limit) - lib/supabase/proxy.ts
// already gates every /bank/* path except login/reset-password to
// bank_staff sessions; duplicating that check here would be a second
// source of truth for the same decision.
//
// A suspended bank (Unit 43, A4) gets a specific message instead of every
// B1-B5 page underneath rendering - `getBankStaffContext` throws
// `BankSuspendedError` (via `getActingBankStaff`, the one function every
// bank-portal action already calls), caught here rather than left to
// surface as a bare error page. Still logged in, still able to sign out -
// just blocked from the portal's own content, same spirit as the forced-
// password-reset gate blocking everything except the reset screen itself.
export default async function BankPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  const t = dictionaries[locale].bankPortal;

  let bank;
  try {
    bank = await getBankStaffContext();
  } catch (error) {
    if (error instanceof BankSuspendedError || error instanceof BlockedUserError) {
      const isBlocked = error instanceof BlockedUserError;
      return (
        <div className="flex min-h-full flex-col bg-sand-100">
          <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
            <span className="text-sm text-ink-500" />
            <SignOutButton />
          </header>
          <main className="flex-1 p-6">
            <div className="flex max-w-sm flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
              <h1 className="font-display text-lg font-semibold text-ink-900">
                {isBlocked ? t.blockedTitle : t.suspendedTitle}
              </h1>
              <p className="text-ink-500">{isBlocked ? t.blockedMessage : t.suspendedMessage}</p>
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
        <span className="font-display text-sm font-semibold text-ink-900">
          {bank ? t.bankLabel.replace("{name}", bank.bankName) : null}
        </span>
        <SignOutButton />
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-ink-100 bg-white px-4 py-2">
        <Link href="/bank" className={navLinkClass}>
          {t.navStock}
        </Link>
        <Link href="/bank/shortage" className={navLinkClass}>
          {t.navShortage}
        </Link>
        <Link href="/bank/prospects" className={navLinkClass}>
          {t.navProspects}
        </Link>
        <Link href="/bank/settings" className={navLinkClass}>
          {t.navSettings}
        </Link>
      </nav>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
