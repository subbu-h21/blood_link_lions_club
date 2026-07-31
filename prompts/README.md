# Build prompts — index

58 unit/review files, numbered sequentially across all six milestones from
PRD.md §13. Paste them back one at a time, in order. Each unit's file
contains its own dependencies, constraints, and verification checklist —
this file is only the index plus the open items surfaced while decomposing.

**First shippable point: end of M2**, not M3. M2 delivers a working
end-to-end "search → find blood bank stock" loop on its own — M3 is what
proves the *coordination* product, per PRD.md §13, but M2 is already usable.

---

## PRD corrections needed

Found while decomposing — not fixed here, since editing PRD.md/SPEC.md was
out of scope for this task. You should make these edits yourself.

1. **Bank/admin auth method.** PRD.md §3's Roles-and-portals table lists
   "Phone OTP, staff account" for Blood bank and "Phone OTP, elevated" for
   Admin. This is stale. CLAUDE.md's Conventions section is correct: bank
   and admin/coordinator accounts use **email + password**, are
   **admin-created / super-admin-created** (no self-signup), and password
   resets are admin-mediated, not self-service. Units 08–09 and 34–35 were
   written against the CLAUDE.md version. PRD.md §3 and its auth-related
   prose need updating to match.
2. **Next.js version.** PRD.md §2 (and Unit 01) says "Next.js 15." As of
   this build, 15 is no longer current — Next.js 16 is. Unit 01 was executed
   against **Next.js 16.2.12**. PRD.md §2 needs updating to say 16, not 15.
3. **`middleware.ts` → `proxy.ts`.** As of Next.js **v16.0.0**, the
   `middleware` file convention is deprecated and renamed to `proxy`
   (function renamed too: `export function proxy(...)`, Node.js runtime by
   default now, not Edge). PRD.md §3's "middleware" reference and Unit 05's
   original text both predate this. Unit 05 has been corrected in place
   (see its file) to extend `frontend/proxy.ts` / `frontend/lib/supabase/
   proxy.ts`, created in Unit 04, instead of creating `middleware.ts`. If
   you ever see `middleware.ts` mentioned in PRD.md or CLAUDE.md, treat it
   as stale.

---

## Project layout note

Unit 01 scaffolded the actual Next.js app into **`frontend/`**, not the repo
root, because the repo root already held `CLAUDE.md`/`PRD.md`/`SPEC.md`/
`prompts/`/`.git` and `create-next-app` refuses to run in a non-empty
directory. Every path in every unit below (`app/...`, `lib/...`) is relative
to `frontend/`. **Exception:** `supabase/migrations/` stays at the repo
root, sibling to `frontend/` — it's schema, not app code, and CLAUDE.md's
Conventions section doesn't nest it under anything. `npm run *` commands are
run from inside `frontend/`.

**Addition to CLAUDE.md's Conventions:** Unit 03 introduced a top-level
`components/` folder (`frontend/components/`) for UI shared across portals
(`components/auth/PhoneOtpFlow.tsx`, `components/i18n/LanguageToggle.tsx`).
CLAUDE.md's Conventions section never mentions this folder. Treat it as a
real addition to those conventions, not a one-off: shared, portal-agnostic
components go there, not duplicated into each portal's route folder.

Since Unit 02 added a root-level `package.json`/`package-lock.json` for db
tooling, Turbopack mis-inferred the repo root as the workspace root on
build (picked up the wrong lockfile). Fixed in Unit 03 by pinning
`turbopack.root` in `frontend/next.config.ts` to `frontend/` itself. If a
later unit sees the same "detected multiple lockfiles" warning return,
check that setting hasn't been reverted.

`npm audit` reports 12 high-severity findings on the fresh scaffold, all in
transitive build/dev tooling (eslint's `minimatch` chain, and `postcss`/
`sharp` bundled inside `next` itself for image optimisation) — not something
this project's code can fix directly. **Do not run `npm audit fix --force`**
— on this scaffold it proposes downgrading `next` to `9.3.3` and `eslint` to
`10.8.0`, which would undo this entire unit. Revisit when upstream ships
patched versions.

---

## Blocking on real data

Unit 02 seeds **placeholder geography only** (one region, three PIN codes,
one blood bank, every value marked `PLACEHOLDER`) so the build isn't stalled
waiting for it. This is not a code task: it's PIN codes actually in the
Sirsi area, the blood banks near Sirsi with real addresses/phone numbers,
and which areas border which — phone calls and an India Post PIN-code
lookup, per SPEC.md §10 item 3. Until someone (Lions Club, most likely)
collects this, the app runs on fake data. Swapping it in later is a data
change to Unit 02's seed script, not a rebuild.

**No SMS provider is configured either** (PRD.md §15 item 6, still
undecided — same "Lions Club/project must choose one" status as the real
geography data). Unit 04 uses `supabase/config.toml`'s
`[auth.sms.test_otp]` — two fixed local numbers (`+919900000001`,
`+919900000002`, both OTP `123456`) — so phone-OTP auth is testable without
real SMS. **Only those two numbers work.** Once a provider (Twilio,
MSG91, etc.) is chosen, replace `[auth.sms.test_otp]` with the matching
`[auth.sms.<provider>]` section — this is a config change, not a code
change; `lib/supabase/client.ts`'s `signInWithOtp`/`verifyOtp` calls don't
change either way.

**Local-stack quirk found getting `test_otp` working:** setting
`[auth.sms.test_otp]` alone leaves `GOTRUE_EXTERNAL_PHONE_ENABLED=false` —
phone auth stays globally off regardless of `test_otp` entries (confirmed
against the running container's env, not assumed). The CLI seems to
require an actual provider block set `enabled = true` before it flips that
flag on, even though `test_otp` short-circuits before that provider is
ever called. Workaround in `config.toml`: `[auth.sms.twilio]` with
`enabled = true` and placeholder credentials (`test_sid`/
`test_service_sid`; `auth_token` still reads from
`env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)`, export any dummy value before
`supabase start`/`db reset` or you'll get a harmless "variable is unset"
warning). If a real provider is configured later, this placeholder block
gets replaced, not added to.

---

## Open decisions

PRD.md §15 already lists eight decisions owned by the Lions Club (the seven
escalation/expiry timings, notification cap, stock freshness threshold,
donor cooldown, admins-per-region, SMS/DLT ownership, account/infra
ownership, rollout order). Not repeated here — see PRD.md §15 directly.

Two more surfaced during decomposition that PRD.md §15 doesn't cover:

1. **Account-creation flow for bank staff and admins.** CLAUDE.md states
   these accounts are "admin-created" / "super-admin-created," but no PRD
   screen (A1–A6, B1–B5) actually defines a creation UI. Units 09 and 35
   use seed-script-created test accounts to keep those milestones
   unblocked. A real flow — who creates the first admin, how a bank's staff
   account gets provisioned town by town — needs deciding before rollout
   past Sirsi, since this will happen repeatedly as new towns onboard.
2. **Report-submission entry point.** PRD.md defines a `reports` table
   (§4.6) and an admin-side moderation screen (A5, §9.1), and SPEC.md §6 S2
   mentions a "block-and-report button," but no screen (D1–D6, S1–S5)
   actually has one. Units 46–48 build the admin side only. Needs deciding
   where a donor or requester actually files a report.

---

## Implementation notes (not decisions — resolved during decomposition)

- **`lib/supabase/` vs `lib/db/` (built in Unit 04, reuse — don't
  reinvent):** CLAUDE.md's Conventions only says "`lib/db/` server-only
  queries," but auth and data access need different trust levels, so
  there are two folders, not one:
  - `lib/supabase/client.ts` / `server.ts` — the **publishable**-key
    client, session-aware, used only for `auth.*` calls
    (`signInWithOtp`/`verifyOtp`/`getClaims`) and never for `.from(table)`
    queries.
  - `lib/supabase/proxy.ts` (`updateSession`) + root `frontend/proxy.ts` —
    session-refresh only, no redirects. Unit 05 extends this file for
    role gating; it is not a new file.
  - `lib/db/client.ts` — the **secret**-key client (`SUPABASE_SECRET_KEY`,
    server-only), the *only* thing allowed to query application tables
    (`profiles`, `donors`, `requests`, etc. as they arrive). Every
    `lib/db/*.ts` file imports this, never `lib/supabase/*`.
  Later units doing server-side data access should add a new
  `lib/db/<table>.ts` file using `createDbClient()` — see
  `lib/db/profiles.ts`'s `ensureProfile` for the pattern (map snake_case
  columns to a camelCase type at the boundary, per CLAUDE.md
  Conventions).
- **Supabase API key names (Unit 01 used stale ones, corrected in Unit
  04):** current Supabase projects issue `sb_publishable_*`/`sb_secret_*`
  keys, not the legacy anon/service_role JWTs. Env vars are
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` — not
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, which is
  what Unit 01's `.env.example` originally had. If either old name shows
  up in a later unit's draft, that unit is working from stale training
  data, not this project's actual `.env.example`.
- **RLS enabled, no policies, on every Unit 02 table (Unit 04
  migration):** CLAUDE.md rule 1 says RLS is "defence in depth, never the
  primary access control" — the primary control is that only `lib/db/*`
  (secret key) touches these tables. RLS-enabled-with-no-policies means a
  publishable-key client pointed at a table by mistake gets nothing,
  rather than silently working under a permissive default. Every new
  table a later unit's migration adds should enable RLS the same way,
  even with no policies yet. **Verified directly, not assumed:** a raw
  REST call with the publishable key against `profiles` returns `42501
  permission denied`, not data.
- **`service_role` needs explicit table grants too — RLS alone isn't
  enough (Unit 04 migration):** hit `permission denied for table
  profiles` (`42501`) from `ensureProfile` against a from-scratch local
  db, even though the secret key maps to `service_role`, which has
  `BYPASSRLS`. `BYPASSRLS` skips row-level policies, not the ordinary
  Postgres table-level GRANT system — Supabase's *hosted* platform sets
  up default grants for `service_role` automatically; the local CLI
  stack, starting from a bare migration with no such setup, does not.
  Fixed by granting existing tables explicitly and adding `alter default
  privileges in schema public grant ... to service_role` so every table a
  later unit's migration creates is covered automatically — Units 07,
  16, 33, 46 should not need to repeat this.
- **`profiles.full_name` is nullable, not `NOT NULL` as PRD.md §4.2
  literally shows (Unit 04 migration):** a bare phone-verified searcher
  (raising a request, never registering) has no name-collection step
  anywhere in PRD.md's flow — only donor registration (Unit 19/20)
  collects one. `ensureProfile` (`lib/db/profiles.ts`) creates a
  `role: 'searcher'` row with `full_name: null` on first verification and
  never overwrites an existing profile's role on a repeat login.
- **i18n mechanism (built in Unit 03, reuse — don't reinvent):** no unit
  explicitly allocated building the `lib/i18n/` machinery CLAUDE.md rule 8
  requires; Unit 03 needed it first, so it lives there now. One cookie
  (`locale`, `en`/`kn`) is the single source of truth for both server and
  client: `lib/i18n/locale.ts`'s `getServerLocale()` reads it in Server
  Components (e.g. the root layout sets `<html lang>`), and
  `lib/i18n/LocaleProvider.tsx`'s `useTranslation()` reads it via React
  context in Client Components. Dictionaries are `lib/i18n/en.ts` /
  `lib/i18n/kn.ts`, both typed against the `Dictionary` type exported from
  `en.ts` (not `as const` + `satisfies` — that forces Kannada strings to be
  literally equal to the English ones, which is wrong). `<LanguageToggle>`
  (`components/i18n/`) lives in the root layout, visible on every portal.
  Every later UI unit should add keys to these same two files and call
  `t("namespace.key")` — never a second dictionary, never inline strings.
- **Units 19 and 21 have a head start, not a blank page.** Unit 03 already
  created `frontend/app/donor/register/page.tsx` and
  `frontend/app/(public)/request/new/page.tsx`, each rendering
  `<PhoneOtpFlow />` with nothing else on the page yet. Unit 19's D1 (full
  name/DOB/blood group/PIN/consent) and Unit 21's S4 (blood group/component/
  units/destination bank/urgency) must **extend these existing files**, not
  create them fresh — check the file before writing as if it were empty.
- Unit 02's migration adds two things beyond PRD.md §4's literal schema
  text: a `region_adjacency_no_self_reference` check constraint (a region
  can't neighbour itself — PRD.md never says this, it's a sensible
  default), and indexes on the FK columns queried most (`region_id`,
  `pincode`). Neither changes any table's shape or column list — later
  units reading PRD.md §4 and finding extra constraints/indexes in the
  actual migration should treat that as expected, not a bug to "fix" back
  to the literal spec.
- `search_logs` table (Unit 07): PRD.md §6.2 requires "every search logged"
  but §4 never defines its schema. Minimal shape used: region, blood group,
  raw PIN/town input, timestamp. Revisit if retention or PII handling needs
  a real policy.
- `donors.consent_at` / `consent_version` (Unit 20): SPEC.md §11.1 requires
  a timestamped, versioned consent record; PRD.md §4.3 doesn't list these
  columns. Added as a small addition to the Unit 20 migration.
- `app_settings` (Unit 02): CLAUDE.md requires timing parameters to live in
  a table, "tuned by non-developers," but no SQL for it appears anywhere in
  PRD.md/SPEC.md. Implemented as a plain key/value store (`key text primary
  key, value jsonb, description text, updated_at`), seeded with all nine
  values implied by SPEC.md §5's seven rows (two rows each bundle two
  values — no-prospect timing splits into normal/emergency, and the
  auto-expiry row splits into idle-prompt/expiry). Key names:
  `escalation.no_prospect_normal_minutes`, `escalation.
  no_prospect_emergency_minutes`, `escalation.admin_inaction_minutes`,
  `escalation.secondary_inaction_minutes`, `request.idle_prompt_hours`,
  `request.expiry_hours`, `donor.notif_cap_per_month`, `bank.
  stock_freshness_hours`, `donor.cooldown_months`. Whoever wires the
  escalation engine (Unit 44) and cron jobs (Unit 31) should read from
  these exact keys rather than inventing new ones.
- Local dev database tooling (Unit 02): a root-level `package.json` (sibling
  to `frontend/`) holds the Supabase CLI and `pg` as devDependencies, since
  `supabase/migrations/` lives at the repo root, not inside `frontend/`.
  `npm run db:migrate` → `supabase migration up --local`; `npm run db:seed`
  → `scripts/seed.mjs`, which applies `supabase/seed.sql` via `pg` directly
  (not the Supabase CLI's own seed mechanism) so the same three validation
  queries run every time, not only on a full `db reset`. Run these from the
  repo root, not from `frontend/`. Requires Docker Desktop running locally
  (`supabase start`) — nothing here touches your real hosted Supabase
  project.

---

## M1 — Foundations
- [ ] 01 — Project scaffold
- [ ] 02 — Schema + seed geography
- [ ] 03 — Phone OTP auth UI (public/donor)
- [ ] 04 — Phone OTP auth wiring
- [ ] 05 — Role-based route middleware
- [ ] 06 — Review gate: M1

## M2 — Bank portal + searcher tier 1 (first shippable point)
- [ ] 07 — Bank stock/search schema + shared types
- [ ] 08 — Bank auth UI (email + password)
- [ ] 09 — Bank auth wiring
- [ ] 10 — Bank portal shell
- [ ] 11 — Bank portal screens (hardcoded)
- [ ] 12 — Wire bank portal to real data
- [ ] 13 — Searcher shell + S1/S2 screens (hardcoded)
- [ ] 14 — Wire searcher (S1+S2) to real data
- [ ] 15 — Review gate: M2

## M3 — Requests, donor portal, matching, web push (the core loop)
- [ ] 16 — Requests + prospects schema
- [ ] 17 — Matching engine
- [ ] 18 — Web push infrastructure
- [ ] 19 — Donor portal shell + D1 registration UI
- [ ] 20 — Donor registration wiring
- [ ] 21 — S4 raise-request UI
- [ ] 22 — Wire S4 to real data
- [ ] 23 — D2 + D3 UI (hardcoded)
- [ ] 24 — Wire D2 + D3 to real data
- [ ] 25 — D4 + D5 UI (hardcoded)
- [ ] 26 — Wire D4 + D5 to real data
- [ ] 27 — B3 + B4 UI — donation confirmation (hardcoded)
- [ ] 28 — Wire B3 + B4 to real data — donation confirmation authority
- [ ] 29 — S5 request status UI (hardcoded)
- [ ] 30 — Wire S5 to real data + cancel action
- [ ] 31 — Scheduled jobs: notification budget, idle prompt, expiry
- [ ] 32 — Review gate: M3

## M4 — Admin portal, escalation engine (coordination layer)
- [ ] 33 — Admin operations schema
- [ ] 34 — Admin auth UI (email + password)
- [ ] 35 — Admin auth wiring
- [ ] 36 — Admin portal shell + A1 queue UI (hardcoded)
- [ ] 37 — Wire A1 to real data
- [ ] 38 — A2 request detail UI (hardcoded)
- [ ] 39 — Wire A2 to real data
- [ ] 40 — A3 donor lookup UI (hardcoded)
- [ ] 41 — Wire A3 to real data + audit on reveal
- [ ] 42 — A4 bank management UI (hardcoded)
- [ ] 43 — Wire A4 to real data
- [ ] 44 — Escalation engine
- [ ] 45 — Review gate: M4

## M5 — Audit, moderation, consent, deletion (compliance)
- [ ] 46 — Reports schema
- [ ] 47 — A5 moderation UI (hardcoded)
- [ ] 48 — Wire A5 to real data
- [ ] 49 — A6 audit log UI (hardcoded)
- [ ] 50 — Wire A6 to real data (coordinator-only)
- [ ] 51 — D6 donor settings UI (hardcoded)
- [ ] 52 — Wire D6 to real data (incl. account deletion)
- [ ] 53 — Privacy notice + consent pages, consent capture hardening
- [ ] 54 — Review gate: M5

## M6 — Metrics dashboard (operational visibility)
- [ ] 55 — Metrics aggregation queries
- [ ] 56 — Metrics dashboard UI (hardcoded)
- [ ] 57 — Wire metrics dashboard to real data
- [ ] 58 — Review gate: M6
