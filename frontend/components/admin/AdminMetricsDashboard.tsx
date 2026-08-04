"use client";

import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { PlatformMetrics } from "@/lib/db/metrics";

// A · Metrics dashboard (PRD.md §14, §9.1 "Operational visibility"), real
// data (Unit 57). `metrics` comes from a server-side read
// (app/admin/(portal)/metrics/page.tsx calling
// lib/actions/admin-metrics.ts's loadPlatformMetrics, which itself calls
// Unit 55's getPlatformMetrics directly - no metric calculation
// reimplemented here, per this unit's own constraint) - same
// server-Component-loads/client-Component-renders split as
// AdminModeration/AdminAuditLog. No date-range control: Unit 55's
// getPlatformMetrics has no date-range parameter to control (it computes
// over full history), and this unit's own task text is explicit that
// adding a control the underlying query doesn't support would imply a
// filter that isn't actually applied - the `fullHistoryNote` banner below
// says so plainly instead.
//
// Registered-donor count is deliberately absent from every tile below -
// PRD.md §14's own explicit "not a success metric," the same constraint
// Unit 55's real module holds to.
function bucketLabel(t: (key: string) => string, label: string): string {
  switch (label) {
    case "<=1h":
      return t("adminPortal.metrics.bucketUpTo1h");
    case "1-4h":
      return t("adminPortal.metrics.bucket1To4h");
    case "4-12h":
      return t("adminPortal.metrics.bucket4To12h");
    case "12-24h":
      return t("adminPortal.metrics.bucket12To24h");
    default:
      return t("adminPortal.metrics.bucketOver24h");
  }
}

export function AdminMetricsDashboard({ metrics }: { metrics: PlatformMetrics }) {
  const { t } = useTranslation();

  function formatPercent(value: number | null): string {
    return value === null ? t("adminPortal.metrics.notEnoughData") : `${value.toFixed(1)}%`;
  }

  function formatMinutes(value: number | null): string {
    return value === null
      ? t("adminPortal.metrics.notEnoughData")
      : t("adminPortal.metrics.durationMinutes", { value: Math.round(value) });
  }

  const maxBucketCount = Math.max(1, ...metrics.adminResponseTimeDistribution.buckets.map((b) => b.count));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.metrics.title")}</h1>
      <p className="-mt-4 text-sm text-ink-500">{t("adminPortal.metrics.fullHistoryNote")}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.prospectsPerDonationLabel")}</p>
          <p className="font-display text-2xl font-semibold text-ink-900">
            {metrics.prospectsPerSuccessfulDonation === null
              ? t("adminPortal.metrics.notEnoughData")
              : metrics.prospectsPerSuccessfulDonation.toFixed(1)}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.resolvedRateLabel")}</p>
          <p className="font-display text-2xl font-semibold text-ink-900">{formatPercent(metrics.percentRequestsResolved)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.foundElsewhereLabel")}</p>
          <p className="font-display text-2xl font-semibold text-ink-900">{formatPercent(metrics.percentClosedFoundElsewhere)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.firstAcceptanceLabel")}</p>
          <p className="font-display text-2xl font-semibold text-ink-900">{formatMinutes(metrics.medianRequestToFirstAcceptanceMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.acceptanceToDonationLabel")}</p>
          <p className="font-display text-2xl font-semibold text-ink-900">{formatMinutes(metrics.medianAcceptanceToDonationMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.tier1Label")}</p>
          <p className="font-display text-2xl font-semibold text-ink-900">{formatPercent(metrics.tier1HitRate.ratePercent)}</p>
          {metrics.tier1HitRate.sampleSince && (
            <p className="mt-1 text-xs text-ink-500">
              {t("adminPortal.metrics.tier1SampleSince", { date: metrics.tier1HitRate.sampleSince.slice(0, 10) })}
              {" · "}
              {t("adminPortal.metrics.tier1SampleSize", { count: metrics.tier1HitRate.sampleSize })}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 font-display font-semibold text-ink-900">{t("adminPortal.metrics.donorResponseTitle")}</h2>
        {metrics.donorResponseByMonth.length === 0 ? (
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.notEnoughData")}</p>
        ) : (
          <table className="w-full max-w-xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2 pr-4">{t("adminPortal.metrics.donorResponseColumnMonth")}</th>
                <th className="py-2 pr-4">{t("adminPortal.metrics.donorResponseColumnTotal")}</th>
                <th className="py-2 pr-4">{t("adminPortal.metrics.donorResponseColumnDeclined")}</th>
                <th className="py-2 pr-4">{t("adminPortal.metrics.donorResponseColumnIgnored")}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.donorResponseByMonth.map((row) => (
                <tr key={row.month} className="border-b border-ink-100 text-ink-900 last:border-b-0">
                  <td className="py-2 pr-4">{row.month}</td>
                  <td className="py-2 pr-4">{row.totalInvited}</td>
                  <td className="py-2 pr-4">{formatPercent(row.declinedPercent)}</td>
                  <td className="py-2 pr-4">{formatPercent(row.ignoredPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 font-display font-semibold text-ink-900">{t("adminPortal.metrics.adminResponseTitle")}</h2>
        {metrics.adminResponseTimeDistribution.sampleSize === 0 ? (
          <p className="text-sm text-ink-500">{t("adminPortal.metrics.notEnoughData")}</p>
        ) : (
          <>
            <div className="flex max-w-xl flex-col gap-2">
              {metrics.adminResponseTimeDistribution.buckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-3 text-sm text-ink-700">
                  <span className="w-28 shrink-0">{bucketLabel(t, bucket.label)}</span>
                  <div className="h-4 flex-1 rounded-full bg-sand-100">
                    <div
                      className="h-4 rounded-full bg-blood-600"
                      style={{ width: `${(bucket.count / maxBucketCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right">{bucket.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-500">
              {t("adminPortal.metrics.adminResponseMedianLabel")}: {formatMinutes(metrics.adminResponseTimeDistribution.medianMinutes)}
              {" · "}
              {t("adminPortal.metrics.adminResponseSampleLabel", { count: metrics.adminResponseTimeDistribution.sampleSize })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
