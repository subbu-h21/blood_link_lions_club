"use client";

import { useState } from "react";
import type { StockRow } from "@/lib/serialise/stock";
import type { BloodGroup } from "@/lib/serialise/blood-group";
import { updateBankStockUnits } from "@/lib/actions/bank-stock";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

/**
 * B1 · Stock dashboard (PRD.md §8.1), wired to real data (Unit 12).
 * `initialRows` comes from a server-side fetch (app/bank/(portal)/
 * page.tsx) scoped to the acting bank_staff's own bank - never fetched
 * client-side, per CLAUDE.md rule 1. Every edit calls the
 * updateBankStockUnits server action, which resolves the bank id from
 * the session itself, so there is no bank id for a crafted request to
 * override.
 */
export function StockDashboard({ initialRows }: { initialRows: StockRow[] }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StockRow[]>(initialRows);
  const [pendingUnits, setPendingUnits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function commit(bloodGroup: BloodGroup, units: number) {
    if (!Number.isInteger(units) || units < 0) return;
    setSaving((prev) => ({ ...prev, [bloodGroup]: true }));
    setErrors((prev) => ({ ...prev, [bloodGroup]: "" }));
    try {
      const updated = await updateBankStockUnits(bloodGroup, units);
      setRows((prev) => prev.map((row) => (row.bloodGroup === bloodGroup ? updated : row)));
    } catch {
      setErrors((prev) => ({ ...prev, [bloodGroup]: t("bankPortal.stock.saveError") }));
    } finally {
      setSaving((prev) => ({ ...prev, [bloodGroup]: false }));
      setPendingUnits((prev) => {
        const next = { ...prev };
        delete next[bloodGroup];
        return next;
      });
    }
  }

  function displayUnits(row: StockRow): string {
    return pendingUnits[row.bloodGroup] ?? String(row.units);
  }

  const anyStale = rows.some((row) => row.isStale);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankPortal.stock.title")}</h1>
      {anyStale && (
        <p className="rounded-2xl bg-soil-100 px-3 py-2 text-sm text-soil-700">
          {t("bankPortal.stock.staleBanner")}
        </p>
      )}
      <div className="w-full overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-sand-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="py-2.5 px-3">{t("bankPortal.stock.groupHeader")}</th>
              <th className="py-2.5 px-3">{t("bankPortal.stock.unitsHeader")}</th>
              <th className="py-2.5 px-3">{t("bankPortal.stock.updatedHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const group = row.bloodGroup as BloodGroup;
              const isSaving = Boolean(saving[row.bloodGroup]);
              return (
                <tr
                  key={row.bloodGroup}
                  className={`border-b border-ink-100 last:border-b-0 ${row.isStale ? "text-ink-500" : "text-ink-900"}`}
                >
                  <td className="py-2.5 px-3 font-medium">
                    {row.bloodGroup}
                    <span className="block text-xs font-normal text-ink-500">{t("bankPortal.stock.componentWholeBlood")}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={t("bankPortal.stock.decrementAriaLabel")}
                        onClick={() => commit(group, row.units - 1)}
                        className="h-7 w-7 rounded-full border border-ink-200 text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={row.units <= 0 || isSaving}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={displayUnits(row)}
                        onChange={(e) =>
                          setPendingUnits((prev) => ({ ...prev, [row.bloodGroup]: e.target.value }))
                        }
                        onBlur={(e) => {
                          const units = Number(e.target.value);
                          if (units !== row.units) commit(group, units);
                          else setPendingUnits((prev) => ({ ...prev, [row.bloodGroup]: "" }));
                        }}
                        disabled={isSaving}
                        className="w-16 rounded-lg border border-ink-200 py-1 text-center text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                      />
                      <button
                        type="button"
                        aria-label={t("bankPortal.stock.incrementAriaLabel")}
                        onClick={() => commit(group, row.units + 1)}
                        className="h-7 w-7 rounded-full border border-ink-200 text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={isSaving}
                      >
                        +
                      </button>
                    </div>
                    {errors[row.bloodGroup] && (
                      <p className="mt-1 text-xs text-blood-600">{errors[row.bloodGroup]}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {row.ageHours < 1
                      ? t("bankPortal.stock.updatedJustNow")
                      : t("bankPortal.stock.updatedHoursAgo").replace("{hours}", String(Math.floor(row.ageHours)))}
                    {row.isStale && (
                      <span className="ml-2 rounded-full bg-sand-100 px-1.5 py-0.5 text-xs text-ink-500">
                        {t("bankPortal.stock.staleLabel")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
