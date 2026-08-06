"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  setAvailabilityAction,
  pauseAvailabilityAction,
  resumeAvailabilityAction,
} from "@/lib/actions/donor-portal";
import { acceptProspectAction } from "@/lib/actions/prospect-response";
import type { DonorHomeState } from "@/lib/db/donor-portal";
import type { PendingInvitation } from "@/lib/db/prospects";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const PAUSE_DAY_OPTIONS = [3, 7, 14, 30];

function isFuture(iso: string | null): boolean {
  return iso !== null && new Date(iso) > new Date();
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

// Mirrors RequestResponseFlow's own outcome set (components/donor/
// RequestResponseFlow.tsx) - the dashboard's "Willing to donate" button
// calls the exact same acceptProspectAction the notification-linked D3
// page calls, so it can land in the exact same set of outcomes and reuse
// their i18n copy verbatim rather than inventing near-duplicate strings.
type InvitationOutcome = { requestId: string; kind: "accepted" | "already_pledged" | "already_handled"; bank: string };

/**
 * D2 · Home (PRD.md §7.1), real data (Unit 24) - replaces Unit 23's
 * "preview" switch entirely (not adapted, per that unit's own README
 * flag): a real donor session has exactly one eligibility state, derived
 * from `eligibleFrom` the same way lib/matching/eligibility.ts's
 * `isDonorEligible` rule 4 does (a future `eligible_from` means still in
 * cooldown), not a mock toggle.
 */
export function DonorHomeView({
  initialState,
  initialInvitations,
}: {
  initialState: DonorHomeState;
  initialInvitations: PendingInvitation[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(initialState.isAvailable);
  const [pausedUntil, setPausedUntil] = useState(initialState.pausedUntil);
  const [pauseDays, setPauseDays] = useState(PAUSE_DAY_OPTIONS[0]);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [invitations, setInvitations] = useState(initialInvitations);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [invitationPending, setInvitationPending] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invitationOutcome, setInvitationOutcome] = useState<InvitationOutcome | null>(null);

  async function handleWillingToDonate() {
    if (!selectedRequestId) return;
    const requestId = selectedRequestId;
    setInvitationError(null);
    setInvitationPending(true);
    try {
      const result = await acceptProspectAction(requestId);
      setInvitationPending(false);
      setInvitations((rows) => rows.filter((row) => row.requestId !== requestId));
      setSelectedRequestId(null);
      if (!result.ok) {
        setInvitationOutcome({
          requestId,
          kind: result.reason === "already_pledged" ? "already_pledged" : "already_handled",
          bank: "",
        });
        return;
      }
      setInvitationOutcome({ requestId, kind: "accepted", bank: result.destinationBank });
      // A successful accept here is a genuinely new code path (2026-08-06):
      // before this dashboard existed, accepting only ever happened on
      // /donor/request/[id], a different route, so this page always got a
      // fresh server render before being seen again. `initialState.activePledge`
      // below is still whatever the server computed at this page's own
      // load time - it will not show the pledge just created by this
      // click without a real re-fetch. router.refresh() re-runs the
      // Server Component (loadDonorHome/loadMyPendingInvitations) and
      // reconciles new props into this same mounted instance - the same
      // fix lib/i18n/LocaleProvider.tsx's setLocale already uses for the
      // identical class of problem (stale server-rendered content after a
      // client action). Client-only state (invitationOutcome, the
      // optimistic `invitations` filter above) survives the refresh
      // untouched, since the component instance itself is never remounted.
      router.refresh();
    } catch {
      setInvitationPending(false);
      setInvitationError(t("donorPortal.request.submitError"));
    }
  }

  const inCooldown = isFuture(initialState.eligibleFrom);
  const paused = isFuture(pausedUntil);

  async function toggleAvailability(next: boolean) {
    const previous = isAvailable;
    setIsAvailable(next);
    setPending(true);
    setActionError(null);
    try {
      await setAvailabilityAction(next);
    } catch {
      setIsAvailable(previous);
      setActionError(t("donorPortal.home.actionError"));
    } finally {
      setPending(false);
    }
  }

  async function pause() {
    setPending(true);
    setActionError(null);
    try {
      await pauseAvailabilityAction(pauseDays);
      setPausedUntil(new Date(Date.now() + pauseDays * 24 * 60 * 60 * 1000).toISOString());
    } catch {
      setActionError(t("donorPortal.home.actionError"));
    } finally {
      setPending(false);
    }
  }

  async function resume() {
    setPending(true);
    setActionError(null);
    try {
      await resumeAvailabilityAction();
      setPausedUntil(null);
    } catch {
      setActionError(t("donorPortal.home.actionError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900">{t("donorPortal.home.title")}</h1>

      {actionError && <p className="text-sm text-blood-600">{actionError}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {inCooldown ? (
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="font-display font-semibold text-ink-900">{t("donorPortal.home.cooldownTitle")}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {t("donorPortal.home.cooldownMessage").replace("{date}", formatDate(initialState.eligibleFrom!))}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-banyan-600 bg-banyan-100 p-5">
            <h2 className="font-display font-semibold text-banyan-700">{t("donorPortal.home.eligibleTitle")}</h2>
            <p className="mt-1 text-sm text-banyan-700">{t("donorPortal.home.eligibleMessage")}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
          <label className="flex items-center gap-2 text-ink-700" htmlFor="availability-toggle">
            <input
              id="availability-toggle"
              type="checkbox"
              checked={isAvailable}
              disabled={pending}
              onChange={(e) => toggleAvailability(e.target.checked)}
              className="accent-blood-600"
            />
            {t("donorPortal.home.availabilityToggleLabel")}
          </label>

          <div className="flex flex-col gap-2 border-t border-ink-100 pt-3">
            <h2 className="font-display text-sm font-semibold text-ink-900">{t("donorPortal.home.pauseControlLabel")}</h2>
            {paused ? (
              <>
                <p className="text-sm text-ink-500">
                  {t("donorPortal.home.pausedMessage").replace("{date}", formatDate(pausedUntil!))}
                </p>
                <button
                  type="button"
                  onClick={resume}
                  disabled={pending}
                  className="w-fit text-sm font-medium text-blood-600 underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("donorPortal.home.resumeButton")}
                </button>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm text-ink-700" htmlFor="pause-days">
                  {t("donorPortal.home.pauseDaysLabel")}
                  <select
                    id="pause-days"
                    value={pauseDays}
                    onChange={(e) => setPauseDays(Number(e.target.value))}
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
                  >
                    {PAUSE_DAY_OPTIONS.map((days) => (
                      <option key={days} value={days}>
                        {t("donorPortal.home.pauseDaysOption").replace("{days}", String(days))}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={pause}
                  disabled={pending}
                  className="w-fit rounded-full bg-blood-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("donorPortal.home.pauseButton")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display font-semibold text-ink-900">{t("donorPortal.home.invitationsTitle")}</h2>

        {invitationOutcome && (
          <div
            className={
              invitationOutcome.kind === "accepted"
                ? "rounded-2xl border border-banyan-600 bg-banyan-100 p-4"
                : "rounded-2xl border border-ink-100 bg-sand-100 p-4"
            }
          >
            <p className="font-display font-semibold text-ink-900">
              {invitationOutcome.kind === "accepted"
                ? t("donorPortal.request.acceptedTitle")
                : invitationOutcome.kind === "already_pledged"
                  ? t("donorPortal.request.alreadyPledgedTitle")
                  : t("donorPortal.request.alreadyHandledTitle")}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {invitationOutcome.kind === "accepted"
                ? t("donorPortal.request.acceptedMessage").replace("{bank}", invitationOutcome.bank)
                : invitationOutcome.kind === "already_pledged"
                  ? t("donorPortal.request.alreadyPledgedMessage")
                  : t("donorPortal.request.alreadyHandledMessage")}
            </p>
          </div>
        )}

        {invitationError && <p className="text-sm text-blood-600">{invitationError}</p>}

        {invitations.length === 0 ? (
          <p className="text-sm text-ink-500">{t("donorPortal.home.invitationsEmptyMessage")}</p>
        ) : (
          <>
            <p className="text-sm text-ink-500">{t("donorPortal.home.invitationsHint")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-ink-500">
                    <th className="py-2 pr-2" scope="col" />
                    <th className="py-2 pr-4" scope="col">
                      {t("donorPortal.request.bloodGroupLabel")}
                    </th>
                    <th className="py-2 pr-4" scope="col">
                      {t("donorPortal.request.destinationBankLabel")}
                    </th>
                    <th className="py-2 pr-4" scope="col">
                      {t("donorPortal.request.urgencyLabel")}
                    </th>
                    <th className="py-2 pr-4" scope="col">
                      {t("donorPortal.request.regionLabel")}
                    </th>
                    <th className="py-2 pr-4" scope="col">
                      {t("donorPortal.home.invitedOnHeader")}
                    </th>
                    <th className="py-2" scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((row) => (
                    <tr
                      key={row.requestId}
                      onClick={() => setSelectedRequestId(row.requestId)}
                      className={`cursor-pointer border-b border-ink-50 ${
                        selectedRequestId === row.requestId ? "bg-blood-50" : ""
                      }`}
                    >
                      <td className="py-2 pr-2">
                        <input
                          type="radio"
                          name="selected-invitation"
                          checked={selectedRequestId === row.requestId}
                          onChange={() => setSelectedRequestId(row.requestId)}
                          aria-label={row.bloodGroup}
                          className="accent-blood-600"
                        />
                      </td>
                      <td className="py-2 pr-4 font-medium text-ink-900">{row.bloodGroup}</td>
                      <td className="py-2 pr-4 text-ink-700">{row.destinationBank}</td>
                      <td className="py-2 pr-4 text-ink-700">
                        {row.urgency === "emergency"
                          ? t("donorPortal.request.urgencyEmergency")
                          : t("donorPortal.request.urgencyNormal")}
                      </td>
                      <td className="py-2 pr-4 text-ink-700">{row.region}</td>
                      <td className="py-2 pr-4 text-ink-500">{formatDate(row.invitedAt)}</td>
                      <td className="py-2">
                        <Link
                          href={`/donor/request/${row.requestId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-blood-600 underline"
                        >
                          {t("donorPortal.home.viewDetailsLink")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={handleWillingToDonate}
              disabled={!selectedRequestId || invitationPending}
              className="w-fit rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("donorPortal.home.willingToDonateButton")}
            </button>
          </>
        )}
      </div>

      {initialState.activePledge && (
        <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="font-display font-semibold text-ink-900">{t("donorPortal.home.activePledgeTitle")}</h2>
          <p className="text-sm text-ink-500">{initialState.activePledge.destinationBank}</p>
          <Link href="/donor/pledge" className="w-fit text-sm font-medium text-blood-600 underline">
            {t("donorPortal.home.viewPledgeLink")}
          </Link>
        </div>
      )}
    </div>
  );
}
