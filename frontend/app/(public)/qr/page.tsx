import Link from "next/link";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// QR sticker landing page. Scanned from a physical sticker put up around
// town, so this is deliberately NOT the homepage (`/`): no bank/admin
// staff-login tiles, no search form inline - just three large tap targets
// that hand off to the existing public flows. Server component, same
// pattern as app/(public)/page.tsx, since there's no interactivity here
// beyond plain links (root layout already provides the language toggle
// and header/footer, so this page only needs its own content).
//
// Route mapping (confirmed with project owner, since this app has no
// separate public "search donor" feature - donor visibility is gated by
// CLAUDE.md Rule 3):
//   "Search blood bank" -> /#search  (S1 search form on the homepage)
//   "Search donor"      -> /request/new  (raise a request; this is what
//                           actually surfaces/matches donors)
//   "Donate blood"      -> /donor/register
export default async function QrLandingPage() {
  const locale = await getServerLocale();
  const t = dictionaries[locale].qrLanding;

  return (
    <main className="relative isolate flex flex-1 flex-col items-center overflow-hidden px-4 pt-12 pb-16 text-center sm:pt-16">

      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <span className="rounded-full bg-blood-50 px-4 py-1.5 text-sm font-medium text-blood-600">
            {t.eyebrow}
          </span>
          <h1 className="max-w-sm font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            {t.heading}
          </h1>
          <p className="text-sm text-ink-500">{t.subtitle}</p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-4">
          <Link
            href="/#search"
            className="group flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blood-50 text-blood-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-lg font-semibold text-ink-900">{t.searchBankTitle}</span>
              <span className="text-sm text-ink-500">{t.searchBankDescription}</span>
            </span>
          </Link>

          <Link
            href="/request/new"
            className="group flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blood-50 text-blood-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="M20 20L15.8 15.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-lg font-semibold text-ink-900">{t.searchDonorTitle}</span>
              <span className="text-sm text-ink-500">{t.searchDonorDescription}</span>
            </span>
          </Link>

          <Link
            href="/donor/register"
            className="group flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-banyan-100 text-banyan-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21C7.5 17.5 3.5 13.9 3.5 9.6 3.5 6.5 5.9 4 9 4c1.5 0 2.9.7 3.8 1.9C13.7 4.7 15 4 16.5 4 19.6 4 22 6.5 22 9.6c0 4.3-4 7.9-8.5 11.4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-lg font-semibold text-ink-900">{t.donateTitle}</span>
              <span className="text-sm text-ink-500">{t.donateDescription}</span>
            </span>
          </Link>
        </div>

        <p className="flex flex-col gap-0.5 text-xs text-ink-500">
          <span>{t.initiativeLabel}</span>
          <span>{t.sponsorLabel}</span>
        </p>


      </div>
    </main>
  );
}
