import { createDbClient } from "@/lib/db/client";
import { median, percentage, bucketize, type Bucket } from "@/lib/metrics/stats";
import {
  firstAcceptanceMinutes,
  acceptanceToDonationMinutes,
  classifyProspectOutcome,
  adminResponseMinutes,
  type ProspectForMetrics,
} from "@/lib/metrics/requests";
import { tier1HitRate } from "@/lib/metrics/search";
import type { RequestStage } from "@/lib/serialise/stage";

// Generous single-query caps (CLAUDE.md rule 4 - no read in this codebase
// is truly unbounded, even an internal aggregation like this one). This
// project serves one Lions Club district; a full historical dataset
// comfortably fits under these for years - same "generous but explicit"
// reasoning as MAX_ESCALATION_CANDIDATES/MAX_QUEUE_ROWS elsewhere. Revisit
// with real pagination if a region's history ever approaches these.
const MAX_REQUESTS = 20000;
const MAX_PROSPECTS = 100000;
const MAX_SEARCH_LOGS = 100000;

const RESPONSE_BUCKET_EDGES_MINUTES = [60, 240, 720, 1440]; // 1h, 4h, 12h, 24h
const RESPONSE_BUCKET_LABELS = ["<=1h", "1-4h", "4-12h", "12-24h", ">24h"];

export type Tier1HitRateMetric = {
  ratePercent: number | null;
  sampleSize: number;
  /** Earliest `searched_at` actually counted - null when sampleSize is 0.
   * Unit 57's dashboard must show this alongside the rate, not just a
   * bare percentage (confirmed with the project owner) - `stock_found`
   * only exists from this unit onward, so a rate with no visible window
   * would silently read as all-time when it isn't. */
  sampleSince: string | null;
};

export type DonorResponseMonth = {
  month: string; // "YYYY-MM"
  totalInvited: number;
  declinedPercent: number | null;
  ignoredPercent: number | null;
};

export type AdminResponseTimeMetric = {
  buckets: Bucket[];
  medianMinutes: number | null;
  sampleSize: number;
};

export type PlatformMetrics = {
  prospectsPerSuccessfulDonation: number | null;
  percentRequestsResolved: number | null;
  medianRequestToFirstAcceptanceMinutes: number | null;
  medianAcceptanceToDonationMinutes: number | null;
  percentClosedFoundElsewhere: number | null;
  tier1HitRate: Tier1HitRateMetric;
  donorResponseByMonth: DonorResponseMonth[];
  adminResponseTimeDistribution: AdminResponseTimeMetric;
};

/**
 * PRD.md §14 / SPEC.md §9's eight metrics, computed fresh from
 * requests/prospects (Unit 16), search_logs (Unit 07), and the two
 * columns added by this unit's own migration (`search_logs.stock_found`,
 * `requests.owner_assigned_at`). Read-only, no UI, no new tables (this
 * unit's own scope limit) - the two column additions were confirmed with
 * the project owner as the minimum needed to make tier-1 hit rate and
 * admin response time real rather than approximated (see
 * prompts/README.md's Unit 55 entry for the full reasoning).
 *
 * Deliberately does NOT compute or return a registered-donor count
 * anywhere - PRD.md §14 states outright it is "not a success metric."
 *
 * All the actual math (median/percentage/classification) lives in
 * lib/metrics/* as pure, DB-free functions - this file only fetches rows
 * and shapes them, same split as lib/db/matching.ts vs
 * lib/matching/eligibility.ts.
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const db = createDbClient();

  const { data: requests, error: requestsError } = await db
    .from("requests")
    .select("id, stage, close_reason, created_at, admin_notified_at, owner_assigned_at")
    .limit(MAX_REQUESTS);
  if (requestsError) throw requestsError;

  const { data: prospects, error: prospectsError } = await db
    .from("prospects")
    .select("id, request_id, status, invited_at, responded_at, outcome_at")
    .limit(MAX_PROSPECTS);
  if (prospectsError) throw prospectsError;

  const { data: searchLogs, error: searchLogsError } = await db
    .from("search_logs")
    .select("stock_found, searched_at")
    .limit(MAX_SEARCH_LOGS);
  if (searchLogsError) throw searchLogsError;

  const requestStageById = new Map<string, RequestStage>(
    requests.map((r) => [r.id as string, r.stage as RequestStage]),
  );

  const prospectsByRequest = new Map<string, ProspectForMetrics[]>();
  for (const p of prospects) {
    const shaped: ProspectForMetrics = {
      status: p.status as ProspectForMetrics["status"],
      respondedAt: p.responded_at as string | null,
      outcomeAt: p.outcome_at as string | null,
    };
    const list = prospectsByRequest.get(p.request_id as string) ?? [];
    list.push(shaped);
    prospectsByRequest.set(p.request_id as string, list);
  }

  // 1. Prospects per successful donation
  const donatedCount = prospects.filter((p) => p.status === "donated").length;
  const prospectsPerSuccessfulDonation = donatedCount === 0 ? null : prospects.length / donatedCount;

  // 2. % of requests reaching resolved (denominator: every request ever
  // raised, in-flight or terminal alike)
  const percentRequestsResolved = percentage(
    requests.filter((r) => r.stage === "resolved").length,
    requests.length,
  );

  // 3. Median request -> first acceptance
  const firstAcceptanceDeltas = requests
    .map((r) => firstAcceptanceMinutes(r.created_at as string, prospectsByRequest.get(r.id as string) ?? []))
    .filter((v): v is number => v !== null);
  const medianRequestToFirstAcceptanceMinutes = median(firstAcceptanceDeltas);

  // 4. Median acceptance -> donation
  const acceptanceToDonationDeltas = prospects
    .map((p) =>
      acceptanceToDonationMinutes({
        status: p.status as ProspectForMetrics["status"],
        respondedAt: p.responded_at as string | null,
        outcomeAt: p.outcome_at as string | null,
      }),
    )
    .filter((v): v is number => v !== null);
  const medianAcceptanceToDonationMinutes = median(acceptanceToDonationDeltas);

  // 5. % closed found_elsewhere. Denominator is every request ever raised,
  // matching metric 2's own phrasing pattern ("% requests reaching X") -
  // a documented judgment call (prompts/README.md), PRD.md §14 doesn't
  // literally say "of closed requests" vs "of all requests."
  const percentClosedFoundElsewhere = percentage(
    requests.filter((r) => r.stage === "closed" && r.close_reason === "found_elsewhere").length,
    requests.length,
  );

  // 6. Tier 1 hit rate
  const stockFoundValues = searchLogs.map((s) => s.stock_found as boolean | null);
  const tier1 = tier1HitRate(stockFoundValues);
  const countedSearchedAt = searchLogs
    .filter((s) => s.stock_found !== null)
    .map((s) => s.searched_at as string);
  const sampleSince =
    countedSearchedAt.length === 0
      ? null
      : countedSearchedAt.reduce((earliest, at) => (at < earliest ? at : earliest), countedSearchedAt[0]);

  // 7. Donor decline/ignore rate over time - monthly buckets keyed off
  // invited_at's own calendar month (YYYY-MM), the same monthly-bucketing
  // convention `donors.notif_month` already established (Unit 22).
  const monthBuckets = new Map<string, { total: number; declined: number; ignored: number }>();
  for (const p of prospects) {
    const month = (p.invited_at as string).slice(0, 7);
    const bucket = monthBuckets.get(month) ?? { total: 0, declined: 0, ignored: 0 };
    bucket.total++;
    const stage = requestStageById.get(p.request_id as string);
    if (stage) {
      const shaped: ProspectForMetrics = {
        status: p.status as ProspectForMetrics["status"],
        respondedAt: p.responded_at as string | null,
        outcomeAt: p.outcome_at as string | null,
      };
      const outcome = classifyProspectOutcome(shaped, stage);
      if (outcome === "declined") bucket.declined++;
      if (outcome === "ignored") bucket.ignored++;
    }
    monthBuckets.set(month, bucket);
  }
  const donorResponseByMonth: DonorResponseMonth[] = [...monthBuckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, b]) => ({
      month,
      totalInvited: b.total,
      declinedPercent: percentage(b.declined, b.total),
      ignoredPercent: percentage(b.ignored, b.total),
    }));

  // 8. Admin response time distribution
  const adminResponseDeltas = requests
    .map((r) => adminResponseMinutes(r.admin_notified_at as string | null, r.owner_assigned_at as string | null))
    .filter((v): v is number => v !== null);
  const adminResponseTimeDistribution: AdminResponseTimeMetric = {
    buckets: bucketize(adminResponseDeltas, RESPONSE_BUCKET_EDGES_MINUTES, RESPONSE_BUCKET_LABELS),
    medianMinutes: median(adminResponseDeltas),
    sampleSize: adminResponseDeltas.length,
  };

  return {
    prospectsPerSuccessfulDonation,
    percentRequestsResolved,
    medianRequestToFirstAcceptanceMinutes,
    medianAcceptanceToDonationMinutes,
    percentClosedFoundElsewhere,
    tier1HitRate: { ...tier1, sampleSince },
    donorResponseByMonth,
    adminResponseTimeDistribution,
  };
}
