/**
 * Generic, DB-free numeric helpers shared by every PRD.md §14 metric
 * (Unit 55) - same "pure logic gets its own file, separate from the
 * lib/db/ file that fetches rows and calls into it" split already
 * established by lib/matching/eligibility.ts vs lib/db/matching.ts.
 */

/** Ascending-sorted median; null on an empty input (nothing to report). */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** count/total as a 0-100 percentage; null when there's nothing to divide by. */
export function percentage(count: number, total: number): number | null {
  if (total === 0) return null;
  return (count / total) * 100;
}

export type Bucket = { label: string; count: number };

/**
 * Histograms `values` into ascending, half-open buckets: (-inf, edges[0]],
 * (edges[0], edges[1]], ..., (edges[last], +inf). `edges` must already be
 * ascending - callers own that, this doesn't re-sort them.
 */
export function bucketize(values: number[], edges: number[], labels: string[]): Bucket[] {
  if (edges.length + 1 !== labels.length) {
    throw new Error("bucketize: labels must have exactly one more entry than edges");
  }
  const counts = new Array(labels.length).fill(0);
  for (const value of values) {
    let i = 0;
    while (i < edges.length && value > edges[i]) i++;
    counts[i]++;
  }
  return labels.map((label, i) => ({ label, count: counts[i] }));
}

/** Minutes between two ISO timestamps, `to` after `from`. */
export function minutesBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / (60 * 1000);
}
