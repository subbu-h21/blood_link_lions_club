"use client";

import { useState } from "react";
import { createPincodeAction } from "@/lib/actions/platform-manager";
import type { RegionOption } from "@/lib/db/platform-geography";

// Hardcoded English - see components/auth/PlatformManagerLoginFlow.tsx's
// comment for why /ops-control is a deliberate exception to CLAUDE.md
// rule 8. Add-only for this build - re-adding an existing code is
// rejected by lib/db/pincodes.ts's createPincode() rather than silently
// moving it to a different region.
export function CreatePincodeForm({ regions }: { regions: RegionOption[] }) {
  const [code, setCode] = useState("");
  const [regionId, setRegionId] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [taluk, setTaluk] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      const result = await createPincodeAction({ code, regionId, officeName, taluk, district });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCode("");
      setOfficeName("");
      setTaluk("");
      setDistrict("");
      setSuccess(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-base font-semibold text-ink-900">Add a PIN code</h2>
      {regions.length === 0 ? (
        <p className="text-sm text-ink-500">Add a region first.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="pincode-code">
            PIN code
            <input
              id="pincode-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 581401"
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="pincode-region">
            Region
            <select
              id="pincode-region"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            >
              <option value="">Select a region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="pincode-office">
            Office name (optional)
            <input
              id="pincode-office"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="pincode-taluk">
            Taluk (optional)
            <input
              id="pincode-taluk"
              value={taluk}
              onChange={(e) => setTaluk(e.target.value)}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="pincode-district">
            District (optional)
            <input
              id="pincode-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>
          {error && <p className="text-sm text-blood-600">{error}</p>}
          {success && <p className="text-sm text-banyan-700">PIN code added.</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !regionId}
            className="w-fit rounded-full bg-blood-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Adding..." : "Add PIN code"}
          </button>
        </>
      )}
    </div>
  );
}
