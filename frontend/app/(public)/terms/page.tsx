import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

// Terms of service (PRD.md §11.3: "Selling or buying blood is illegal in
// India. Terms of service must prohibit it explicitly"). Public, no auth -
// same reasoning as the privacy notice page. Server Component reading the
// dictionary directly, static content only.
export default async function TermsPage() {
  const locale = await getServerLocale();
  const t = dictionaries[locale].termsPage;

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-5 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t.title}</h1>
        <p className="text-sm text-ink-700">{t.intro}</p>

        <section className="flex flex-col gap-1">
          <h2 className="font-display font-semibold text-ink-900">{t.prohibitedTitle}</h2>
          <p className="text-sm text-ink-700">{t.prohibitedBody}</p>
          <p className="text-sm text-ink-700">{t.noPaymentsBody}</p>
        </section>

        <section className="flex flex-col gap-1">
          <p className="text-sm text-ink-700">{t.reportBody}</p>
        </section>
      </div>
    </main>
  );
}
