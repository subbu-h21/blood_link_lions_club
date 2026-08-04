import Link from "next/link";
import type { SearchResult } from "@/lib/serialise/search";
import { BLOOD_GROUPS } from "@/lib/serialise/blood-group";
import { dictionaries, type Locale } from "@/lib/i18n/locale";

/**
 * S2 · Results (PRD.md §6.1), `/search`. Real data (Unit 14) - `result`
 * comes from a server-side, region-scoped read (app/(public)/search/
 * page.tsx calling getSearchResultsAction), never fetched client-side.
 * Server-rendered - no interactivity here beyond plain links/tel: calls,
 * so no client bundle needed. Reads the dictionary directly (same
 * pattern as Unit 10's portal layout) since useTranslation()'s Context
 * only works in Client Components.
 */
export function SearchResults({
  result,
  bloodGroup,
  locale,
}: {
  result: SearchResult | null;
  bloodGroup: string | null;
  locale: Locale;
}) {
  const t = dictionaries[locale].search.s2;

  if (!result) {
    return (
      <div className="flex flex-col gap-3 p-6 max-w-sm">
        <p className="text-sm text-ink-500">{t.noSearchYet}</p>
        <Link href="/#search" className="text-sm font-medium text-blood-600 underline">
          {t.backToSearch}
        </Link>
      </div>
    );
  }

  const { region, banks, adjacentRegions } = result;

  return (
    <div className="flex flex-col gap-6 p-4 pb-28 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink-900">
          {t.resultsTitle.replace("{region}", region.name)}
        </h1>
        <Link href="/#search" className="text-sm font-medium text-blood-600 underline">
          {t.changeSearch}
        </Link>
      </div>

      {banks.length === 0 ? (
        <p className="text-sm text-ink-500">{t.noBanks}</p>
      ) : (
        <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
          {banks.map((bank) => {
            const orderedStock = BLOOD_GROUPS.map(
              (group) => bank.stock.find((row) => row.bloodGroup === group) ?? null,
            );
            const freshestAgeHours = Math.min(...bank.stock.map((row) => row.ageHours));

            return (
              <div key={bank.id} className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-ink-900">{bank.name}</h2>
                    <p className="text-sm text-ink-500">{bank.address}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                      bank.isOpenNow ? "bg-banyan-100 text-banyan-700" : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    {bank.isOpenNow ? t.openBadge : t.closedBadge}
                  </span>
                </div>

                <a href={`tel:${bank.phone}`} className="w-fit text-sm text-blood-600 underline">
                  {t.callButton.replace("{phone}", bank.phone)}
                </a>

                <p className="text-right text-xs text-soil-700">
                  {freshestAgeHours < 1
                    ? t.updatedJustNow
                    : t.updatedHoursAgo.replace("{hours}", String(Math.floor(freshestAgeHours)))}
                </p>

                <div className="overflow-x-auto rounded-xl border border-ink-100">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-sand-100 text-left text-xs text-ink-500">
                        <th className="py-2 px-3 font-normal">{t.groupHeader}</th>
                        {BLOOD_GROUPS.map((group) => (
                          <th key={group} className="py-2 px-3 text-center font-normal">
                            {group}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-ink-100">
                        <td className="py-2 px-3 text-ink-900">
                          {dictionaries[locale].search.s1.componentWholeBlood}
                        </td>
                        {orderedStock.map((row, i) => (
                          <td
                            key={BLOOD_GROUPS[i]}
                            className={`py-2 px-3 text-center ${BLOOD_GROUPS[i] === bloodGroup ? "bg-blood-50" : ""}`}
                          >
                            <span className={row && row.units > 0 && !row.isStale ? "text-banyan-700" : "text-ink-500"}>
                              {row ? row.units : "–"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adjacentRegions.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm text-ink-500">{t.adjacentLabel}</p>
          <div className="flex flex-wrap gap-2">
            {adjacentRegions.map((adjacent) => {
              const params = new URLSearchParams({
                regionId: adjacent.id,
                region: adjacent.name,
                component: "whole_blood",
                location: adjacent.name,
              });
              if (bloodGroup) params.set("bloodGroup", bloodGroup);
              return (
                <Link
                  key={adjacent.id}
                  href={`/search?${params.toString()}`}
                  className="rounded-full border border-ink-200 px-3 py-1 text-sm text-ink-700 transition hover:border-blood-500 hover:text-blood-600"
                >
                  {adjacent.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-ink-100 bg-white p-4">
        <Link
          href="/request/new"
          className="inline-block w-full rounded-full bg-blood-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-blood-700 sm:w-auto"
        >
          {t.raiseRequestCta}
        </Link>
      </div>
    </div>
  );
}
