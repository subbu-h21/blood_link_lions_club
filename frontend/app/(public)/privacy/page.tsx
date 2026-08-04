import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// Privacy notice (PRD.md §11.1: "reachable from every portal", "named
// grievance contact published"; §11.2: consent wording). Public, no auth
// anywhere on this route (same spirit as CLAUDE.md rule 6 - a privacy
// policy gated behind login defeats its own purpose). Server Component
// reading the dictionary directly (Unit 10's own precedent for
// server-rendered translated text with no client interactivity of its
// own) - static content, no schema, no data fetch.
export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const t = dictionaries[locale].privacyPage;

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-5 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t.title}</h1>
        <p className="text-sm text-ink-700">{t.intro}</p>

        <section className="flex flex-col gap-1">
          <h2 className="font-display font-semibold text-ink-900">{t.whatWeCollectTitle}</h2>
          <p className="text-sm text-ink-700">{t.whatWeCollectBody}</p>
        </section>

        <section className="flex flex-col gap-1">
          <h2 className="font-display font-semibold text-ink-900">{t.whoSeesItTitle}</h2>
          <p className="text-sm text-ink-700">{t.whoSeesItBody}</p>
        </section>

        <section className="flex flex-col gap-1">
          <h2 className="font-display font-semibold text-ink-900">{t.yourRightsTitle}</h2>
          <p className="text-sm text-ink-700">{t.yourRightsBody}</p>
        </section>

        <section className="flex flex-col gap-1">
          <h2 className="font-display font-semibold text-ink-900">{t.grievanceTitle}</h2>
          <p className="text-sm text-ink-700">{t.grievanceBody}</p>
        </section>
      </div>
    </main>
  );
}
