import Link from "next/link";
import { FadeImage } from "@/components/media/FadeImage";
import { SearchForm } from "@/components/search/SearchForm";
import { getPincodeOptions } from "@/lib/actions/search";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// S1 · Search (PRD.md §6.1), the searcher tier's entry point - no auth
// anywhere on this route (CLAUDE.md rule 6). Real data (Unit 14): the
// datalist options come from a server-side read, scoped to the columns
// S1 needs (code, office_name), not a whole-table dump to the browser.
//
// UI-only addition: a landing hub above the search form with three
// public-facing entry points (find blood bank / raise a request / become
// a donor) in one prominent row, plus a smaller staff sign-in section
// below (bank / admin - not the general-public audience, per the project
// owner's explicit 2026-08-10 request) - routes and SearchForm's own
// logic are unchanged, this only adds navigation chrome around it.
export default async function Home() {
  const pincodeOptions = await getPincodeOptions();
  const locale = await getServerLocale();
  const t = dictionaries[locale].landing;

  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 overflow-hidden px-4 pt-14 pb-10 sm:pt-20 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[1fr_1.15fr] lg:gap-12 lg:overflow-visible">
        <div className="flex flex-col items-center gap-6 text-center lg:translate-y-[-4rem] lg:items-start lg:text-left">
          <FadeImage src="/lions-club-logo.webp" alt="Lions Club International" width={72} height={67} priority />
          <span className="rounded-full bg-blood-50 px-4 py-1.5 text-sm font-medium text-blood-600">
            {t.eyebrow}
          </span>
          <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-ink-900">{t.headingPart1} </span>
            <span className="text-blood-600">{t.headingPart2}</span>
          </h1>
          <p className="max-w-lg text-base text-ink-500 sm:text-lg">{t.subtitle}</p>

          <Link
            href="/donor/register"
            className="inline-flex items-center gap-2 rounded-full bg-blood-600 px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:bg-blood-700 hover:shadow-[var(--shadow-lift)]"
          >
            {t.donorTitle}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <svg
            className="pulse-divider mt-2 text-blood-600"
            width="240"
            height="24"
            viewBox="0 0 240 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M0 12H50L60 2L72 22L84 12H110L120 4L128 12H240"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* The new artwork already carries the arm in from the right, so it
            can sit naturally against the viewport edge without cropping,
            flipping, or artificial offsets.
            `hidden lg:block` - project owner asked for this hand/bag
            artwork to appear on large (PC) screens only, staying out of
            the layout entirely below `lg` rather than just shrinking. */}
        <div className="relative mx-auto hidden aspect-[5/6] w-full max-w-[34rem] lg:absolute lg:block lg:right-[min(0px,calc((100vw-72rem)/-2))] lg:bottom-0 lg:h-[min(55rem,92vh)] lg:w-[min(60rem,62vw)] lg:max-w-none">
          <FadeImage
            src="https://res.cloudinary.com/dssvyl2zn/image/upload/v1786384854/blood-link-hero-whole-blood.png"
            alt={t.heroImageAlt}
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-contain object-bottom object-right lg:translate-y-5"
          />
        </div>
      </section>

      <section id="search" className="flex flex-col items-center gap-6 bg-sand-100 px-4 py-14">
        <div className="flex max-w-md flex-col items-center gap-1.5 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink-900">{t.searchSectionTitle}</h2>
          <p className="text-sm text-ink-500">{t.searchSectionSubtitle}</p>
        </div>
        <SearchForm pincodeOptions={pincodeOptions} />
      </section>

      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 px-4 pt-14 pb-8 sm:grid-cols-3">
        <a
          href="#search"
          className="group flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blood-50 text-blood-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M20 20L15.8 15.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold text-ink-900">{t.findBloodTitle}</span>
          <span className="text-sm text-ink-500">{t.findBloodDescription}</span>
        </a>

        <Link
          href="/request/new"
          className="group flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blood-50 text-blood-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4v16M4 12h16"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold text-ink-900">{t.raiseRequestTitle}</span>
          <span className="text-sm text-ink-500">{t.raiseRequestDescription}</span>
        </Link>

        <Link
          href="/donor/register"
          className="group flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-banyan-100 text-banyan-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 21C7.5 17.5 3.5 13.9 3.5 9.6 3.5 6.5 5.9 4 9 4c1.5 0 2.9.7 3.8 1.9C13.7 4.7 15 4 16.5 4 19.6 4 22 6.5 22 9.6c0 4.3-4 7.9-8.5 11.4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold text-ink-900">{t.donorTitle}</span>
          <span className="text-sm text-ink-500">{t.donorDescription}</span>
        </Link>
      </section>

      {/* Staff sign-in - deliberately smaller/muted and below the three
          public-facing actions above: bank staff and district admins are
          not the general-public audience this page is designed for, but
          still need a reachable, unhidden entry point (unlike /ops-control,
          which stays nav-less by design - see CLAUDE.md's Platform manager
          section). UI-only change, routes/auth unchanged. */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-14">
        <p className="mb-3 text-center text-xs font-medium tracking-wide text-ink-400 uppercase">
          {t.staffSectionTitle}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/bank/login"
            className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soil-100 text-soil-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink-800">{t.bankTitle}</span>
              <span className="text-xs text-ink-500">{t.bankDescription}</span>
            </span>
          </Link>

          <Link
            href="/admin/login"
            className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3 5 6v6c0 4.2 3 7 7 9 4-2 7-4.8 7-9V6z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink-800">{t.adminTitle}</span>
              <span className="text-xs text-ink-500">{t.adminDescription}</span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
