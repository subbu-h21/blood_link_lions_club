import { getPlatformManagerContext } from "@/lib/db/platform-portal";
import { BlockedUserError } from "@/lib/db/profiles";
import { SignOutButton } from "@/components/platform/SignOutButton";

// Route group, not a URL segment - /ops-control still resolves to
// (portal)/page.tsx. Keeps the authenticated shell off /ops-control/login
// and /ops-control/reset-password, which live as siblings outside this
// group - same pattern as app/admin/(portal)/layout.tsx and
// app/bank/(portal)/layout.tsx.
//
// No role check here - lib/supabase/proxy.ts already gates every
// /ops-control/* path except login/reset-password to platform_manager
// sessions; duplicating that check here would be a second source of
// truth for the same decision (same reasoning app/admin/(portal)/
// layout.tsx's own comment gives).
//
// Hardcoded English - see components/auth/PlatformManagerLoginFlow.tsx's
// comment for why /ops-control is a deliberate exception to CLAUDE.md
// rule 8.
export default async function OpsControlPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let manager;
  try {
    manager = await getPlatformManagerContext();
  } catch (error) {
    if (error instanceof BlockedUserError) {
      return (
        <div className="flex min-h-full flex-col bg-sand-100">
          <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
            <span className="text-sm text-ink-500" />
            <SignOutButton />
          </header>
          <main className="flex-1 p-6">
            <div className="flex max-w-sm flex-col gap-2 rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-soft)]">
              <h1 className="font-display text-lg font-semibold text-ink-900">Account blocked</h1>
              <p className="text-ink-500">This account has been blocked. Contact the Lions Club directly.</p>
            </div>
          </main>
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="flex min-h-full flex-col bg-sand-100">
      <header className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-3">
        <span className="font-display text-sm font-semibold text-ink-900">{manager.fullName}</span>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
