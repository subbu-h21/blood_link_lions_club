"use client";

import { useState } from "react";
import { resetAdminPasswordAction } from "@/lib/actions/platform-manager";
import type { AdminRow } from "@/lib/db/platform-admins";

// Hardcoded English - see components/auth/PlatformManagerLoginFlow.tsx's
// comment for why /ops-control is a deliberate exception to CLAUDE.md
// rule 8.
//
// Same once-only temp-password reveal pattern as CreateAdminForm.tsx -
// lib/db/platform-admins.ts's resetAdminPassword() never persists the
// generated password anywhere, it's returned exactly once here.
export function AdminsList({ admins }: { admins: AdminRow[] }) {
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<{ adminId: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function resetPassword(admin: AdminRow) {
    setPending((p) => ({ ...p, [admin.id]: true }));
    setErrors((e) => ({ ...e, [admin.id]: "" }));
    const result = await resetAdminPasswordAction(admin.id);
    setPending((p) => ({ ...p, [admin.id]: false }));
    if (!result.ok) {
      setErrors((e) => ({ ...e, [admin.id]: result.error }));
      return;
    }
    setRevealed({ adminId: admin.id, tempPassword: result.tempPassword });
    setCopied(false);
  }

  async function copyPassword() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.tempPassword);
      setCopied(true);
    } catch {
      // Clipboard access can be denied - the password is still visible
      // on screen to copy by hand, so this isn't fatal.
    }
  }

  if (admins.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-base font-semibold text-ink-900">Regional admins</h2>
        <p className="text-sm text-ink-500">No regional admins yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-base font-semibold text-ink-900">Regional admins</h2>

      {revealed && (
        <div className="flex flex-col gap-2 rounded-xl border border-soil-600 bg-soil-100 p-3 text-sm">
          <p className="font-semibold text-ink-900">New temporary password — shown once, won&rsquo;t be shown again:</p>
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

      <ul className="flex flex-col gap-3">
        {admins.map((admin) => (
          <li
            key={admin.id}
            className="flex flex-col gap-2 rounded-xl border border-ink-100 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium text-ink-900">{admin.fullName || admin.email}</span>
              <span className="text-ink-500">{admin.email}</span>
              <span className="text-xs text-ink-500">
                {admin.regionName ?? "No region"}
                {admin.priority === 1 && " · Primary"}
                {admin.priority === 2 && " · Backup"}
                {admin.priority === null && admin.regionName && " · Not in active rota"}
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              {errors[admin.id] && <p className="text-xs text-blood-600">{errors[admin.id]}</p>}
              <button
                type="button"
                onClick={() => resetPassword(admin)}
                disabled={pending[admin.id]}
                className="w-fit rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending[admin.id] ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
