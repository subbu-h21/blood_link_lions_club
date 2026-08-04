"use client";

import { useState } from "react";
import { createRegionAction } from "@/lib/actions/platform-manager";
import type { RegionOption } from "@/lib/db/platform-geography";

// Hardcoded English - see components/auth/PlatformManagerLoginFlow.tsx's
// comment for why /ops-control is a deliberate exception to CLAUDE.md
// rule 8. Add-only for this build (no edit/deactivate yet, per the
// explicit scope decision for this feature).
export function CreateRegionForm({ onCreated }: { onCreated: (region: RegionOption) => void }) {
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      const result = await createRegionAction({ name, district, state });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated(result.region);
      setName("");
      setDistrict("");
      setState("");
      setSuccess(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-base font-semibold text-ink-900">Add a region</h2>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="region-name">
        Region name
        <input
          id="region-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sirsi"
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="region-district">
        District
        <input
          id="region-district"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="e.g. Uttara Kannada"
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="region-state">
        State
        <input
          id="region-state"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="e.g. Karnataka"
          className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
        />
      </label>
      {error && <p className="text-sm text-blood-600">{error}</p>}
      {success && <p className="text-sm text-banyan-700">Region added.</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-fit rounded-full bg-blood-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add region"}
      </button>
    </div>
  );
}
