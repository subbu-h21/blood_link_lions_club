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
 * server-side fetch (app/(public)/page.tsx) for the datalist; resolution
 * itself happens on blur via resolveLocationAction (Unit 14's real
 * pincodes lookup), not per-keystroke - shows the region confirmation
 * PRD.md describes before the separate, explicit "Search" action.
 */
export function SearchForm({ pincodeOptions }: { pincodeOptions: PincodeOption[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(BLOOD_GROUPS[0]);
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  const [resolving, setResolving] = useState(false);
  const [noMatch, setNoMatch] = useState(false);

  async function resolve() {
    if (!location.trim()) {
      setResolved(null);
      setNoMatch(false);
      return;
    }
    setResolving(true);
    const result = await resolveLocationAction(location);
    setResolving(false);
    setResolved(result);
    setNoMatch(!result);
  }

  function search() {
    if (!resolved) return;
    const params = new URLSearchParams({
      regionId: resolved.regionId,
      region: resolved.regionName,
      bloodGroup,
      component: COMPONENT,
      location,
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
            setResolved(null);
            setNoMatch(false);
          }}
          onBlur={resolve}
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
      {resolving && <p className="text-sm text-ink-500">{t("search.s1.resolving")}</p>}
      {resolved && (
        <p className="rounded-lg bg-banyan-100 px-3 py-2 text-sm text-banyan-700">
          {t("search.s1.regionConfirm").replace("{region}", resolved.regionName)}
        </p>
      )}
      {noMatch && <p className="text-sm text-blood-600">{t("search.s1.noMatch")}</p>}
      <button
        type="button"
        onClick={search}
        disabled={!resolved || resolving}
        className="mt-1 rounded-full bg-blood-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("search.s1.searchButton")}
      </button>
    </div>
  );
}
