"use client";

import { useState } from "react";
import Link from "next/link";
import {
  markProspectArrivedAction,
  setProspectScreeningOutcomeAction,
} from "@/lib/actions/bank-prospects";
import type { IncomingProspect } from "@/lib/db/bank-prospects";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

/**
 * B3 · Incoming prospects (PRD.md §8.1), real data (Unit 28).
 * `initialProspects` comes from a server-side read
 * (loadIncomingProspects) already scoped to the acting bank_staff's own
 * bank - never the full regional donor list (this unit's own constraint).
 * "Arrived" is an optimistic-on-success local status flip (accepted ->
 * screening); "Rejected"/"No show" remove the row entirely rather than
 * leaving it inertly displayed the way Unit 27's mock did, since a real
 * reload would no longer return it either (getIncomingProspects only ever
 * selects accepted/screening rows) - same "list reflects backend truth"
 * precedent as ShortageBoard's resolve action (Unit 12). "Donated" still
 * navigates to B4 (`/bank/prospects/[id]/confirm`) rather than acting
 * here directly, unchanged from Unit 27.
 */
export function IncomingProspects({ initialProspects }: { initialProspects: IncomingProspect[] }) {
  const { t } = useTranslation();
  const [prospects, setProspects] = useState<IncomingProspect[]>(initialProspects);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function markArrived(id: string) {
    setActionError(null);
    setPendingId(id);
    try {
      const result = await markProspectArrivedAction(id);
      if (!result.ok) {
        setActionError(t("bankPortal.prospects.arrivedError"));
        return;
      }
      setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status: "screening" } : p)));
    } catch {
      setActionError(t("bankPortal.prospects.arrivedError"));
    } finally {
      setPendingId(null);
    }
  }

  async function setOutcome(id: string, outcome: "rejected" | "no_show") {
    setActionError(null);
    setPendingId(id);
    try {
      const result = await setProspectScreeningOutcomeAction(id, outcome);
      if (!result.ok) {
        setActionError(
          t(outcome === "rejected" ? "bankPortal.prospects.rejectedError" : "bankPortal.prospects.noShowError"),
        );
        return;
      }
      setProspects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setActionError(
        t(outcome === "rejected" ? "bankPortal.prospects.rejectedError" : "bankPortal.prospects.noShowError"),
      );
    } finally {
      setPendingId(null);
    }
  }

  function statusLabel(status: IncomingProspect["status"]): string {
    return status === "accepted" ? t("bankPortal.prospects.statusAccepted") : t("bankPortal.prospects.statusScreening");
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("bankPortal.prospects.title")}</h1>

      {actionError && <p className="text-sm text-blood-600">{actionError}</p>}

      {prospects.length === 0 ? (
        <p className="text-sm text-ink-500">{t("bankPortal.prospects.emptyMessage")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {prospects.map((prospect) => (
            <li
              key={prospect.id}
              className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-ink-900">{prospect.donorName}</span>
                <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                  {statusLabel(prospect.status)}
                </span>
              </div>
              <p>
                <span className="text-ink-500">{t("bankPortal.prospects.phoneLabel")}: </span>
                <a href={`tel:${prospect.donorPhone}`} className="font-medium text-blood-600 underline">
                  {prospect.donorPhone}
                </a>
              </p>
              <p>
                <span className="text-ink-500">{t("bankPortal.prospects.bloodGroupLabel")}: </span>
                {prospect.bloodGroup}
              </p>
              <p>
                <span className="text-ink-500">{t("bankPortal.prospects.requestRefLabel")}: </span>
                {prospect.requestRef}
              </p>

              {prospect.status === "accepted" && (
                <button
                  type="button"
                  onClick={() => markArrived(prospect.id)}
                  disabled={pendingId === prospect.id}
                  className="w-fit rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("bankPortal.prospects.arrivedButton")}
                </button>
              )}

              {prospect.status === "screening" && (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/bank/prospects/${prospect.id}/confirm`}
                    className="rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700"
                  >
                    {t("bankPortal.prospects.donatedButton")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOutcome(prospect.id, "rejected")}
                    disabled={pendingId === prospect.id}
                    className="rounded-full border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("bankPortal.prospects.rejectedButton")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome(prospect.id, "no_show")}
                    disabled={pendingId === prospect.id}
                    className="rounded-full border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("bankPortal.prospects.noShowButton")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
