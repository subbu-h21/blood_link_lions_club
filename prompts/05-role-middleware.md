# Unit 05 — Role-based route gating

**Milestone:** M1
**Depends on:** 04

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §3 (middleware note — written before the Next.js rename
below), §5 (Permissions matrix header note: "Enforce every row
server-side").

## Task
Next.js 16 deprecated and renamed `middleware.ts`/`middleware()` to
`proxy.ts`/`proxy()` (Node.js runtime by default now — see Next.js's own
"Migration to Proxy" docs). Unit 04 already created `frontend/proxy.ts` and
`frontend/lib/supabase/proxy.ts` (`updateSession`) for session-refresh only,
with no redirect/role logic. **Extend `lib/supabase/proxy.ts`, do not
create a new file** — add role-based rejection after the existing
`getClaims()` call: a `donor` role hitting `/bank/*` or `/admin/*` gets
redirected, not just hidden nav links. Build this generically for all five
roles (`searcher`, `donor`, `bank_staff`, `admin`, `coordinator`) now, even
though bank/admin accounts don't exist until Units 09 and 35 — the gate
must already be correct when they arrive. Public/searcher routes
(`app/(public)/`) must never redirect an anonymous visitor — only
`raising a request` needs a session at all, and that is enforced by Unit
04's auth flow, not this gate.

## Read before writing
`frontend/lib/supabase/proxy.ts` and `frontend/proxy.ts` (Unit 04) — extend
the existing `updateSession` function, matcher, and cookie-sync logic
exactly as-is. Unit 02's `profiles.role` check constraint (exact allowed
values).

## Constraints
1. **The browser never talks to the database.** The gate reads the role
from the server-verified session claims, never from a client-supplied
value.
Scope limit: this is authorization only — it does not render any portal UI.
Do not touch the session-refresh logic Unit 04 already verified working.

## Reference
PRD.md §3, §5. CLAUDE.md "Conventions" (`lib/i18n/`). Paste current Next.js
docs for the Proxy file convention before implementing if anything here
looks stale — this renamed once already (v16.0.0) and could again.

## Verify when done
- [ ] A donor-role session hitting `/bank` or `/admin` is redirected
      server-side, not client-side
- [ ] Each of the five roles maps to exactly the portal(s) PRD.md §5 grants it
- [ ] An anonymous visitor to `/` or `/request/new` is never redirected
- [ ] existing features still work
- [ ] npm run lint passes
