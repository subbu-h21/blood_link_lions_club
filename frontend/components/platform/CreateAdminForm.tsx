"use client";

import { useState } from "react";
import { createAdminAction } from "@/lib/actions/platform-manager";
import type { RegionOption } from "@/lib/db/platform-geography";
import type { RotaPriority } from "@/lib/db/platform-admins";

// Hardcoded English - see components/auth/PlatformManagerLoginFlow.tsx's
// comment for why /ops-control is a deliberate exception to CLAUDE.md
// rule 8.
//
// The generated temp password is shown exactly once, right here, and
// never persisted or refetchable afterward (lib/db/platform-admins.ts's
// createAdminAccount() never writes it anywhere, matching CLAUDE.md rule
// 3's spirit for sensitive one-time secrets) - the platform manager must
// copy/relay it before navigating away or creating another admin.
export function CreateAdminForm({
  regions,
  onCreated,
}: {
  regions: RegionOption[];
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [regionId, setRegionId] = useState("");
  const [priority, setPriority] = useState<RotaPriority>(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const result = await createAdminAction({ email, fullName, regionId, priority });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRevealed({ email, tempPassword: result.tempPassword });
      setCopied(false);
      setEmail("");
      setFullName("");
      setRegionId("");
      setPriority(1);
      onCreated();
    } finally {
      setPending(false);
    }
  }

  async function copyPassword() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.tempPassword);
      setCopied(true);
    } catch {
      // Clipboard access can be denied by the browser - the password is
      // still visible on screen to copy by hand, so this isn't fatal.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-base font-semibold text-ink-900">Add a regional admin</h2>

      {revealed && (
        <div className="flex flex-col gap-2 rounded-xl border border-soil-600 bg-soil-100 p-3 text-sm">
          <p className="font-semibold text-ink-900">
            Temporary password for {revealed.email} — shown once, won&rsquo;t be shown again:
          </p>
          <code className="break-all rounded-lg bg-white px-2 py-1.5 text-sm text-ink-900">
            {revealed.tempPassword}
          </code>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyPassword}
              className="w-fit rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <span className="text-xs text-ink-500">Relay this to the admin yourself, then dismiss.</span>
          </div>
          <button
            type="button"
            onClick={() => setRevealed(null)}
            className="w-fit text-xs font-medium text-ink-500 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {regions.length === 0 ? (
        <p className="text-sm text-ink-500">Add a region first.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="admin-email">
            Email
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.org"
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="admin-name">
            Full name
            <input
              id="admin-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm font-normal text-ink-900 outline-none transition focus:border-blood-500 focus:ring-2 focus:ring-blood-100"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-700" htmlFor="admin-region">
            Region
            <select
              id="admin-region"
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
          <fieldset className="flex flex-col gap-1.5 text-sm font-medium text-ink-700">
            <legend>Rota priority for this region</legend>
            <label className="flex items-center gap-2 font-normal">
              <input
                type="radio"
                name="priority"
                checked={priority === 1}
                onChange={() => setPriority(1)}
              />
              Primary
            </label>
            <label className="flex items-center gap-2 font-normal">
              <input
                type="radio"
                name="priority"
                checked={priority === 2}
                onChange={() => setPriority(2)}
              />
              Backup
            </label>
            <p className="text-xs font-normal text-ink-500">
              If this region already has an active primary/backup, they&rsquo;ll be replaced.
            </p>
          </fieldset>
          {error && <p className="text-sm text-blood-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !regionId}
            className="w-fit rounded-full bg-blood-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blood-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create admin"}
          </button>
        </>
      )}
    </div>
  );
}
