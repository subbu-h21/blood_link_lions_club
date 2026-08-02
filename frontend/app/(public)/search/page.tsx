import { SearchResults } from "@/components/search/SearchResults";
import { getSearchResultsAction } from "@/lib/actions/search";
import { getServerLocale } from "@/lib/i18n/locale";

// S2 · Results (PRD.md §6.1) - real data (Unit 14). Every load with a
// resolvable regionId performs a real, region-scoped read and logs a
// search_logs row (PRD.md §6.2 "Every search logged"), regardless of
// entry point - direct S1 submission, an adjacent-region chip, or a
// bookmarked/shared URL all go through the same getSearchResultsAction.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ regionId?: string; bloodGroup?: string; location?: string }>;
}) {
  const { regionId, bloodGroup, location } = await searchParams;
  const locale = await getServerLocale();

  const result = regionId ? await getSearchResultsAction(regionId, bloodGroup ?? null, location ?? null) : null;

  return <SearchResults result={result} bloodGroup={bloodGroup ?? null} locale={locale} />;
}
