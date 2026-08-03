import { percentage } from "@/lib/metrics/stats";

export type Tier1HitRateResult = {
  /** null when there's no counted sample at all (nothing to divide by). */
  ratePercent: number | null;
  /** How many search_logs rows actually had an answer (excludes nulls). */
  sampleSize: number;
};

/**
 * Tier 1 hit rate (PRD.md §14 row 6, SPEC.md §9: "stock found, no request
 * raised"). `stockFound` is `search_logs.stock_found` (new column, Unit
 * 55) - null for any search with no blood_group specified, and for every
 * row logged before this column existed (no fabricated backfill,
 * confirmed with the project owner). Both null cases are excluded from
 * both the numerator and denominator, not counted as misses - counting
 * them as misses would understate the rate for a reason that has nothing
 * to do with whether stock data is worth maintaining.
 */
export function tier1HitRate(stockFoundValues: (boolean | null)[]): Tier1HitRateResult {
  const counted = stockFoundValues.filter((v): v is boolean => v !== null);
  const hits = counted.filter((v) => v).length;
  return { ratePercent: percentage(hits, counted.length), sampleSize: counted.length };
}
