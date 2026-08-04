import { loadDonorHistory } from "@/lib/actions/donor-history";
import { dictionaries, getServerLocale } from "@/lib/i18n/locale";

function isFuture(iso: string | null): boolean {
  return iso !== null && new Date(iso) > new Date();
}

// D5 · History (PRD.md §7.1), real data (Unit 26). No interactivity, so
// this stays a Server Component doing its own read directly (same
// pattern Unit 10's original portal screens established) - loadDonorHistory
// composes lib/db/prospects.ts's getDonationHistory (donor_id-scoped,
// never another donor's rows) with lib/db/donor-portal.ts's
// getDonorEligibleFrom, the same field D2 already reads for its own
// cooldown state (Unit 24) - same isFuture convention, not a second one.
export default async function DonorHistoryPage() {
  const { donations, eligibleFrom } = await loadDonorHistory();
  const locale = await getServerLocale();
  const t = dictionaries[locale].donorPortal.history;

  const stillInCooldown = isFuture(eligibleFrom);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">{t.title}</h1>

      <div
        className={
          stillInCooldown
            ? "rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]"
            : "rounded-2xl border border-banyan-600 bg-banyan-100 p-5"
        }
      >
        <h2 className={stillInCooldown ? "font-display font-semibold text-ink-900" : "font-display font-semibold text-banyan-700"}>
          {t.nextEligibleTitle}
        </h2>
        <p className={stillInCooldown ? "mt-1 text-sm text-ink-500" : "mt-1 text-sm text-banyan-700"}>
          {stillInCooldown ? t.nextEligibleMessage.replace("{date}", eligibleFrom!.slice(0, 10)) : t.eligibleNowMessage}
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-display font-semibold text-ink-900">{t.pastDonationsTitle}</h2>
        {donations.length === 0 ? (
          <p className="text-sm text-ink-500">{t.noDonationsMessage}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {donations.map((donation) => (
              <li
                key={donation.donatedAt}
                className="rounded-xl border border-ink-100 bg-white p-3 text-sm text-ink-900 shadow-[var(--shadow-soft)]"
              >
                {t.donatedOnLabel
                  .replace("{date}", donation.donatedAt.slice(0, 10))
                  .replace("{bank}", donation.destinationBank)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
