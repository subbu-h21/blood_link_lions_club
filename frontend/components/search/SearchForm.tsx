"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";
import { resolveLocationAction } from "@/lib/actions/search";
import type { PincodeOption, ResolvedLocation } from "@/lib/db/pincodes";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const COMPONENT = "whole_blood";

/**
 * S1 · Search (PRD.md §6.1), `/`. No auth anywhere (CLAUDE.md rule 6) -
 * this is the entire point of tier 1. `pincodeOptions` comes from a
 * server-side fetch (app/(public)/page.tsx) for the datalist.
 *
 * Resolution used to happen on blur, before the Search click - moved
 * entirely into the Search action itself (2026-08-29, user-reported UX
 * issue): blur-triggered resolution felt inconsistent ("have to click
 * outside the box"), and the actual `router.push` navigation afterward
 * had zero feedback for however long the destination page's own
 * server-side fetch took, looking like the click did nothing. Now typing
 * does nothing but update the field; clicking Search runs the whole
 * checking-region -> not-found-or-searching sequence with visible
 * feedback at each step. `phase` replaces the old separate
 * resolved/resolving/noMatch booleans - only one of these states is ever
 * true at a time, so one variable is more honest about the state shape
 * than three that could (in the old code) never actually go out of sync
 * but had no type-level guarantee of that.
 *
 * `resolving`/`noMatch` (lib/i18n) are reused as-is, not renamed - the
 * sibling S4 raise-a-request flow (RaiseRequestFlow.tsx) uses the exact
 * same two keys for its own, unrelated, still-blur-based resolution UI;
 * changing the strings here would have silently changed that flow's
 * wording too. Only `searching` is new, since S4 has no equivalent
 * "navigating to a results page" step to word.
 */
type SearchPhase = "idle" | "checking" | "not-found" | "searching";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-ink-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function SearchForm({ pincodeOptions }: { pincodeOptions: PincodeOption[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(BLOOD_GROUPS[0]);
  const [phase, setPhase] = useState<SearchPhase>("idle");

  async function handleSearch() {
    const trimmed = location.trim();
    if (!trimmed) return;

    setPhase("checking");
    const result: ResolvedLocation | null = await resolveLocationAction(trimmed);
    if (!result) {
      setPhase("not-found");
      return;
    }

    setPhase("searching");
    const params = new URLSearchParams({
      regionId: result.regionId,
      region: result.regionName,
      bloodGroup,
      component: COMPONENT,
      location: trimmed,
    });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <h1 className="font-display text-xl font-semibold text-ink-900">{t("search.s1.title")}</h1>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="location">
        {t("search.s1.locationLabel")}
        <input
          id="location"
          list="location-options"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            if (phase !== "idle") setPhase("idle");
          }}
          placeholder={t("search.s1.locationPlaceholder")}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
        <datalist id="location-options">
          {pincodeOptions.map((loc) => (
            <option key={loc.code} value={loc.code} />
          ))}
          {pincodeOptions.map((loc) => (
            <option key={loc.officeName} value={loc.officeName} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="blood-group">
        {t("search.s1.bloodGroupLabel")}
        <select
          id="blood-group"
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-base font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        >
          {BLOOD_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="component">
        {t("search.s1.componentLabel")}
        <select
          id="component"
          value={COMPONENT}
          disabled
          className="rounded-xl border border-ink-200 bg-sand-100 px-3.5 py-2.5 text-base font-normal text-ink-500 outline-none"
        >
          <option value={COMPONENT}>{t("search.s1.componentWholeBlood")}</option>
        </select>
      </label>
      <div aria-live="polite">
        {phase === "checking" && (
          <p className="flex items-center gap-2 text-sm text-ink-500">
            <Spinner />
            {t("search.s1.resolving")}
          </p>
        )}
        {phase === "searching" && (
          <p className="flex items-center gap-2 text-sm text-ink-500">
            <Spinner />
            {t("search.s1.searching").replace("{location}", location.trim())}
          </p>
        )}
        {phase === "not-found" && <p className="text-sm text-blood-600">{t("search.s1.noMatch")}</p>}
      </div>
      <button
        type="button"
        onClick={handleSearch}
        disabled={!location.trim() || phase === "checking" || phase === "searching"}
        className="mt-1 rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("search.s1.searchButton")}
      </button>
    </div>
  );
}
