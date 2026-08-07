"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import type { AdminDonorSearchRow, OpenRequestOption } from "@/lib/db/admin-donors";
import type { PincodeOption } from "@/lib/db/pincodes";
import { searchAdminDonorsAction, revealDonorContactAction } from "@/lib/actions/admin-donor-lookup";

// A3 · Donor lookup (PRD.md §9.1), real data (Unit 41). Search results
// never contain a phone number under any circumstance (confirmed with
// the project owner) - reveal is a separate, individually logged action
// per donor, tied to a specific open request in the caller's own region
// plus a required reason (CLAUDE.md rule 3's third channel, added this
// unit). A coordinator (no home region) sees the same explicit
// "no regional list" message as A1 (Unit 37) - this screen is a browse/
// search surface like A1, not an act-on-a-known-item screen like A2, so
// it does not inherit A2's district-wide exception.
//
// **Table layout + PIN code filter (2026-08-07), user-requested** - the
// list itself widened server-side (lib/db/admin-donors.ts) to include a
// donor whose home region differs but who's listed this region as a
// secondary "also travel here" pincode, not just this component; the row
// shape/table here is a straightforward rendering of whatever
// `searchAdminDonorsAction` already scoped correctly. The reveal action
// column reuses AdminQueueBoard.tsx's own "button -> inline confirm-in-
// the-same-cell" shape (Unit 59, same session) rather than inventing a
// second pattern for the identical UI idea.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusFor(donor: AdminDonorSearchRow): { key: "available" | "paused" | "cooldown" | "unavailable"; date: string | null } {
  const now = Date.now();
  if (!donor.isAvailable) return { key: "unavailable", date: null };
  if (donor.pausedUntil && new Date(donor.pausedUntil).getTime() > now) {
    return { key: "paused", date: donor.pausedUntil };
  }
  if (donor.eligibleFrom && new Date(donor.eligibleFrom).getTime() > now) {
    return { key: "cooldown", date: donor.eligibleFrom };
  }
  return { key: "available", date: null };
}

type RevealState = { requestId: string; reason: string; error: string | null; pending: boolean };
type RevealedContact = { name: string; phone: string };

export function AdminDonorLookup({
  initialRows,
  initialHasMore,
  initialOpenRequests,
  pincodeOptions,
}: {
  initialRows: AdminDonorSearchRow[];
  initialHasMore: boolean;
  initialOpenRequests: OpenRequestOption[];
  pincodeOptions: PincodeOption[];
}) {
  const { t } = useTranslation();
  const [bloodGroupFilter, setBloodGroupFilter] = useState<BloodGroup | "all">("all");
  const [pincodeFilter, setPincodeFilter] = useState<string | "all">("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(initialRows);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [openRequests] = useState<OpenRequestOption[]>(initialOpenRequests);

  const [openReveal, setOpenReveal] = useState<Record<string, RevealState>>({});
  const [revealed, setRevealed] = useState<Record<string, RevealedContact>>({});

  async function runSearch(nextPage: number, group: BloodGroup | "all", pincode: string | "all", onlyAvailable: boolean) {
    const result = await searchAdminDonorsAction(
      {
        bloodGroup: group === "all" ? undefined : group,
        pincode: pincode === "all" ? undefined : pincode,
        availableOnly: onlyAvailable,
      },
      nextPage,
    );
    setRows(result.rows);
    setHasMore(result.hasMore);
  }

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    runSearch(page, bloodGroupFilter, pincodeFilter, availableOnly);
  }, [page, bloodGroupFilter, pincodeFilter, availableOnly]);

  function startReveal(donorId: string) {
    setOpenReveal((prev) => ({
      ...prev,
      [donorId]: { requestId: "", reason: "", error: null, pending: false },
    }));
  }

  function cancelReveal(donorId: string) {
    setOpenReveal((prev) => {
      const next = { ...prev };
      delete next[donorId];
      return next;
    });
  }

  function updateRevealField(donorId: string, field: "requestId" | "reason", value: string) {
    setOpenReveal((prev) => ({
      ...prev,
      [donorId]: { ...prev[donorId], [field]: value },
    }));
  }

  async function confirmReveal(donorId: string) {
    const state = openReveal[donorId];
    if (!state) return;
    setOpenReveal((prev) => ({ ...prev, [donorId]: { ...state, error: null, pending: true } }));

    const result = await revealDonorContactAction(donorId, state.requestId, state.reason);

    if (!result.ok) {
      const message =
        result.reason === "no_open_request"
          ? t("adminPortal.donorLookup.errorNoOpenRequest")
          : result.reason === "invalid_reason"
            ? t("adminPortal.donorLookup.errorInvalidReason")
            : result.reason === "rate_limited"
              ? t("adminPortal.donorLookup.errorRateLimited")
              : t("adminPortal.donorLookup.errorGeneric");
      setOpenReveal((prev) => ({ ...prev, [donorId]: { ...state, error: message, pending: false } }));
      return;
    }

    setRevealed((prev) => ({ ...prev, [donorId]: { name: result.name, phone: result.phone } }));
    setOpenReveal((prev) => {
      const next = { ...prev };
      delete next[donorId];
      return next;
    });
  }

  function statusLabel(donor: AdminDonorSearchRow): string {
    const { key, date } = statusFor(donor);
    switch (key) {
      case "available":
        return t("adminPortal.donorLookup.statusAvailable");
      case "paused":
        return t("adminPortal.donorLookup.statusPaused", { date: date ? formatDate(date) : "" });
      case "cooldown":
        return t("adminPortal.donorLookup.statusCooldown", { date: date ? formatDate(date) : "" });
      case "unavailable":
        return t("adminPortal.donorLookup.statusUnavailable");
    }
  }

  function pincodeOptionLabel(option: PincodeOption): string {
    return option.officeName ? `${option.code} — ${option.officeName}` : option.code;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-ink-900">{t("adminPortal.donorLookup.title")}</h1>

      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-700">
        <label className="flex items-center gap-2" htmlFor="bloodGroupFilter">
          {t("adminPortal.donorLookup.bloodGroupFilterLabel")}
          <select
            id="bloodGroupFilter"
            value={bloodGroupFilter}
            onChange={(e) => {
              setPage(0);
              setBloodGroupFilter(e.target.value as BloodGroup | "all");
            }}
            className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          >
            <option value="all">{t("adminPortal.donorLookup.allBloodGroupsOption")}</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2" htmlFor="pincodeFilter">
          {t("adminPortal.donorLookup.pincodeFilterLabel")}
          <select
            id="pincodeFilter"
            value={pincodeFilter}
            onChange={(e) => {
              setPage(0);
              setPincodeFilter(e.target.value);
            }}
            className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
          >
            <option value="all">{t("adminPortal.donorLookup.allPincodesOption")}</option>
            {pincodeOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {pincodeOptionLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => {
              setPage(0);
              setAvailableOnly(e.target.checked);
            }}
            className="accent-blood-600"
          />
          {t("adminPortal.donorLookup.availableOnlyLabel")}
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">{t("adminPortal.donorLookup.emptyMessage")}</p>
      ) : (
        <div className="w-full max-w-4xl overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-sand-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                <th className="py-2.5 px-3">{t("adminPortal.donorLookup.columnName")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.donorLookup.columnBloodGroup")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.donorLookup.columnPincode")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.donorLookup.columnStatus")}</th>
                <th className="py-2.5 px-3">{t("adminPortal.donorLookup.columnAction")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((donor) => {
                const reveal = openReveal[donor.id];
                const contact = revealed[donor.id];
                return (
                  <tr key={donor.id} className="border-b border-ink-100 text-ink-900 last:border-b-0 align-top">
                    <td className="py-2.5 px-3 font-medium">{donor.name}</td>
                    <td className="py-2.5 px-3">{donor.bloodGroup}</td>
                    <td className="py-2.5 px-3">{donor.pincode}</td>
                    <td className="py-2.5 px-3 text-ink-500">{statusLabel(donor)}</td>
                    <td className="py-2.5 px-3">
                      {contact ? (
                        <a href={`tel:${contact.phone}`} className="font-medium text-blood-600 underline">
                          {contact.phone}
                        </a>
                      ) : reveal ? (
                        <div className="flex flex-col gap-2">
                          {openRequests.length === 0 ? (
                            <p className="text-xs text-ink-500">{t("adminPortal.donorLookup.noOpenRequestsMessage")}</p>
                          ) : (
                            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700" htmlFor={`request-${donor.id}`}>
                              {t("adminPortal.donorLookup.selectRequestLabel")}
                              <select
                                id={`request-${donor.id}`}
                                value={reveal.requestId}
                                onChange={(e) => updateRevealField(donor.id, "requestId", e.target.value)}
                                className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                              >
                                <option value="">{t("adminPortal.donorLookup.selectRequestPlaceholder")}</option>
                                {openRequests.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.bloodGroup} · {r.urgency}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700" htmlFor={`reason-${donor.id}`}>
                            {t("adminPortal.donorLookup.reasonLabel")}
                            <input
                              id={`reason-${donor.id}`}
                              type="text"
                              value={reveal.reason}
                              onChange={(e) => updateRevealField(donor.id, "reason", e.target.value)}
                              placeholder={t("adminPortal.donorLookup.reasonPlaceholder")}
                              className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                            />
                          </label>
                          {reveal.error && <p className="text-xs text-blood-600">{reveal.error}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmReveal(donor.id)}
                              disabled={reveal.pending || openRequests.length === 0}
                              className="rounded-full bg-blood-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("adminPortal.donorLookup.revealConfirmButton")}
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelReveal(donor.id)}
                              disabled={reveal.pending}
                              className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("adminPortal.donorLookup.revealCancelButton")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startReveal(donor.id)}
                          className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100"
                        >
                          {t("adminPortal.donorLookup.revealButton")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded-full border border-ink-200 px-3.5 py-2 font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("adminPortal.donorLookup.prevPageButton")}
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="rounded-full border border-ink-200 px-3.5 py-2 font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("adminPortal.donorLookup.nextPageButton")}
        </button>
      </div>
    </div>
  );
}
