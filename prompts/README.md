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
4. **`profiles.phone` cannot be `unique not null` for every role.** PRD.md
   §4.2 literally shows this. It was fine while every profile came from
   phone-OTP (searcher/donor). bank_staff/admin/coordinator accounts
   (email + password, per Conventions) have no phone at all — Unit 09 hit
   this for real seeding the first bank_staff test account. Fixed the same
   way Unit 04 fixed `full_name` (migration, not editing Unit 02's file):
   `alter table profiles alter column phone drop not null`. Postgres
   UNIQUE already allows any number of NULLs, so uniqueness for the
   roles that do have a phone is unaffected. PRD.md §4.2 needs updating to
   drop `not null` from `phone`.
5. **A3's own text ("Contact reveal is audit-logged on every view")
   describes a bare reveal-on-view model that directly contradicts
   CLAUDE.md rule 3's literal wording** (phone released "only to an admin
   ... with an `accepted` prospect" - A3 has no prospect relationship at
   all). Resolved with the project owner before writing Unit 41's code,
   not silently either direction (see that unit's own README entry for
   the full reasoning): a donor-lookup reveal is a real, deliberate,
   individually-justified action - tied to a specific open request in the
   admin's own region, with a required non-empty reason, rate-limited per
   admin per hour - not a bare "view a row, see the phone" model PRD's own
   wording implies. CLAUDE.md rule 3 has already been updated to name this
   third channel explicitly; PRD.md §9.1 A3's own text still needs
   updating to describe reveal as this reasoned, request-tied action
   rather than "audited on every view" (which reads as passive/automatic).
6. **`notifications.donor_id` (PRD.md §4.6) no longer matches what's
   built.** Widened to `recipient_id` (FK to `profiles`, not `donors`)
   plus a new `recipient_role` column, to support admin/coordinator
   escalation notifications alongside donor ones (Unit 44) - resolved
   with the project owner rather than guessed (see that unit's own
   README entry for the full reasoning: a real FK-violation blocker, not
   a style choice). PRD.md §4.6's schema block needs updating to match.
7. **PRD.md §9.1 A2's action list ("take ownership, call donor,
   schedule, stand down prospect, transfer region, close") is stale as
   of 2026-08-06.** "Schedule" (a bare request-wide stage flip with no
   record of *which* donor) has been replaced by a donor-level
   **"Assign to bank"/"Unassign"** pair (`prospects.assigned_at`,
   migration `20260806090000_prospects_assigned_at.sql`) - a real,
   deliberate fix, not a rename: the old button let a request claim to
   be "scheduled" while the bank had no idea who was coming, which is
   the exact gap that let a bank see any accepted donor's contact
   immediately with zero admin action, contradicting CLAUDE.md rule 3's
   own "the bank that donor is scheduled at" wording (see that rule's
   own updated note). Assigning a donor still advances `request.stage`
   to `scheduled` (reusing the existing stage, not a second one) - PRD's
   own stage model in §4.5/§9.1 is otherwise unaffected, only the *A2
   action list's* wording needs updating. Also newly true and not yet in
   PRD's text: A1's own queue (§9.1 A1) is now clickable/expandable per
   row, showing that request's prospects (name, age, blood group, call,
   assign/unassign) inline - not a separate feature from A2, the same
   `getAdminRequestDetail`/`assignProspectToBank` functions power both
   surfaces.

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

**UPDATE 2026-08-09 — geography and blood bank data are real now, this
section's original text below is historical.** See `FUTURE-WORK.md`'s "Real
geography and blood bank data" section for the current, accurate status
(4 real regions, 6 real PIN codes, 5 real blood banks, sourced from
e-RaktKosh + India Post, `supabase/seed.sql`). Region adjacency and
coverage past these 4 regions are still genuinely open - also detailed
there, not re-explained here. The SMS provider paragraph immediately below
is also now out of date on the specific number count - 10 more test
numbers were added 2026-08-09 (`+919900000003` through `...012`, all still
OTP `123456`), so "only those two numbers work" is no longer true, though
"no real SMS provider is configured" still is (see `FUTURE-WORK.md`'s SMTP
section for what *was* resolved 2026-08-09 - email, not SMS).

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
   **Half-resolved 2026-08-04+:** the platform-manager portal
   (`app/ops-control/`, see `CLAUDE.md`'s Conventions section) now creates
   real regional admin accounts (email + temp password, forced reset on
   first login) — the admin half of this decision is built.
   **Bank staff account creation is still exactly as open as originally
   written here** — `/ops-control` doesn't touch `bank_staff` accounts at
   all (checked directly, not assumed: grepped `lib/db/platform-admins.ts`
   and every `components/platform/*` file, only real hit is a guard
   comment saying an admin-only action "must never be reachable against a
   bank_staff" account). Bank staff provisioning still relies on the
   seed-script test accounts (`bankstaff1@test.local` etc.) with no real
   flow.
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
- **`getClaims()` does not carry `profiles.role` — a custom access token
  hook does (Unit 05 migration, `custom_access_token_hook`):** the Auth
  JWT has no idea about application data. The hook injects
  `app_metadata.profile_role` at token issuance/refresh, so
  `lib/supabase/proxy.ts`'s role gate reads it for free with zero
  per-request database round-trips. **The function must be `security
  definer`** — `profiles` has RLS enabled with zero policies (Unit 04's
  deliberate backstop), so `supabase_auth_admin`'s own `GRANT SELECT`
  still gets blocked at the row level; without `security definer` the
  lookup silently returns no row (not an error) and every session falls
  back to `role: 'searcher'`. **This was caught, not assumed:** calling
  the function directly as the `postgres` superuser looked correct
  (superuser bypasses RLS regardless), which would have hidden the bug —
  it only showed up decoding a JWT actually issued through the real
  `/auth/v1/verify` endpoint and comparing it against the database.
  Consequence for role changes (e.g. Unit 20's searcher→donor upgrade):
  a session's `profile_role` claim is only as fresh as its last token
  issuance — bounded by `[auth] jwt_expiry` (3600s locally), refreshed
  automatically on the normal refresh-token cycle, not instantly on
  write. Don't build anything that assumes a role change is visible to
  that user's *current* session immediately.
- **Two config.toml changes needed a full `supabase stop` + `start`, not
  `db reset` (Units 04 and 05, hit twice):** `db reset` reapplies
  migrations and seed data against the *already-running* containers —
  it does not regenerate their environment variables from `config.toml`.
  Both the `[auth.sms]` test-OTP/Twilio-placeholder setup and
  `[auth.hook.custom_access_token]` silently had no effect until a full
  stop/start cycle. If a `config.toml` change looks like it "didn't
  work," check `docker inspect <container> --format '{{.Config.Env}}'`
  for the expected `GOTRUE_*` var before assuming the TOML syntax is
  wrong — it's more likely the container just hasn't regenerated.
- **`/donor/register` is deliberately ungated (Unit 05):** it's the
  entry point an anonymous visitor uses to become a `searcher`, and
  gating it would block the registration flow Units 03/04 already proved
  works. The rest of `/donor/*` requires role `donor`; a mismatched or
  anonymous visitor there is redirected to `/donor/register` specifically
  (not the generic `/`), since that's the actionable next step for them.
  `/bank/*` and `/admin/*` mismatches redirect to `/` — there's no
  bank/admin login page yet to send them to more specifically.
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
- **Rule 1 carve-out extended for email+password (Unit 08):** the
  Rule 1 clarification originally only named the OTP-flow Auth calls. Bank
  staff auth (email + password, per Conventions) needs `signInWithPassword`
  (login) and `updateUser` (forced password-reset screen) added to the same
  browser-allowed list — confirmed against current Supabase docs: same
  GoTrue Auth-service call as `signInWithOtp`, same publishable key, no
  server-only restriction. `resetPasswordForEmail` is deliberately **not**
  added — not a safety gap, a design choice: bank/admin resets are
  admin-mediated only (Conventions), so there is no self-service reset flow
  to call it from. If one is ever built for another role, add it to
  CLAUDE.md explicitly first.
- **`/bank/login` needed the same proxy.ts carve-out as `/donor/register`
  (Unit 08, found live-testing in browser, not assumed):** Unit 05's
  `PORTAL_ROLES` gate in `lib/supabase/proxy.ts` redirected *all* of
  `/bank/*` to `/` unconditionally, including the login page itself —
  confirmed with a real request (`curl /bank/login` returned the gate's
  307, not the page) before fixing it, not assumed from reading the code.
  Fixed by adding `/bank/login` to the same early-return the file already
  had for `/donor/register`. `/bank/*` everywhere else is still gated to
  `bank_staff`. Unit 34 (admin auth UI) will need the equivalent
  `/admin/login` exception when it lands — same pattern, not a new one.
- Unit 08's submit handlers were mocked with a `setTimeout` (no real
  Supabase call yet, per the unit's own scope) — every login was treated
  as first-login and always proceeded to the forced-reset step. Unit 09
  wired the real calls and resolved where the first-login flag lives (see
  below).
- **`profiles.must_reset_password` (Unit 09) is the flag Unit 08 left
  open.** Boolean column, deliberately role-agnostic (not
  `bank_staff`-specific) since Unit 35 needs the identical mechanism for
  admin/coordinator — that unit should add a role to
  `lib/supabase/proxy.ts`'s `RESET_PASSWORD_GATES` list, not invent a
  second flag. `custom_access_token_hook` (Unit 05's migration,
  `create or replace`d here, never edited in place) now injects it into
  `app_metadata` the same way it already injects `profile_role`, so the
  proxy gate enforces it with no per-request DB round trip. Cleared only
  by a server action (`completeForcedPasswordReset`, secret key) — a
  client can never clear its own gate, same trust boundary as
  `ensureProfileAfterVerification`.
- **The forced-reset screen is its own route, `/bank/reset-password`
  (Unit 09), not a client-side step inside `/bank/login`.** Needed for the
  proxy gate to mean anything: `lib/supabase/proxy.ts` redirects *any*
  `/bank/*` request to that path when `must_reset_password` is true,
  regardless of whether the visitor came through login or navigated
  directly with an old session — a step that only existed inside the
  login component could never be reached that way. `BankLoginFlow` now
  only owns "login"/"success"; `ForcedPasswordResetForm` (used by both
  the redirect-after-login path and direct navigation) owns the reset UI.
- **Caught by testing, not assumed: `signInWithPassword`'s
  `data.user.app_metadata` does NOT carry the hook-injected claims.**
  Only the JWT itself does (`data.session.access_token`, or equivalently
  `supabase.auth.getClaims()`). Confirmed directly against the local
  stack — the first version of `BankLoginFlow` checked
  `data.user.app_metadata.must_reset_password` and would have silently
  always read `undefined`, never routing anyone to the reset screen. Any
  later unit reading a role/flag claim right after sign-in should use
  `getClaims()`, not the `user` object.
- **Also confirmed directly, not assumed: `refreshSession()` re-runs
  `custom_access_token_hook` and mints a fresh JWT immediately** — tested
  by clearing `must_reset_password` in the DB, calling `refreshSession()`,
  and decoding the new token's claims. This is what lets
  `ForcedPasswordResetForm` redirect straight through after a reset
  instead of bouncing the user back to itself for up to `jwt_expiry`
  (the same staleness window already documented above for `profile_role`
  changes) — without this call, the old session's claim would still read
  `true` until its natural refresh.
- **Rule 1 carve-out extended again: `refreshSession`** (CLAUDE.md) —
  same class of Auth-service call as the rest of the list, confirmed
  client-safe by Supabase's own docs and by the test above.
- **Seeding real bank_staff accounts needed the Auth Admin API, which
  root's `scripts/seed.mjs` (raw `pg`) can't reach.** New script,
  `frontend/scripts/seed-bank-accounts.mjs`, reusing
  `@supabase/supabase-js` (already a frontend dependency — no new
  package). Run via `npm run db:seed:accounts` from the repo root (added
  to CLAUDE.md's Commands table), which shells into the frontend script
  with `--env-file=frontend/.env.local`. Refuses to run against a
  non-local `NEXT_PUBLIC_SUPABASE_URL` unless
  `--i-know-this-is-production` is passed, and every seeded account gets
  `must_reset_password = true` at creation regardless of the column's
  default, so a known test password is useless even if one ever escaped
  into a real environment. Idempotent — safe to re-run against an
  already-seeded stack.
- **`--experimental-websocket` is required to run that script on Node
  20.** `@supabase/supabase-js`'s client constructor eagerly initialises a
  Realtime client, which throws "native WebSocket not found" on Node <22
  with no global `WebSocket` — even though this script never opens a
  socket. Node 22 has one built in and won't need the flag. Not a new
  dependency (no `ws` package) — just a Node CLI flag, already wired into
  the `db:seed:accounts` script.
- Test bank_staff credentials (local dev only, same spirit as Unit 04's
  test-OTP numbers): `bankstaff1@test.local` / `bankstaff2@test.local`,
  both starting on password `TempPass123!` with `must_reset_password =
  true`, both attached to the same `PLACEHOLDER Blood Bank` from Unit 02's
  seed data.
- **`/bank`'s authenticated shell lives in a route group,
  `app/bank/(portal)/` (Unit 10), not directly in `app/bank/`.** A plain
  `app/bank/layout.tsx` would also wrap `/bank/login` and
  `/bank/reset-password` (siblings, created in Units 08/09) — showing the
  bank-name header and nav on a screen reached before/without an
  authenticated session makes no sense, and the layout's own data fetch
  (bank name via the profile id) would have nothing to read yet. The
  route group segment doesn't affect the URL - `(portal)/page.tsx` is
  still just `/bank`, matching PRD.md §8.1 B1's own route.
- **`lib/db/bank-portal.ts`'s `getBankStaffContext` (Unit 10) is two
  queries, not an embedded select.** Consistent with every other
  `lib/db/*` file's manual row-mapping style (no generated DB types,
  relation-embedding syntax not used anywhere else in this codebase) -
  not worth introducing a new pattern for a single low-traffic header
  lookup.
- **The shell's translated strings are read directly from
  `lib/i18n/locale.ts`'s `dictionaries[locale]` (Unit 10), not through
  `useTranslation()`.** That hook is Context-based and only works in
  Client Components; `app/bank/(portal)/layout.tsx` and its three
  placeholder pages are Server Components (CLAUDE.md rule 1's "shell
  reads session data server-side only" scope limit), so they read the
  dictionary directly instead. First unit to need server-side-only
  translated text; later server-rendered screens needing more than a
  single `{var}` substitution should factor out a shared helper rather
  than hand-rolling `.replace()` again.
- Unit 10's placeholder pages intentionally don't mention "Unit 11" or
  any build-process detail in the user-facing copy ("Full stock dashboard
  coming soon.") even though that's exactly what they are - build-unit
  numbers are an internal decomposition detail, not something a real bank
  staff tester should see.
- **B1's "8 groups × component" grid is 8 rows, not a real 2D grid
  (Unit 11).** `bank_stock.component` has no check constraint restricting
  it, but platelets/plasma are on CLAUDE.md's out-of-scope list, so
  `'whole_blood'` is the only value that will ever exist in practice. Mock
  data reflects that - one row per blood group, all at `component:
  'whole_blood'` - rather than inventing extra component values PRD.md
  and the schema don't actually support yet.
- **`lib/serialise/shortage.ts`'s `Shortage`/`toShortage` (Unit 11) fills
  a gap Unit 07 left.** Unit 07's shared-types task only covered bank
  card/stock row/search result - `bank_shortages` (PRD.md §4.4) had no
  shared shape yet, and B2 needed one to satisfy this unit's own
  instruction that Unit 12's wiring be a drop-in swap. Same shape/pattern
  as `StockRow`/`toStockRow`; doesn't include `resolved_at` since B2 only
  ever renders the active list.
- **`DAYS`/`Day` exported from `lib/serialise/bank.ts` (Unit 11, were
  private to that file since Unit 07).** B5's opening-hours editor needed
  the same weekday keys `OpeningHours` already uses - exporting them
  avoided a second weekday-list living in the settings component.
- **B5 does not reuse `BankCard` (Unit 11).** `BankCard` is deliberately
  the public/searcher-facing shape and excludes `policy_notes` (Unit 07's
  own comment: "admin-visible only"). B5 is the bank editing its own full
  row, not the public search view of it - the "admin-visible only" note
  was about keeping `policy_notes` out of public search results, not
  about the bank's own portal. B5's fields are typed locally in
  `BankSettingsForm.tsx`, not added to `BankCard`.
- Test bank_staff account state (`bankstaff1@test.local`) was
  temporarily flipped to `must_reset_password = false` to browser-verify
  the portal screens past the forced-reset gate, then restored to `true`
  afterward - the seeded default from Unit 09. Don't assume it's `false`
  in a fresh `db:seed:accounts` run.
- **Bank id is never a parameter, anywhere, on any bank-portal
  read/write (Unit 12) - it's always the return value of
  `lib/db/bank-portal.ts`'s `getActingBankStaff()`, resolved from the
  session.** This is the actual mechanism behind "a bank-staff account
  cannot edit another bank's stock even via a crafted request" - there's
  no bank id in any server action's parameter list for a crafted request
  to override in the first place. `resolveBankShortage` is the one
  exception with a client-supplied id (which shortage to resolve) -
  scoped by adding `.eq("bank_id", callerBankId)` to the same query, so a
  mismatched id/bank pair matches zero rows. **Verified, not assumed:**
  inserted a throwaway second bank + shortage belonging to it, ran the
  exact resolve query as if the PLACEHOLDER bank's staff were the caller,
  confirmed 0 rows affected and the other bank's shortage still active,
  then cleaned up both throwaway rows.
- **`bank_stock.updated_at` needed an explicit value on every write, not
  just reliance on the column's `default now()` (Unit 12).** The default
  only fires on INSERT - `saveBankStockRow`'s upsert mostly hits the
  UPDATE branch (editing an already-provisioned row), which silently
  keeps the old timestamp unless the code sets it itself. Caught before
  it shipped, not in production - PRD.md §8.2's "no exceptions" rule
  would have quietly broken on every edit after the first.
- **B1 auto-provisions all 8 blood-group rows at 0 units on first load
  (`getBankStock`, Unit 12), via `upsert(..., { ignoreDuplicates: true
  })` (`ON CONFLICT DO NOTHING`).** A fresh bank has zero `bank_stock`
  rows; Unit 07's `StockRow` type has no "never set" state (no nullable
  `updatedAt`), and changing it now would break Unit 11's already-built
  rendering. Provisioning real zero-unit rows (real timestamp from the
  column default) is honest and avoids inventing a fake timestamp or a
  parallel shape. Verified directly: bank_stock had 0 rows before the
  first real page load, 8 after.
- **Server actions can be called directly from Server Components, not
  only from client `onClick` handlers (Unit 12).** All three
  `app/bank/(portal)/*/page.tsx` files call their `"use server"` loader
  (`loadBankStock`, `loadActiveBankShortages`, `loadBankSettings`)
  directly for the initial server-side read - no separate non-action
  data-fetching function needed, and rule 1's "server-only" requirement
  is satisfied by construction since it never leaves the server either
  way.
- App Router private-folder gotcha, found writing (and discarding) the
  verification harness for this unit: any `app/` folder or file prefixed
  with `_` is invisible to routing entirely (a Next.js convention, not a
  bug) - `app/api/_foo/route.ts` 404s unconditionally. Not relevant to
  any shipped code in this project, but worth knowing if a future unit
  ever needs a quick throwaway route.
- **Unit 12's own verify checklist item "an unverified bank's stock does
  not appear in any public response" isn't actually testable yet.**
  There is no public response to test against - public search doesn't
  exist until Units 13/14, after this one. Confirmed `blood_banks.
  is_verified` still exists and Unit 12 doesn't touch it anywhere
  (`getBankSettings`/`saveBankSettings` deliberately excludes it - a
  bank_staff account can't self-verify through B5). The actual
  enforcement - filtering `is_verified = false` out of search results -
  is Unit 13/14's responsibility, not retroactively this unit's; flagging
  here so it isn't assumed already handled.
- Ran `npm run security-scan` against this unit's changes (see "Security
  review" section below) - one real, worth-fixing finding: `bank_shortages`'
  active-list read had no `.limit()`. Added one (50, generous for one
  bank's concurrently-active shortages). `bank_stock`'s equivalent
  "unpaginated" flag is a confirmed false positive, not fixed - that read
  is capped at exactly 8 rows by the table's own `unique (bank_id,
  blood_group, component)` constraint, not just app-level filtering.
- **`lib/serialise/blood-group.ts`'s `BLOOD_GROUPS`/`BloodGroup` (added
  post-Unit-12, during a consistency pass before Unit 13).** The 8-value
  literal had been copy-pasted into `lib/db/bank-stock.ts`,
  `lib/db/bank-shortages.ts`, and `components/bank/ShortageBoard.tsx`
  independently across Units 11/12 - all three copies were correct and
  consistent, but a fourth was about to happen the moment Unit 13's S1
  screen needed the same list for its blood-group select. Same
  `lib/serialise/` home as `StockRow`/`BankCard`/`Shortage` (cross-cutting
  shared shapes), same `as const` + derived-type pattern as `DAYS`/`Day`
  in `bank.ts`. Unit 13 should import from here, not write a fifth copy.
- **S2's mock bank #1 (Unit 13) intentionally reuses Unit 02's real
  seeded id/address/phone (`00000000-0000-0000-0000-000000000002`,
  "PLACEHOLDER Blood Bank").** Same reasoning as S1's mock PIN codes
  matching the real seeded ones: when Unit 14 swaps in a real query, nothing
  about this card visually changes. Mock bank #2 is purely invented (no
  real counterpart exists yet) - only there so this hardcoded unit's own
  job (previewing the multi-card layout PRD.md §6.1 S2 describes) isn't
  short-changed by there being exactly one real seeded bank.
- **`searchParams` on `app/(public)/search/page.tsx` is read via the
  Server Component page prop (`await searchParams`), not
  `useSearchParams()` (Unit 13).** Checked current Next.js docs before
  building this, since the project has been burned by stale-training-data
  API assumptions before: `useSearchParams()` needs a `<Suspense>`
  boundary to avoid a build failure, while the Server Component
  `searchParams` prop (a `Promise`, same async-prop pattern already used
  for `params`/`cookies()` elsewhere in this codebase) avoids that
  entirely and needs no client-side hook for a component
  (`SearchResults`) that has no interactivity of its own anyway.
- `SearchResults` is a **Server Component with no `"use client"`** - PRD.md
  §6.1 S2 has no stateful interactivity (cards, a stock table, `tel:`
  links, and plain `<Link>`s for the adjacent-region chips and the raise-
  request CTA), so there's no reason to ship it as client JS. Reads the
  dictionary directly (`dictionaries[locale].search.s2`), same pattern as
  Unit 10's original portal layout, since `useTranslation()`'s Context
  only works in Client Components.
- Confirmed live, not assumed: the open/closed badge is genuinely
  time-dependent (`isOpenNow` compares against the real clock) - verified
  by checking the actual server time (Sunday 17:14 IST) against both mock
  banks' configured hours and confirming both correctly showed "Closed"
  (bank 1's Sunday window had already closed; bank 2 has no Sunday hours
  at all). The "open" case is already covered by Unit 07's own
  `bank.test.ts` with a fixed `now`, so this wasn't left unverified.
- **PIN/town resolution (`lib/db/pincodes.ts`'s `resolveLocation`, Unit
  14) is two sequential queries (code match, then `office_name` match),
  not a combined `.or()` filter.** The raw input is user-typed text;
  building a PostgREST `.or()` filter string by interpolating it directly
  would still be parameterised under the hood (no real SQL injection
  risk) but is needless fragility the moment the input contains a
  character that means something in PostgREST's own filter DSL (a comma,
  a parenthesis). Two plain `.eq()`/`.ilike()` calls avoid the question
  entirely.
- **Every `/search` load with a resolvable `regionId` writes a
  `search_logs` row - direct S1 submission, an adjacent-region chip, or
  a bare/bookmarked URL all go through the same `getSearchResultsAction`
  (Unit 14).** Matches PRD.md §6.2 "Every search logged" literally, not
  just "logged the first time." **Verified against the real local stack,
  not assumed:** confirmed `search_logs` had 0 rows before, inserted a
  throwaway second region + an unverified same-region bank, ran real
  requests, and confirmed (a) the real Sirsi region's results showed only
  its own verified bank - not the throwaway cross-region bank, not the
  unverified same-region one; (b) a request scoped to the throwaway
  region showed only that region's bank; (c) both requests each wrote
  exactly one `search_logs` row; (d) manually aging one real
  `bank_stock` row to 20h past the 6h threshold made "Outdated" and
  "Updated 20h ago" appear in the real rendered page. All throwaway rows
  (region, two banks, adjacency pair, search_logs entries) deleted and
  the aged stock row restored to `now()` afterward.
- **Real seed data currently has zero adjacent regions** (`region_
  adjacency` is empty - Unit 02's seed comment already flagged this: "No
  second region exists yet"). So while the adjacency mechanism itself
  works (verified above with a temporary throwaway pair), the real `/`
  → `/search` flow against today's actual seed data shows no adjacent-
  region chips at all, unlike Unit 13's mock (which always showed
  "Siddapur · Yellapur"). Expected, not a regression - matches "Blocking
  on real data" above; the chips reappear the moment real neighbouring-
  region data is collected and seeded.
- `getSearchResults` bounds three previously-unbounded-by-code (though
  effectively bounded-by-schema) reads explicitly: `bank_stock` at
  `MAX_BANKS_PER_REGION * 8` (the per-bank cap from Unit 12, times the
  region's bank cap), and both `region_adjacency` and its neighbour-name
  lookup at 50 - a region realistically borders a handful of others.
  Added after `npm run security-scan` flagged all three; same reasoning
  and pattern as `bank_shortages`' cap in Unit 12.
- **`requests`/`prospects` (Unit 16) add `not null` beyond several of
  PRD.md §4.5's own literal markers** - `component`, `destination_bank_id`,
  `region_id`, `urgency` on `requests`, and `request_id`/`donor_id` on
  `prospects`. PRD's raw SQL notation only marks some columns `not null`
  explicitly and leaves others bare (neither `null` nor `not null`) -
  resolved the bare ones by cross-referencing PRD.md §6.1 S4's own field
  list ("Fields: blood group, component, units, destination bank
  ..., urgency, optional patient first name" - `patient_name` is the
  *only* one called optional there) and CLAUDE.md's domain-vocabulary
  section (region = "unit of admin ownership", so a request can't
  sensibly have none). Same treatment Unit 07 already gave
  `bank_stock.bank_id` - an FK the row is meaningless without, not null
  even though PRD's own text omitted the marker there too.
  `requester_profile_id` was left nullable - unlike the others, it's a
  convenience link, not the request's core identity (that's
  `requester_phone`, already `not null` in PRD's own text). **Verified
  directly against the real DB, not just written and assumed:** both
  partial unique indexes tested with real inserts - a second open
  request for the same phone correctly rejected (`23505`), a new open
  request correctly *allowed* after a prior request for that phone was
  closed (the partial index excludes `resolved`/`closed`, not phone
  numbers generally), a second active pledge for the same donor
  correctly rejected, and a `rejected`-status prospect for that same
  donor on a different request correctly allowed (the partial index only
  restricts `accepted`/`screening`). Column list and grants
  (`information_schema.role_table_grants`) also checked directly - no
  columns beyond PRD.md §4.5, zero grants to `anon`/`authenticated`.
- **PRD.md §7.2's matching order ("previously reliable donors first,
  then least recently notified") directly contradicts SPEC.md's own
  recorded decision (I8: "Donor reliability scoring acted on - collect
  the data, don't rank on it yet - too little signal") and CLAUDE.md's
  out-of-scope list, which names "donor reliability ranking" citing that
  same entry (Unit 17).** Confirmed with you before writing any code,
  not resolved silently either direction. Implemented ordering as
  least-recently-notified only - `lib/matching/eligibility.ts`'s
  `rankEligibleDonors` - with the reliability half left out entirely,
  not stubbed or half-built. Data collection for it already happens
  (`prospects.status` tracks `no_show`/`donated` since Unit 16); acting
  on it in ranking is deferred until I8's own stated trigger ("enough
  history exists"), same as SPEC.md records.
  **Flag for whoever builds Unit 28:** that unit's own task text says "a
  `no_show` affects only internal reliability ordering (Unit 17's
  matching engine reads it later)" and its "Read before writing" section
  says to "confirm the field names line up" with Unit 17's reliability
  ordering. That ordering does not exist, deliberately, per the decision
  immediately above. Do not read Unit 28's text as license to add it to
  Unit 17 - that would silently reopen a decision already confirmed with
  the user. Unit 28 should still set `prospects.status = 'no_show'`
  (the data collection Unit 16/17 already rely on) and treat "affects
  reliability ordering" as describing a future capability, not a current
  one to wire up.
- **`lib/matching/` is a new top-level `lib/` folder** (Unit 17), holding
  pure, DB-free logic (`compatibility.ts`, `eligibility.ts`) - distinct
  from `lib/serialise/` (output shaping) and `lib/db/` (the actual
  queries, in a new `lib/db/matching.ts` that calls into `lib/matching/`).
  Addition to CLAUDE.md's Conventions, same treatment as `components/`
  (Unit 03) and the `lib/supabase/` vs `lib/db/` split (Unit 04).
- **Found and fixed a real gap in the test setup itself, not just the
  matching code:** `vitest.config.mts` had no path-alias resolution at
  all - `lib/matching/compatibility.ts` is the first source file under
  test to import another `@/`-aliased module (`lib/serialise/blood-
  group.ts`); every earlier `*.test.ts` (`lib/serialise/bank.ts`,
  `stock.ts`) had no imports of its own, so nothing had ever exercised
  this path before. Fixed by mirroring `tsconfig.json`'s `"@/*": ["./*"]`
  in Vitest's own `resolve.alias`.
- **Verified end-to-end against the real DB, not just the 34 passing unit
  tests:** built a real request needing O+ in the real Sirsi region, plus
  ten real donor fixtures, one deliberately violating each of the seven
  §7.2 rules (plus one incompatible-blood-group and one wrong-region
  case) and two genuinely eligible ones with different invite histories.
  `findEligibleDonors` (via a temporary route, removed after) returned
  exactly the two eligible donors, in the correct order (never-invited
  first, then the one invited 10 days ago) - all eight rule-violating
  donors correctly excluded simultaneously in one real query, not
  checked one rule at a time. All fixtures deleted afterward.
- `lib/db/matching.ts`'s invite-history read needed a larger cap than the
  other two donor-scoped reads in the same function (`MAX_CANDIDATE_
  DONORS * 10`, not `MAX_CANDIDATE_DONORS`) - unlike profiles (1:1) and
  active pledges (capped at one per donor by the `one_active_pledge_
  per_donor` index itself), a donor can have many past `prospects` rows,
  so the same cap could silently truncate before every candidate's own
  most recent invite was seen. Caught by `npm run security-scan`
  flagging all three as unpaginated, not assumed safe by analogy to the
  other two.
- **`notifications` created here (Unit 18), not held back for Unit 33** -
  Unit 33's own prompt file explicitly expects this ("if Unit 18 didn't
  already create the latter... check first") and already depends on Unit
  18. Matches PRD.md §4.6 verbatim.
- **`push_subscriptions` (no PRD.md schema - this unit's own design) is
  keyed by `profile_id`, not `donor_id`, unlike `notifications`.** A
  sequencing conflict, not a style choice: a donor only gets an actual
  `donors` row once the full D1 form (Unit 19/20) is submitted, but the
  verify checklist requires wiring the *real* subscribe flow into the
  *current* `/donor/register` page today, which only creates a `profiles`
  row (bare OTP verification, Unit 04's `ensureProfile`). Since
  `donors.id = profiles.id` (Unit 02's own 1:1 pattern), `sendPush(donorId,
  ...)` still resolves correctly against this table either way - a donor
  id and its profile id are the same value.
- **`VAPID_PUBLIC_KEY` (Unit 01's original placeholder) was never actually
  reachable client-side** - a bare env var without `NEXT_PUBLIC_` never
  reaches the browser bundle, but the service worker's `pushManager.
  subscribe()` call needs the public key client-side by definition.
  Renamed to `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in both `.env.example` and
  `.env.local` (real keys generated for local dev via `webpush.
  generateVAPIDKeys()`) - same category of fix as Unit 04's Supabase key
  rename. Added `VAPID_SUBJECT` too (a `mailto:`/`https:` URI web-push's
  `setVapidDetails` requires, not previously scaffolded).
- **The push-subscription trigger lives in `app/donor/register/page.tsx`
  itself, not inside `PhoneOtpFlow`** - that component is shared with the
  searcher's request-raising flow (S4, `/request/new`), which must never
  trigger a push subscription. `PhoneOtpFlow`'s existing `onVerified` prop
  (previously unused on this page) is the hook; the page now owns a
  `step` state distinguishing OTP-entry from "done" (which shows whether
  push was actually enabled). **Unit 19 must preserve this
  `onVerified`-based structure when it extends this file with the full D1
  form fields, not revert to a bare `<PhoneOtpFlow />`** - flagged in the
  file's own comment too, not just here.
- **Confirmed live, not assumed: Supabase's Auth JWT `phone` claim (and so
  `ensureProfile`'s stored value) strips the leading `+`** -
  `signInWithOtp`/`verifyOtp` are called with `+919900000001`, but the
  stored `profiles.phone` is `919900000001`. Not documented anywhere
  before this unit; worth knowing for any later unit that queries
  `profiles`/`donors` by phone number.
- **Real end-to-end verification needed real infrastructure, not a mock -
  and hit three genuine environment issues along the way, each confirmed
  live before working around it, none guessed:**
  1. Playwright's default `browser.newContext()` is incognito-like, and
     Chromium **deliberately** disables the real Push API there with no
     way to feature-detect it ("Chrome currently does not support the
     Push API in incognito mode... deliberately no way to feature-detect
     this"). Fixed by using `launchPersistentContext` instead.
  2. Playwright's *bundled* Chromium (the open-source build, not real
     Google Chrome) cannot create push subscriptions at all -
     `AbortError: Registration failed - push service not available` -
     because it lacks the proprietary Google API key real Chrome ships
     with for GCM/FCM. Fixed by launching with `channel: "chrome"`
     against the real Chrome already installed on this machine.
  3. The Playwright persistent-context profile directory must live
     *outside* `frontend/` - Turbopack's dev-mode file watcher covers the
     whole project tree, and it hard-crashed (`FATAL: An unexpected
     Turbopack error... The process cannot access the file because
     another process has locked a portion of the file`) trying to read
     Chromium's internal leveldb `LOCK` file when the profile dir lived
     inside the watched tree. Entirely unrelated to any of this unit's
     actual code - the dev server needed a clean restart after.
  Once past all three: a real Chrome instance registered the real
  service worker, subscribed to a real `fcm.googleapis.com` endpoint, the
  donor-register page showed the real "Notifications enabled" success
  copy (not the soft-fail fallback), a real `sendPush` call server-side
  returned `delivered: true`, and the service worker's `push` event
  handler genuinely fired and called `showNotification()` with the exact
  payload sent - confirmed via a temporary `postMessage` hook back to the
  page (removed after, see `public/sw.js`'s clean shipped version). All
  temporary test routes, DB fixtures, the Playwright profile directory,
  and the `playwright`/`pg` dev-only installs (`--no-save`, confirmed
  afterward that neither touched `package.json`/`package-lock.json`)
  were removed afterward - `web-push`/`@types/web-push` are the only
  intentional, permanent dependency additions from this unit.
- Before that real-browser test, `sendPush` was also verified against
  Google's real FCM service with a subscription that necessarily fails
  (a syntactically valid but unregistered endpoint) - got a real `410
  Gone` back (not 401/403, meaning VAPID auth itself was already
  correct), confirmed the subscription got deleted and `notifications.
  delivered_at` stayed `null`. Kept as useful corroborating evidence, not
  a replacement for the full real-browser pass above.
- **Donor shell nav is 4 items (Home/Pledge/History/Settings), not all 6
  D1-D6 screens (Unit 19).** Same treatment as Unit 10's bank shell (3 nav
  items, not all of B1-B5): D1 (`/donor/register`) is the pre-auth entry
  point, a sibling route outside `app/donor/(portal)/` same as
  `/bank/login` is outside `app/bank/(portal)/` - and D3 (request detail,
  `/donor/request/[id]`) is a dynamic route reached via a notification
  link, not a persistent nav destination, so it isn't scaffolded here.
  `app/donor/(portal)/{page,pledge,history,settings}/page.tsx` are
  shell-only placeholders ("...will appear here soon."), same pattern and
  wording style as Unit 10's original bank placeholders - real content
  arrives in Units 23/24 (D2/D3), 25/26 (D4/D5), and 51/52 (D6).
  `components/donor/SignOutButton.tsx` mirrors `components/bank/
  SignOutButton.tsx` exactly (same Rule-1-clarification-allowed
  `signOut()` call) but redirects to `/donor/register`, not a separate
  login route - the donor portal has no login page distinct from
  registration; phone+OTP doubles as both.
- **D1's OTP -> form -> registered step machine (Unit 19) keeps Unit 18's
  `onVerified` hook completely unchanged** - `handleVerified` still calls
  `registerForPushNotifications()` first, exactly as before, and only
  then advances the step. The push-enabled/skipped message (previously
  the entire "done" step's content) is now shown as a small note at the
  top of the form step instead, since D1's actual fields needed that
  space - `pushSkipped`'s copy was edited to drop the leading "You're
  registered." (accurate on the old "done" step, no longer accurate once
  it's shown before the real submit). Submission is genuinely mocked, not
  network-mocked-then-hidden: `submit()` runs the same client-side
  validation Unit 20 will duplicate server-side, then sets
  `step = "registered"` with no server call at all - confirmed directly
  that `donors` still had 0 rows after a full run through the form.
- **Consent text (`donorRegister.consentText`, PRD.md §11.2) is one
  paragraph covering all three required facts** (server storage;
  name/blood group visible to regional admins and blood banks; phone
  shared only after acceptance, never in search results) **and was
  checked word-by-word against the old-wording prohibition, not just
  eyeballed** - a temporary Playwright script asserted the exact required
  substrings were present and that "stored only in your browser" was
  absent, in both the English string and by extension the Kannada
  translation (same source of truth, `Dictionary` type). Script removed
  after the run, per this project's usual practice.
- **DOB gate (`calculateAge` in `app/donor/register/page.tsx`) is a
  genuine calendar-aware age calculation, not a bare year subtraction** -
  accounts for whether this year's birthday has occurred yet. Client-side
  only, per this unit's own scope; Unit 20 must reject the same 18-65
  range server-side regardless of what this check does (CLAUDE.md's usual
  "never trust the client-side check alone").
- **Verified against a real running dev server and the real local
  Supabase stack, not just lint (temporary Playwright scripts, removed
  after both runs):** the full D1 form flow (OTP verify with the real
  test-OTP number, all five field validations including the DOB
  boundary, consent-blocks-submit, and the mock "registered" step) and,
  separately, the `(portal)` shell - which required temporarily flipping
  a real seeded profile's `role` to `donor` directly via `psql` (no real
  session can have that role yet; Unit 20 is what actually sets it),
  signing in fresh so the JWT's `profile_role` claim picked up the
  change (same mechanism the `custom_access_token_hook` notes above
  already describe), confirming all four nav destinations render their
  placeholders, and confirming sign-out both redirects correctly and the
  role gate re-applies (`/donor` → `/donor/register`) once the session is
  gone. The profile's `role` was reverted to `searcher` afterward -
  confirmed via `psql` that both test profiles (`919900000001`,
  `919900000002`) ended the session back at their normal baseline and
  `donors` still had 0 rows throughout.
- One early Playwright debugging lesson worth recording for later units
  writing their own throwaway scripts: Playwright's unquoted `text=`
  selector does a case-insensitive **substring** match across the whole
  page, not just visible buttons/links - `page.click("text=Register")`
  silently matched the unrelated paragraph "...You can still register."
  before the real submit button, and `page.click("text=History")`-style
  nav clicks looked like they "did nothing" because `waitForLoadState
  ("networkidle")` resolved before Turbopack's dev-mode soft navigation
  actually landed. Fixed by using `getByRole("button"/"link", { name })`
  (exact accessible-name match, no substring ambiguity) and `page.
  waitForURL(...)` instead of a fixed wait - both fixes were needed
  before the shell's nav-click checks passed for real, not assumed from
  the first (wrongly) failing run.
- **D1's `fullName` field writes to `profiles.full_name`, not `donors`
  (Unit 20)** - `donors` (PRD.md §4.3) has no name column at all;
  `profiles` already does (§4.2), and `donors.id = profiles.id` is the
  same established 1:1 pattern used throughout. `registerDonor`
  (`lib/db/donors.ts`) does two writes: `profiles.update({ full_name,
  role: 'donor' })` and a `donors` upsert for the donor-specific fields.
- **The `donors` write is an upsert (`onConflict: "id"`), not a plain
  insert (Unit 20)** - a returning donor can land back on
  `/donor/register` (Unit 19's `SignOutButton` redirects there
  deliberately) and re-run the OTP → form flow. A plain insert would hit
  a unique-violation on the second submission; the upsert makes
  re-registration idempotent instead, and re-recording `consent_at`/
  `consent_version` on every submission is correct (the timestamp should
  reflect when *this* consent text was actually shown and agreed to, not
  be preserved stale from a first visit).
- **`refreshSession()` after a successful submit is not optional (Unit
  20)** - same gotcha already documented for Unit 09's forced-password-
  reset flow: a session's `profile_role` JWT claim is only as fresh as
  its last token issuance, so without calling `refreshSession()`
  immediately after `registerDonor` sets `profiles.role = 'donor'`,
  `lib/supabase/proxy.ts`'s gate would still see the stale `searcher`
  claim and bounce the just-registered donor straight back to
  `/donor/register` - verified live, not assumed: the Playwright
  end-to-end run explicitly checked that clicking through to `/donor`
  after registering lands there, not back at the register page.
- **Real, exploitable bug found and fixed before this unit shipped, not
  by the security scanner - by hand, while checking a scanner finding on
  the same file:** the first version of `lib/actions/donor-registration.ts`
  wrote `registerDonor({ id, ...input })`, spreading the client-supplied
  `input` object *after* the server-derived `id`. Object spread lets a
  later key win, so a raw request crafted directly against this Server
  Action's endpoint (bypassing the UI and its TypeScript parameter shape
  entirely - Next.js doesn't enforce that shape at runtime) could smuggle
  its own `id` into the JSON body and silently overwrite the legitimate
  one, letting an attacker overwrite an arbitrary victim's
  `profiles.role`/`full_name` and `donors` row. Fixed by building the
  object from named fields only, never spreading `input`. See the
  security-review section below for the full writeup and the standing
  rule this leaves for later units.
- **Verified against the real DB, not just the 3 Playwright checks:**
  confirmed `profiles.role`/`full_name` and the full `donors` row
  (`blood_group`, `dob`, `pincode`, `region_id`, `consent_at`,
  `consent_version`) after a real browser registration. Separately, a
  temporary `POST /api/test-register-donor` route (calling `registerDonor`
  directly with a caller-supplied id, removed after this run) proved the
  server-side gate rejects an out-of-range DOB and an unrecognised PIN
  even with every client-side check bypassed, and that resubmitting the
  same id twice (upsert) updates the one row rather than crashing on a
  duplicate key. Both test profiles were reverted to their `searcher`/
  `null`-name baseline and both throwaway `donors` rows deleted
  afterward - confirmed via `psql` back to 0 rows.
- **S4 stays fully hardcoded/mock, same as every other `*_UI` unit's own
  precedent (Unit 21) - not partially wired even though real bank/region
  data already exists from M2.** Confirmed by the dependency list itself:
  Unit 21 depends on `03, 13` only, not on `07`/`12`/`14` (the units that
  would matter if it read real banks) - same reasoning already used for
  Unit 13's S1/S2. `MOCK_BANKS`'s first entry intentionally reuses Unit
  02's real seeded id/name (`00000000-0000-0000-0000-000000000002`,
  "PLACEHOLDER Blood Bank"), same trick as Unit 13's mock bank #1, so
  Unit 22's real region-scoped query is a visually seamless swap for the
  placeholder region. `S2`'s "Can't find blood? Raise a request" CTA
  still links to a bare `/request/new` with no query params - Unit 22
  decides whether to carry `regionId` across that link when it wires the
  real bank list.
- **The mocked "blocked" state is triggered by the test-OTP number ending
  `...01`, not a separate demo toggle (Unit 21).** PRD.md's own ordering
  ("Phone + OTP verification first... Blocks with a clear message if an
  open request already exists") puts the duplicate-request check right
  after OTP, before the form is ever shown - so `blocked` and `form` are
  alternative post-OTP steps, not a form-submission-time error. Since
  local dev only has two working test numbers at all
  (`supabase/config.toml`'s `[auth.sms.test_otp]`, Unit 04), using one of
  them to deterministically reach each mocked outcome means both are
  reviewable with zero new mechanism - same spirit as Unit 08's mocked
  login, but Unit 08 only ever exposed one hardcoded outcome; this one
  exposes both. **Unit 22 must delete `MOCK_BLOCKED_PHONE` entirely**,
  not just stop reading it - the real check is Unit 16's
  `one_open_request_per_phone` index, keyed by whatever phone actually
  has an open request, not a hardcoded number.
- **`lib/serialise/urgency.ts` (`URGENCY_LEVELS`/`Urgency`) added
  proactively, not after multiple copies existed (Unit 21) - a
  deliberate exception to the "wait for 3+ duplicates" pattern
  `blood-group.ts` itself was consolidated under.** `urgency` is visibly
  going to be read by at least Unit 22 (request creation), Unit 29 (S5
  status display), and Unit 38 (A2 admin detail) per their own prompt
  files' field lists - same shape of foreseeable reuse, just caught
  before the first duplicate landed instead of after the third.
- Verified live (temporary Playwright scripts, removed after, plus a
  temporary smoke pass over `/`, `/donor/register`, and `/bank/login`
  confirming the shared `lib/i18n` edit didn't break anything already
  shipped): both test numbers produce their correct distinct outcome
  (`...01` blocked, `...02` reaches the form), the form renders exactly
  PRD.md §6.1 S4's field list (blood group, fixed/disabled component,
  units, destination bank, urgency, optional patient first name) and no
  more, empty-submit shows all four required-field errors simultaneously
  without navigating away, `units = 11` is correctly rejected (the
  1-10 range), and a fully valid submission reaches the mocked
  "submitted" confirmation.
- **`requests.region_id` is derived server-side from `destination_bank_id`'s
  own `blood_banks.region_id`, never a caller-supplied field (Unit 22).**
  Unit 16's own migration comment already anticipated this exact design
  ("presumably derived server-side from the destination bank's own
  region, not typed by the requester") - followed it rather than
  inventing a different approach (e.g. trusting a client-supplied
  `regionId`). The same lookup doubles as validating the bank is real,
  verified, and active (`invalid_bank` otherwise) - same
  `is_verified=false` gating Unit 12 already enforces bank-portal-side.
  The `regionId` carried in the URL from S2's CTA is a completely
  separate concern - it only scopes which banks appear in the dropdown
  (`lib/db/blood-banks.ts`'s `getVerifiedBanksInRegion`), and is never
  written to `requests.region_id` directly.
- **S4's page split into a Server Component (`app/(public)/request/new/
  page.tsx`) + a new Client Component (`components/search/
  RaiseRequestFlow.tsx`), unlike D1 which stayed inline in its page.tsx
  (Unit 19/20).** Not a style choice - this page genuinely needs a
  server-side data fetch (`regionId` from `searchParams`, the
  region-scoped bank list) *before* anything client-interactive can
  render, which Next.js can't do in one component. Same split precedent
  as `/search`'s `page.tsx` + `SearchResults`.
- **`MOCK_BLOCKED_PHONE` and `MOCK_BANKS` (Unit 21) are both gone
  entirely, not just unused (Unit 22)** - flagged explicitly in Unit 21's
  own README note as something Unit 22 must delete, not merely stop
  reading. The mocked "blocked" trigger is replaced by a real, two-layer
  check: `checkOpenRequestAction` (a real `SELECT` against `requests`,
  called right after OTP for fast UX, matching PRD.md's own ordering) and
  `createRequest`'s catch of a real `23505` from Unit 16's
  `one_open_request_per_phone` index (the authoritative enforcement -
  verified directly that the pre-check and the index still agree, and
  that the index alone rejects a second attempt even when called
  directly, bypassing the pre-check).
- **Real, previously-unenforced gap closed: `donors.notif_count_month`/
  `notif_month` had no writer anywhere in the codebase before this unit
  (Unit 22).** `lib/matching/eligibility.ts`'s cap check (PRD.md §7.2 rule
  6) only ever *read* these columns - nothing incremented them, meaning
  the monthly notification cap was silently vacuous end-to-end despite
  the matching engine's own logic being correct in isolation (already
  unit-tested in Unit 17). `incrementNotifCounts` in `lib/db/requests.ts`
  closes this: convention is `notif_month` always stored as that month's
  1st (`YYYY-MM-01`) - Unit 31's scheduled reset job must match this
  convention, not invent its own. Not called out explicitly in this
  unit's own task text ("create prospects rows... and send push... to
  each") - added because creating an `invited` prospect *is* the
  notification event the cap is meant to track, same reasoning as Unit
  12's uncalled-for `bank_stock.updated_at` fix and Unit 15's ILIKE
  escaping fix, both real gaps caught while implementing, not asked for
  verbatim in their own unit's text.
- **Real bug found live, not by the scanner - a partial-column
  `.upsert()` cannot work against a table with other `NOT NULL` columns,
  regardless of whether the row already exists (Unit 22).** The first
  version of `incrementNotifCounts` did
  `db.from("donors").upsert(updates, { onConflict: "id" })` with
  `updates` only containing `{ id, notif_month, notif_count_month }`.
  Confirmed live against the real DB: this throws `23502` ("null value in
  column blood_group violates not-null constraint") even though the
  target row already existed - Postgres validates a NOT NULL constraint
  against the `INSERT` half of the upsert's generated SQL before `ON
  CONFLICT` resolution ever applies, so a partial column list fails
  regardless of whether a conflict will occur. `createRequest` isn't
  wrapped in a DB transaction, so this crash left real partial state
  behind (a real `requests` row and its `prospects` row committed, but
  the matching donor never actually notified or counted) - caught,
  cleaned up, and fixed by switching to a plain `.update()` per donor
  (these rows are guaranteed to already exist, since `donorIds` came from
  `findEligibleDonors`' own DB read - there was never a real need for
  upsert semantics here). **Any later unit patching only some columns of
  an already-known-to-exist row should default to `.update()`, not
  `.upsert()`** - upsert is for genuinely-may-not-exist rows only (e.g.
  Unit 12's `bank_stock` provisioning, Unit 20's `donors` registration
  upsert - both of which supply every `NOT NULL` column, unlike this
  bug).
- **Verified against the real DB and a real running dev server, not just
  the unit tests already covering the matching engine in isolation
  (temporary Playwright scripts plus two temporary API test routes,
  removed after; a temporary real donor fixture, deleted after):** the
  full real S1→S2→S4 flow (search, region-scoped CTA link, blood-group
  pre-fill, region-scoped bank dropdown, real OTP, real submit) reaches a
  real `finding_prospects` request; a request with zero real donors in
  the DB correctly sets `zero_match_at` and creates zero `prospects`/
  `notifications` rows; a fixture donor made genuinely eligible (right
  blood group, right region, available, no active pledge, under the
  notification cap) is correctly matched, gets a real `invited` prospect
  row, a real `notifications` row (`delivered_at` null - no real push
  subscription exists for the fixture, same expected "outcome" shape
  Unit 18 already documented), and its `notif_count_month` incremented;
  a crafted duplicate phone is rejected by the real unique index directly
  (not just the pre-check), returning `duplicate_open_request` and
  leaving exactly one row for that phone; a crafted nonexistent bank id
  returns `invalid_bank` and creates nothing. All fixtures (one donor +
  profile, four test requests and their prospects/notifications) deleted
  afterward - confirmed via `psql` back to 0 rows across
  `requests`/`prospects`/`notifications`/`donors`, and both real test
  profiles (`919900000001`, `919900000002`) back to their `searcher`/
  no-name baseline.
- One Playwright gotcha specific to this unit's own test scripts, not
  covered by Unit 19's existing note: `supabase/config.toml`'s
  `[auth.sms] max_frequency = "5s"` rate-limits repeated `signInWithOtp`
  calls for the *same* phone number - a test script that verifies OTP for
  the same test number twice in quick succession (e.g. to test the
  duplicate-request block right after creating the request that makes it
  a duplicate) needs a real ≥5s gap between the two, or the second
  `signInWithOtp` silently fails and the UI never leaves the phone-entry
  step. Not a bug in the shipped code - a fact about the local dev
  environment worth knowing before assuming a stuck-on-phone-step test
  failure means the app is broken.
- **D2's "preview" switch and D3's `already-handled` sentinel id are both
  deliberate, temporary, mock-only scaffolding (Unit 23) - Unit 24 must
  delete both entirely, not adapt them.** A real donor session has
  exactly one eligibility state and exactly one request outcome at a
  time; these exist only because PRD.md's own verify requirements ask to
  see multiple states/outcomes from a single hardcoded-data unit with no
  real session to vary. Same "sentinel trigger, not a separate demo
  toggle" pattern already used for Unit 21's `MOCK_BLOCKED_PHONE` - kept
  deliberately consistent rather than inventing a third way to preview
  mock states in this codebase.
- **D3 (`/donor/request/[id]`) is a Server Component wrapper (unwraps
  the async `params.id`) + a new Client Component,
  `components/donor/RequestResponseFlow.tsx` (Unit 23)** - same
  Server/Client split Unit 22's `/request/new` already established, for
  the same reason (a dynamic-route param needs the async `params` prop,
  which only a Server Component gets cleanly; everything below it is
  interactive). Lives inside `app/donor/(portal)/request/[id]/`, gated by
  the same `donor` role check as the rest of the portal (a prospect
  belongs to a specific donor - D3 was never meant to be reachable
  anonymously), at the exact path Unit 22's `sendPush` deep link
  (`/donor/request/${requestId}`) already points to.
- **D2's pause control and D3's "Not for a while" are the same
  underlying concept (set `paused_until` N days out) but were built as
  two independent, duplicated small UIs, not a shared component (Unit
  23)** - consistent with this codebase's established pattern of
  extracting shared *data* (`BLOOD_GROUPS`, `URGENCY_LEVELS`) but never
  shared *form JSX* (no `<BloodGroupSelect>` exists either, despite that
  select appearing in three different files already). `PAUSE_DAY_OPTIONS
  = [3, 7, 14, 30]` is a plain UI default list, not a DB-constrained enum,
  so it doesn't warrant a `lib/serialise/` entry the way blood group/
  urgency did.
- **Real gap found in this session's own cleanup discipline, not the
  shipped code - worth recording since it affects every future unit's
  verification, not just this one.** Confirmed live: a `cwd` reset
  happened silently between Bash calls at least twice during Units 22-23
  (a known behavior of this tool - `cd` does not reliably persist
  indefinitely across many calls in one long session). This made an
  earlier "confirmed clean, zero `.mjs` files" check for Unit 22 check
  the wrong directory (repo root, which never had any) instead of
  `frontend/`, silently leaving `verify-unit22.mjs`, `verify-unit22-d.mjs`,
  `verify-existing-u22.mjs`, and `app/api/test-create-request/` all still
  present days into Unit 23's own work - found and removed only because
  this unit's own cleanup pass used absolute paths and re-checked from
  scratch rather than trusting the earlier claim. Also found 8 real
  `search_logs` rows from Unit 21/22's own live Playwright runs that
  should have been deleted as part of *those* units' cleanup (Unit 14's
  own precedent already established doing this) but were missed since
  `search_logs` wasn't on the ad-hoc mental checklist used at the time.
  **Standing practice for every future unit's end-of-session cleanup:**
  use absolute paths (or re-run `pwd` immediately before trusting a
  "clean" find/ls result) and check `search_logs` alongside
  `requests`/`prospects`/`donors`/`notifications`/`push_subscriptions`
  whenever a unit's testing drove the real search UI, not just the
  tables that unit directly wrote to.
- Verified live (temporary Playwright scripts, removed after; a test
  donor session via the same role-flip-then-revert technique Unit 19
  established): D2 renders both eligibility states via the preview
  switch (available, with an active-pledge card; cooldown, with a real
  formatted return date, no pledge card), the availability toggle and
  pause control both work (pausing shows a real computed return date and
  a resume control), and all three D3 outcomes (accept/not-now/pause)
  render distinct confirmation screens, plus the `already-handled`
  sentinel correctly shows the closed-request variant with no action
  buttons. Existing features (S1, D1 entry, bank login, shell nav,
  Kannada rendering of the new keys) all re-confirmed working.
- **"Not now" and "Not for a while" do NOT set `prospects.status =
  'rejected'` (Unit 24) - a deliberate, carefully-checked reading of
  SPEC.md §3.2, not the first assumption.** `rejected` is defined there
  as "Failed screening" (a bank-side, post-acceptance outcome - Unit 28's
  B3) and `stood_down` as "no longer needed - request covered elsewhere"
  (an admin/system action when the request itself closes - Units 26/44).
  Neither describes a donor simply declining an invitation, and SPEC.md's
  own event timeline (§4.2 row 6) lists "Not now"/"Not for a while"
  without assigning either a status transition at all - only "Accepts"
  (row 7) gets one ("Prospect → accepted"). Reusing `rejected` for a
  simple decline would have misrepresented history an admin later reads
  on A2 (a "failed screening" that never happened). The prospect stays
  `invited`; `responded_at` is set so "declined but still technically
  open" is distinguishable from "never looked at." `paused_until` (the
  one real, spec'd side effect of "Not for a while" - SPEC.md's own
  "(pauses notifications)" annotation) is the only actual state change.
- **`request.stage`'s derivation now has exactly one real
  implementation, `lib/db/requests.ts`'s `syncRequestStageAfterProspectChange`
  (Unit 24), not one written inline per unit that touches a prospect's
  status.** CLAUDE.md's own invariant ("derived from its prospects...
  never write both in one place") reads as a warning against exactly
  that duplication. Deliberately narrow - only the `finding_prospects
  <-> evaluating_prospects` transition is computed (SPEC.md §3.1: "at
  least one donor accepted"); `scheduled`/`resolved`/`closed` stay
  untouched, since those are deliberate admin/bank actions (Units
  26/28/44) this function has no business guessing at from a prospect
  count alone. Unit 28's own bank-side rejection/no_show handling should
  call this same function after its own prospect write, not reimplement
  the "is any prospect still accepted/screening" check a second time.
- **Retroactive fix to Unit 22's own `zero_match_at` write: it never set
  `updated_at`, the same class of gap Unit 12 already found and fixed
  once for `bank_stock` ("the default only fires on INSERT").** Caught
  while writing this unit's own `requests` update, not by re-auditing
  Unit 22 independently - fixed inline rather than leaving one path
  correct and one silently stale.
- **D3's already-handled/already-pledged/nonexistent-request cases are
  deliberately indistinguishable from each other (Unit 24), matching
  Rule 3's "never leak more than the recipient is entitled to" spirit
  even though this isn't donor-phone data.** `getDonorRequestView` scopes
  its lookup to `donor_id = <session's own id> AND request_id =
  <url param>` together, always - a crafted URL naming a real request
  that belongs to a *different* donor gets the same generic
  "already handled" response as one that doesn't exist at all, never a
  distinguishing error that would confirm the request's existence to
  someone it isn't for.
- Verified live against the real DB and matching engine, not just the
  14 Playwright checks (all real fixtures, deleted after; role-flip-
  then-revert technique from Unit 19): a real donor with `eligible_from`
  set to a future date showed the correct real D2 cooldown state *and*
  was independently confirmed excluded from a real `createRequest` call
  matching their own blood group/region (`zero_match_at` set, 0
  `prospects` rows - the actual verify item text, "cross-check, don't
  just trust the UI," done literally). A real accept correctly
  transitioned `request.stage` from `finding_prospects` to
  `evaluating_prospects`; a second real accept attempt on a different
  request while the first pledge was still active was rejected by the
  real `one_active_pledge_per_donor` index with the first request's
  prospect confirmed *unchanged* in the DB afterward (not just an error
  shown in the UI while secretly writing something); a request
  pre-set to `scheduled` showed "already handled" immediately with no
  buttons and its prospect confirmed untouched; a nonexistent request id
  showed the same generic response. `search_logs` was re-checked as part
  of this unit's own cleanup too (the gap found during Unit 23), and
  confirmed empty afterward alongside every other state table.
- **D4's mock admin name/phone deliberately show the *assigned* case, not
  the "not assigned yet" one (Unit 25)** - unlike D2's cooldown/available
  split (Unit 23/24), this unit's own verify checklist doesn't ask for
  both states, and D2/D3 already demonstrate this portal's "nothing here
  yet" pattern elsewhere. Unit 26's real wiring must still be null-safe
  for no-admin-assigned (that's the actual common case pre-M4, per Unit
  26's own prompt text) - `noAdminYetMessage` is already in the
  dictionary for it to use, added now rather than left for that unit to
  also touch `lib/i18n`.
- **D4's mock destination bank reuses Unit 02's real seeded name/address/
  phone** - same "swap to real data later is visually seamless" reasoning
  already used for Units 13/21's mock bank data, not a fresh coincidence
  each time.
- **No schema exists yet for D4's "time window" field** - `requests` has
  no appointment/scheduled-time column (PRD.md §4.5's literal list has
  none, and `scheduled` stage's own SPEC.md definition, "admin fixes
  appointment," doesn't say where that gets stored). Not this unit's
  problem to solve (hardcoded mock only) or Unit 26's either, on reflection
  - Unit 26 only wires D4/D5 to *existing* donor/prospect/request data:
  real appointment scheduling doesn't exist until an admin can set one,
  which is M4 territory (likely Units 38/39, A2's request detail). Flagging
  here so Unit 26 doesn't feel obligated to invent a column for it, and
  M4's eventual admin-scheduling unit knows this gap is still open.
- Verified live (temporary Playwright scripts, removed after; same
  role-flip-then-donors-row-insert technique as prior D2/D3 units - this
  session's own test setup initially missed the `donors` row on the first
  pass, since a real `role='donor'` session is never reachable without
  one via the real D1 flow, so nothing catches a missing one except a
  real page load; caught immediately by the existing-features smoke
  check, not left unnoticed): D4 renders full mock bank/admin/time-window
  detail, the cancel-pledge control has a real confirm/back step (not an
  immediate destructive action) before reaching the mock "cancelled"
  outcome, and D5 renders a real-shaped donation history list plus a next
  eligible date. All fixtures reverted to the clean baseline afterward.
- **`requests.prospect_cancelled_at` added, same sparse-signal pattern as
  Unit 22's `zero_match_at` (Unit 26)** - `admin_notified_at` isn't
  reusable (same reasoning as Unit 22: it would mean an admin was
  actually notified, which isn't true until Unit 44 exists), and the
  derived `stage` alone doesn't carry the signal either - if a *second*
  prospect is still accepted/screening on the same request, one donor
  cancelling doesn't move `stage` at all, yet an admin who might already
  be coordinating with that specific donor still needs to know they
  backed out. Set unconditionally on every cancellation, not only when
  the stage actually reverts.
- **Cancel-pledge reuses Unit 24's `syncRequestStageAfterProspectChange`
  rather than re-deriving the stage inline (Unit 26)** - exactly the
  reuse that function's own doc comment asked for when it was written.
  The target prospect is looked up from the donor's own active pledge
  (`accepted`/`screening`), never a client-supplied request id - same
  "acting user" scoping as every other write in this codebase.
- **A genuine Rule-3 judgment call, not a reflexive false-positive
  dismissal: `getActivePledgeDetail`'s admin-phone read was hardened
  with an explicit `role IN ('admin','coordinator')` re-check (Unit
  26).** `requests.owner_admin_id` has no DB-level constraint keeping it
  admin-only, and nothing writes it yet at all (M4's job) - so today the
  bad case can't trigger, but the *read* code shouldn't be the thing
  relying on some future write path getting it right, given this is the
  same `profiles` table donor phone numbers live in. Verified live, not
  just reasoned about: pointed a real request's `owner_admin_id` at a
  real non-admin donor profile and confirmed D4 showed neither that
  donor's name nor phone, falling back to the same "not assigned yet"
  state as the null case.
- **D4's mock "time window" field (Unit 25) is gone entirely, replaced
  by a static `scheduleNote` ("the admin will call you to arrange a
  time"), not left as fake data now that this is a real-data unit
  (Unit 26)** - matches the schema gap already flagged in Unit 25's own
  README entry; still nothing to wire since no appointment-time column
  exists.
- Verified live against the real DB, not just the Playwright checks
  (real fixtures - a donor with an active pledge, a fixture admin
  profile, a second fixture donor's own unrelated donation, all deleted
  after): D4 correctly showed the real bank details and the "not
  assigned yet" state with no `owner_admin_id`, then the real admin's
  name/phone once one was assigned, then correctly fell back to
  "not assigned yet" again for the hardening test described above. A
  real cancel confirmed exactly the expected DB state afterward -
  `prospects.status = 'stood_down'`, `outcome_at` set,
  `requests.stage` reverted from `evaluating_prospects` back to
  `finding_prospects` (no other live prospect existed),
  `prospect_cancelled_at` set - and, the actual literal verify item text
  ("leaves no dangling active-pledge index entry"), the same donor was
  then able to accept a completely different real request immediately
  afterward without hitting `already_pledged`, proving the index entry
  was genuinely cleared, not just hidden in the UI. D5 showed exactly
  one donation (this donor's own), correctly excluding a second fixture
  donor's unrelated one from the same query. All fixtures deleted
  afterward, confirmed back to a 0-row baseline across every state
  table.
- **B3 gets a real shell nav link this time, unlike D3/B4 (Unit 27)** -
  `/bank/prospects` is a static list route, the same shape as B1/B2/B5
  (already-nav'd since Unit 10), not a dynamic per-item screen reached
  from elsewhere the way D3 (`/donor/request/[id]`) and B4
  (`/bank/prospects/[id]/confirm`) are. Same reasoning already applied
  when the donor shell's nav was designed (Unit 19): persistent nav for
  static list screens, contextual navigation only for dynamic ones.
- **B4 stays a single Client Component with `useParams()`, not a
  Server-Component-params split (Unit 27)** - deliberately following
  Units 21/23's precedent (mock-only dynamic screens with no real fetch
  yet), not Units 22/24's (which split specifically because a *real*
  async server read existed to justify it). B4 will need the same
  refactor D3/S4 already went through once Unit 28 adds a real fetch -
  expected and normal in this project, not something to preempt now.
- **"Arrived", "Rejected", "No show" are one-tap local-state
  transitions; "Donated" is the one action that navigates to a separate
  screen (B4) instead (Unit 27)** - matches PRD.md §8.1 B3's own literal
  action list ("Arrived (screening) → Donated / Rejected / No show") and
  Unit 27's own task text almost verbatim. `ProspectStatus`'s mock type
  is deliberately narrower than the real `prospects.status` enum
  (`accepted`/`screening`/`rejected`/`no_show` only, no `invited`/
  `donated`/`stood_down`) - a donor only appears on B3 at all once
  they're "scheduled to attend" (already past `invited`), and "Donated"
  is B4's own separate mock state, not a status this list ever shows
  inline.
- **Mock donor phone numbers use the same plain-digit-string convention
  `blood_banks.phone` already established (Unit 07), not a new ad-hoc
  format (Unit 27's own constraint)** - `"9900001111"`, not
  `"+91 99000 01111"` or any dashed variant. The real serialisation
  layer Rule 3 requires for actually *releasing* a donor's phone to a
  bank is deliberately not built in this unit - it's mock-only UI, and
  this is the first unit anywhere in the codebase that will show a real
  donor phone number to a non-donor party once Unit 28 wires it for
  real (every previous "phone selected outside lib/serialise" false
  positive was a bank's or admin's *own* phone, not a donor's).
- Verified live (temporary Playwright scripts, removed after; the bank
  portal's own established `must_reset_password` bypass-then-restore
  technique, same as prior bank-portal testing sessions): the new B3 nav
  link works, all three "Arrived → Donated/Rejected/No show" screening
  actions are reachable and each produces a distinct, visible status
  change on that row, "Donated" navigates to a real `/bank/prospects/
  1/confirm` URL, B4 shows the mock donor's claimed blood group with a
  real group-correction `<select>`, and confirming reaches the mock
  "confirmed" outcome naming the right donor. Existing bank-portal
  screens (B1, B2, B5) and Kannada rendering of the new keys all
  re-confirmed working. Test account's `must_reset_password` restored
  to `true` afterward.

---

## M3-so-far consistency audit (2026-08-03, after Unit 27)

Requested explicitly, not part of any single unit's own scope - a dedicated
pass re-reading Units 19-27 against each other and against the
not-yet-built prompts (28-58), the same methodology as the earlier
Units 1-18 audit. Method: full i18n key-parity check (programmatic, not
spot-checked), migration-vs-live-schema diff, grep across 28-58 for any
reference to routes/tables/columns/functions introduced in 19-27, and a
fresh `psql` check of the actual DB state.

**Clean, structurally sound:**
- i18n: 261 keys in `en.ts`, 261 in `kn.ts` - zero missing either
  direction, zero empty values, only two identical EN/KN values and both
  are correctly identical by design (`languageToggle.english` = "English",
  and an email-format placeholder).
- All 11 migration files on disk exactly match Supabase's own
  `schema_migrations` tracking - no drift, nothing applied out of band.
- Live schema matches every documented column exactly, including every
  additive migration from Units 20/22/26 (`consent_at`/`consent_version`,
  `zero_match_at`, `prospect_cancelled_at`).
- DB back to the confirmed 0-row baseline across every state table
  (`requests`/`prospects`/`donors`/`notifications`/`push_subscriptions`/
  `search_logs`), same as after every individual unit's own cleanup.
- Roadmap checkboxes exactly match reality: 1-27 checked, 28-58 not.
- Unit 39's own text ("Take-ownership sets `owner_admin_id`/
  `admin_notified_at` - this is what Units 26/30 have been reading as
  null-safe until now") independently confirms Unit 26's null-safe
  `owner_admin_id` design (including the Rule-3 role-check hardening) is
  exactly what was expected downstream - not just internally consistent,
  externally validated by a prompt file written before Unit 26 existed.

**One real gap found, not yet fixed (deliberately left for the unit that
actually owns it) - flagged inline in `prompts/30-request-status-wiring.md`
and here:**
- Units 30 and 39 both describe reusing "the stand-down logic from
  [Unit 24/26]" as if a general-purpose primitive already exists. What
  Unit 26 actually built (`lib/db/prospects.ts`'s `cancelPledge`) is
  narrower: donor-scoped, looks up exactly one prospect (the caller's own
  active pledge). Unit 30 needs to stand down *several* prospects in mixed
  statuses, all tied to one `request_id`, when a requester cancels the
  whole request - no existing function is shaped for that. Not fixed now
  (would be doing Unit 30's design work without that unit's own UI/scope
  in front of it, guessing at the right interface) - Unit 30 should
  extract a shared lower-level `standDownProspect(prospectId)` helper that
  both it and a refactored `cancelPledge` call, per the note left in that
  unit's own file.
- **Unit 28's real wiring is in place and independently verified end to
  end (2026-08-03)**, not just reviewed by reading the code:
  `lib/serialise/donor-contact.ts`'s `revealDonorContact` is the real
  Rule 3 serialisation layer flagged as needed back in Unit 27's own
  entry - a `(caller, prospectStatus, donor)` gate that only releases
  `{ name, phone }` for `bank` callers when status is `accepted`/
  `screening`, or `admin` callers when `accepted` - and
  `lib/db/bank-prospects.ts`'s `getIncomingProspects` already scopes its
  own query to `accepted`/`screening` before calling it, so the
  serialisation check is genuine defence-in-depth, not the only gate.
  `confirmDonation` reuses `syncRequestStageAfterProspectChange`'s
  sibling reasoning correctly - it does NOT call that function for the
  `resolved` transition, since that function's own doc comment (Unit 24)
  scopes it to only the `finding_prospects`/`evaluating_prospects` pair;
  `resolved` is written directly here instead, matching SPEC.md §3.1
  event 11 ("Blood collected → resolved, moved by Bank/Admin"). Verified
  live with a genuine, full real loop, not fixtures simulating each step
  in isolation: real D1 registration → real S1/S2 search → real S4
  request → the real matching engine linking them (0 fixtures involved)
  → real D3 acceptance → real B3 showing the correct donor name/phone
  (confirming the Rule 3 release fires correctly) → real "Arrived" →
  real B4 confirmation → confirmed in the DB directly afterward:
  `donors.last_donation_at`/`group_verified_at` set,
  `eligible_from` = now + `app_settings`' real `donor.cooldown_months`
  (calendar-month arithmetic, not a `* 30` approximation),
  `requests.stage = 'resolved'` with `resolved_at` set, and
  `prospects.status = 'donated'`. This is the same request→notify→
  accept→confirm→cooldown-reset loop Unit 32's own review gate will
  require - already proven working before that unit is even reached.
  `npm run lint` and `npm run security-scan` both clean afterward (2 new
  type-only-import false positives matching the existing category, one
  new `lib/db/bank-prospects.ts` phone-read finding checked by hand and
  confirmed safe - `getIncomingProspects` already filters to
  `accepted`/`screening` before `revealDonorContact` is ever called, so
  the serialisation gate is never the only thing standing between an
  unscoped read and a leak). Own test data cleaned up afterward; two
  pre-existing fixture requests unrelated to this test run
  (`f4444444...`, `f8888888...`) were deliberately left untouched rather
  than assumed safe to delete.
- **`lib/serialise/stage.ts` and `lib/serialise/close-reason.ts` added
  proactively, not after a third duplicate (Unit 29)** - same exception to
  the "wait for 3+ copies" pattern already used for `urgency.ts` (Unit 21):
  Unit 38's own text explicitly says to "keep stage vocabulary identical"
  between S5 (this unit) and A2's admin request detail, and Unit 39
  ("Close requires a reason and reuses Unit 30's close path exactly") needs
  the identical five-value `close_reason` list this unit introduces for its
  cancel-reason select. Both are just the `as const` value list/type (same
  split as `blood-group.ts`) - the actual English/Kannada label text for
  each stage/reason lives per-screen in `lib/i18n` (`search.s5.*`), not in
  these files, matching how `urgency`'s labels are also translated inline
  per screen rather than through a shared translation helper.
- **S5 stays a single Client Component with no `useParams()` read at all
  (Unit 29)** - unlike D3/B4's original mock units (Units 23/27), which did
  read the dynamic route's `id` even before a real fetch existed. Nothing
  in this unit's own mock data varies by id (PRD.md §6.1 S5 has no
  multi-state preview requirement the way D2/D3 did), so there was nothing
  to key off of; Unit 30's real data wiring will need the
  Server-Component-params split at that point anyway (same "the split
  happens when a real async read justifies it" rule already applied to
  D3/S4/B4), so nothing is lost by not pre-wiring `useParams` now.
- **Admin contact is a labelled "Contact admin" button (`tel:` link), not
  a bare phone-number link the way D4 shows the admin's number (Unit
  29).** PRD.md §6.1 S5 literally lists "Contact admin" as one of this
  screen's two buttons, unlike D4's own PRD text, which only lists
  "admin name and contact" as a data field with no button wording -
  followed each screen's own literal spec rather than copying D4's
  presentation by default.
- **The cancel-reason select offers all five `close_reason` values, not a
  narrower "requester-plausible" subset (Unit 29)** - a genuine judgment
  call, not an oversight: SPEC.md §4.1 row 12 ("Can cancel at any point...
  Requires a close reason") doesn't restrict which reasons a requester can
  pick, and neither this unit's nor Unit 30's own text draws a
  requester-vs-admin subset distinction anywhere, unlike the clearly
  separate `abusive`/moderation-flavoured reason that reads oddly for a
  requester to select against their own request. Went with the literal
  five-value list from CLAUDE.md's own invariant text and Unit 16's check
  constraint rather than inventing an unstated restriction - flagged here
  in case Unit 30 or a future UX pass decides to narrow it.
- Verified live (temporary Playwright script, removed after): `/request/
  [id]` loads with zero auth for an arbitrary id (CLAUDE.md rule 6 - no
  portal, no gate), the stage renders as "Donors responding" - never the
  raw `evaluating_prospects` string - notified/accepted counts and the
  admin block all show correctly, cancelling with no reason selected shows
  a real inline error and does not advance to the cancelled state,
  cancelling with a reason selected reaches the cancelled confirmation, and
  the Kannada toggle correctly renders the new `search.s5.*` keys. No
  donor phone field exists anywhere in this unit's mock data (the literal
  scope-limit check, not just confirmed absent from the render). Existing
  features (`/`, `/request/new`) re-confirmed still loading. `npm run
  security-scan` re-run: identical 17 BLOCKERS/17 WARNINGS to Unit 28's
  scan, zero new findings (expected - this unit touches no `lib/db`, no
  client component imports it, no phone field exists to flag). This unit
  makes zero database writes, so no fixture cleanup or baseline check was
  needed beyond confirming the 0-row baseline was undisturbed.
- **A genuine [DECIDE]-worthy gap, resolved with the project owner before
  writing any code, not guessed (Unit 30):** there is no requester
  portal/session anywhere in this codebase (unlike donor/bank_staff), and
  neither PRD.md nor SPEC.md says how `/request/[id]` is protected -
  SPEC.md §4.1's own event timeline just says the requester "watches
  status" and "can cancel at any point" with no re-verification step
  described anywhere. Confirmed with the project owner: **the unguessable
  request UUID itself is the access model** (the same trust boundary an
  order-tracking link uses), not a new OTP-re-verification flow - matches
  CLAUDE.md rule 2's own reasoning for using server-generated UUIDs
  everywhere. `getRequestStatus`/`cancelRequest`
  (`lib/db/requests.ts`) both take `requestId` as a plain parameter with
  no session resolution at all - a deliberate, narrow, documented
  exception to this codebase's usual "id is never a parameter, it's
  resolved from the session" rule (Unit 12's bank-portal precedent), not a
  pattern to copy for any screen that has a real session to scope against
  instead.
- **`standDownProspect(prospectId)` extracted into `lib/db/requests.ts`
  (Unit 30), closing the gap flagged back in the M3 audit.** What Unit 26
  built (`cancelPledge`) was narrower than "stand-down logic" in general -
  donor-scoped, one prospect. This unit's own `cancelRequest` needs to
  stand down several mixed-status prospects (including ones still
  `invited`, never just `accepted`/`screening`) tied to one `request_id`.
  Lives in `requests.ts`, not `prospects.ts`, specifically to avoid a
  circular import - `prospects.ts` already imports
  `syncRequestStageAfterProspectChange` from `requests.ts`, so putting the
  new shared primitive in the file `prospects.ts` already depends on (and
  having `cancelPledge` import one more thing from it) keeps the
  dependency graph one-directional instead of introducing a
  `requests.ts` <-> `prospects.ts` cycle. `standDownProspect` itself is
  deliberately inert beyond the one row's status/timestamp - it never
  calls `syncRequestStageAfterProspectChange` or touches `requests`,
  since its two callers need different follow-up (`cancelPledge` still
  derives the stage afterward; `cancelRequest` sets `stage = 'closed'`
  directly regardless of remaining prospect counts) - baking either choice
  into the primitive would make it wrong for the other caller. `cancelPledge`
  now calls this shared helper instead of its old inline update - there is
  genuinely one implementation of "what stand-down means," not two that
  happened to set the same status string.
- **`STANDDOWNABLE_STATUSES` (`invited`/`accepted`/`screening`) is
  deliberately broader than `syncRequestStageAfterProspectChange`'s
  `ACTIVE_PLEDGE_STATUSES`-equivalent check (`accepted`/`screening` only)
  (Unit 30).** SPEC.md §4.1 row 12's "Remaining prospects stood_down and
  thanked" means every non-terminal prospect, including donors who were
  invited but never responded - a real, deliberate difference from
  `declineProspect`/D3 (Unit 24), which only ever handles a donor's own
  narrower decision about their own invitation. Verified live, not just
  reasoned about: a real request with one `invited` (never-responded)
  fixture prospect was cancelled and the prospect correctly became
  `stood_down`; a separate real request with one `accepted` prospect was
  also cancelled and correctly stood that one down too.
- **`lib/serialise/stage.ts`/`close-reason.ts` from Unit 29 are now
  actually consumed for real logic, not just mock display (Unit 30)** -
  `getRequestStatus` types its return against `RequestStage`,
  `cancelRequest` validates the incoming `closeReason` against
  `CLOSE_REASONS` server-side (this unit's own literal verify item:
  "rejected by the server, not just the client form") - confirmed live via
  a temporary API route calling `cancelRequest` directly with `""` and
  with a nonsense string, both correctly threw `invalid close reason`
  before ever reaching the database.
- **A real, previously-unreachable-in-production gap found and fixed, not
  asked for verbatim in this unit's own task text (Unit 30) - same
  category as Unit 22's `incrementNotifCounts` or Unit 12's
  `bank_stock.updated_at` fix.** Nothing anywhere in the shipped codebase
  ever linked forward from S4's "submitted" confirmation to
  `/request/[id]` - Unit 22 (S4's own wiring) predates S5's existence, so
  it never had anywhere to link to. Without this, S5/Unit 30's entire
  feature would be unreachable by a real user in production despite being
  fully wired underneath. Fixed by having `RaiseRequestFlow.tsx` capture
  `raiseRequestAction`'s already-returned `requestId` (Unit 22 always
  returned it, just unused until now) and rendering a
  "View request status" link on the submitted screen - a two-line change,
  new `search.s4.viewStatusLink` i18n key, nothing else touched.
- **Verified against the real DB and a real running dev server, not just
  fixtures simulating each step in isolation (temporary Playwright
  scripts, a temporary API route, and real fixture donors/admin profile,
  all removed/cleaned up after):** a real S1-less S4 submission with a
  blood group no fixture donor could match (`AB-`) showed the correct
  zero-notified/zero-accepted state and a real client-side-blocked ->
  server-confirmed cancel; a second real submission (`O+`) matched a real
  fixture donor through the actual matching engine (one real `invited`
  prospect, zero fixtures pre-seeded into that read) - confirmed the
  donor's real phone number (`919911110001`) never appeared anywhere in
  either the rendered page text or the raw server response HTML for that
  page, the literal Rule 3 verify item, checked by inspecting the actual
  response, not just the UI. Admin-contact display was verified both
  ways: a real `admin`-role profile assigned via `owner_admin_id` showed
  correctly, then the same field pointed at a real `donor`-role profile
  (the Unit 26 hardening scenario) correctly fell back to "not assigned
  yet" and leaked neither that donor's name nor phone. A third real
  submission's prospect was manually flipped to `accepted` to prove the
  broader stand-down set. Finally, a full real D1-less donor session
  (phone-role-flipped `...02`, matching Unit 19's established technique)
  drove a real D3 accept -> real D4 cancel-own-pledge round trip against a
  fourth real request, confirming the `cancelPledge` refactor didn't
  regress: the donor's prospect still correctly became `stood_down` and
  the request's stage still correctly reverted to `finding_prospects`. All
  four real requests, their prospects/notifications, three fixture
  profiles (two donors, one admin), and `...02`'s temporary donor role/row
  were fully cleaned up afterward - confirmed back to the 0-row baseline
  across every state table.
- **Genuine [DECIDE]-worthy contradiction, resolved with the project owner
  before writing any code (Unit 31): the task text's own word "push" for
  the idle-request prompt cannot literally happen - and this unit's own
  "Read before writing" line ("Unit 18's `sendPush` - reuse for the idle
  prompt") was deliberately not followed, not overlooked.** Unit 18 deliberately
  never subscribes a requester to push (only the donor-registration page
  does - see that unit's own README note: "must never trigger a push
  subscription" on the request-raising flow), so there is no channel to
  push this to today. Separately, SPEC.md §4.1 row 13's "no reply ->
  auto-expire" implies a reply mechanism that doesn't exist anywhere in
  S5's actual built field list (PRD.md §6.1 S5: only "Contact admin"/
  "Cancel request", no "still needed" button). Confirmed with the project
  owner: a passive S5 banner, not a push. `requests.idle_prompted_at`
  (new column, this unit's migration) is the marker; S5 shows a "Still
  needed?" banner with a "Yes, still needed" button when set
  (`confirmStillNeeded` in `lib/db/requests.ts`) - no new push
  infrastructure, doesn't reopen Unit 18's decision.
- **pg_cron + pg_net calling a protected Next.js route, not a plpgsql
  function doing the actual work (Unit 31).** Matches PRD.md §2's own
  "cron → protected route" mechanism and keeps business logic in
  `lib/db/*.ts` - a SQL-only version of this job would have had to
  reimplement Unit 30's `cancelRequest`/`standDownProspect` a second time,
  in a different language, violating this codebase's "shared derivation
  logic gets exactly one implementation" rule. `pg-boss` (CLAUDE.md's
  other named option) needs a persistent worker process, which doesn't
  fit this project's Vercel/serverless hosting decision (PRD.md §2) at
  all - pg_cron/pg_net runs entirely inside Postgres and calls out to a
  stateless HTTP endpoint, which does.
- **`alter database postgres set app.settings.*` (a GUC-based secret,
  the "obvious" approach from generic Postgres/pg_cron tutorials) is
  blocked on this Postgres image - confirmed live, not assumed:**
  `ERROR: permission denied to set parameter "app.settings.site_url"`,
  even as the `postgres` role. Switched to Supabase Vault
  (`vault.create_secret`/`vault.decrypted_secrets`), the Supabase-native
  mechanism for exactly this, confirmed working on the first try. Two
  secrets stored: `cron_site_url` (`http://host.docker.internal:3000` -
  pg_net runs *inside* the Postgres container, so `localhost` there means
  the container itself, not the Next.js dev server; Docker Desktop's
  `host.docker.internal` is the standing name for the host machine - a
  different value from the app's own `NEXT_PUBLIC_SITE_URL`, which is
  what a *browser* uses, not interchangeable) and `cron_secret` (checked
  against `/api/cron/*`'s own `CRON_SECRET` env var via
  `lib/cron/verify.ts`'s `verifyCronRequest`). Both are local-dev
  placeholders, same spirit as Unit 04's test-OTP numbers - must be
  replaced with real values at any real deployment.
- **`requests.idle_prompted_at` and both new cron jobs key off
  `updated_at`, not `created_at` (Unit 31)** - SPEC.md §4.1 row 13's own
  wording is "No activity for a set period," and `updated_at` is what
  every stage-changing write in this codebase already bumps. A request
  that's genuinely being worked (a donor just accepted) shouldn't get
  idle-prompted or auto-expired just because it happens to be old by
  *creation* time alone. Both jobs also deliberately exclude `scheduled`
  requests (a new `SEARCHING_STAGES` list, narrower than the existing
  `OPEN_STAGES`) - a scheduled request has a real appointment in motion,
  it isn't "idle."
- **The monthly notif-count reset job is not strictly required for
  matching correctness, and built anyway for a real, separate reason -
  not busywork for its own sake (Unit 31).**
  `lib/matching/eligibility.ts`'s `isDonorEligible` (Unit 17) already
  treats a stale `notif_month` as "count doesn't apply," and
  `incrementNotifCounts` (Unit 22) already lazily resets on the next
  write - a donor at cap in month M is already correctly eligible again
  in month M+1 with zero code from this unit. Built the explicit
  `resetStaleNotifCounts` job anyway because the *stored* value stays
  honest for any future direct reader that doesn't replicate
  `eligibility.ts`'s exact staleness check (an admin donor-lookup screen,
  Unit 41; a metrics query, Unit 55) - flagged so neither of those units
  treats a possibly-stale-looking `notif_count_month` as a bug to
  re-investigate.
- Verified live against the real DB and dev server, not just reasoned
  about (temporary fixture donors/requests, removed after): auth
  rejection confirmed for all three `/api/cron/*` routes (no header, wrong
  secret) before testing the correct-secret path. Reset job correctly
  zeroed a donor with a stale (`2026-07-01`) `notif_month` to the current
  month while leaving an already-current-month donor's real count of 3
  untouched. Idle-prompt job correctly marked only a `finding_prospects`
  request 13h stale, left a 5h-stale `evaluating_prospects` request and a
  13h-stale `scheduled` request untouched, and was confirmed idempotent
  (re-run immediately after found 0 more to prompt). S5 rendered the real
  banner and "Yes, still needed" correctly cleared it, confirmed in the DB
  as both `idle_prompted_at = null` and a bumped `updated_at` - re-running
  the idle job immediately after confirmed the request was NOT re-prompted
  (the clock genuinely reset, not just the banner hidden). Expiry job
  correctly auto-closed a 49h-stale `finding_prospects` request
  (`stage='closed'`, `close_reason='expired'`) and stood down its one real
  `invited` prospect via the reused `cancelRequest` path, while a
  49h-stale `scheduled` request was correctly left untouched. All fixture
  donors/requests/prospects removed afterward, confirmed back to the
  0-row baseline. `npm run security-scan`: identical 18 BLOCKERS/18
  WARNINGS to Unit 30's scan, zero new findings.
- **Unit 33's own task text describes two things that turned out to
  already be done, discovered by checking rather than assumed from the
  file's own wording, and its actual remaining scope is narrower than
  written.** `notifications` already existed (Unit 18's own migration
  comment explicitly anticipated this - "created here because Unit 33
  explicitly depends on Unit 18 and checks for this table before creating
  it itself"), confirmed by a schema query before writing anything (exactly
  one `notifications` table). The unit's other instruction - "seed the
  seven escalation/expiry timing values from SPEC.md §5 into
  `app_settings`" - was **also** already fully done, by Unit 02: all nine
  keys (the seven SPEC.md rows, two of which each bundle two values),
  identical suggested defaults, already commented "owned by the Lions
  Club per PRD.md §15 item 1" verbatim in that migration - confirmed by
  reading Unit 02's actual migration file, not assumed from the README's
  own prior summary of it. Neither gap is a bug in Unit 02/18 - both units
  built these proactively because CLAUDE.md required them (RLS/timing
  rules) and no earlier unit had been explicitly allocated the work, the
  same reasoning already documented in Unit 02's and Unit 18's own
  entries above. **This unit's real, actual scope was therefore just the
  migration adding `admin_rota` and `audit_log`** (`supabase/migrations/
  20260803190000_admin_ops_schema.sql`), per PRD.md §4.6's literal schema,
  plus judgment calls on its bare (unmarked) columns:
  - `admin_rota.region_id`/`admin_id`: `not null` - same "FK the row is
    meaningless without" reasoning as every prior unit's own bare-FK
    resolutions (Unit 07's `bank_stock.bank_id`, Unit 16's several,
    Unit 18's `notifications.donor_id`).
  - `admin_rota.priority`: `check (priority in (1, 2))` added - PRD's own
    comment ("1 = primary, 2 = secondary") names exactly two meaningful
    values, matching this schema's existing style for every other
    finite-value column.
  - **A new partial unique index, `one_active_admin_per_region_priority`
    on `(region_id, priority) where is_active = true`, added beyond PRD's
    literal text** - not asked for verbatim, added because Units 39/44
    both read "the" primary admin for a region as a singular value
    ("Transfer sets the receiving region's primary admin... as the new
    owner"; "no-prospect timeout notifies the primary admin") - the
    schema needs to make two simultaneously-active primaries for one
    region impossible, or that assumption silently breaks. Same category
    of addition as Unit 16's own two partial unique indexes for its real
    invariants, and Unit 02's `region_adjacency_no_self_reference` check -
    a sensible default following established precedent, not asked to
    stop and confirm since it's a narrow data-integrity constraint
    directly implied by already-written downstream unit text, not an
    open architectural trade-off. District-coordinator escalation (the
    §9.2 third tier) is deliberately **not** represented as a rota row -
    PRD's own `admin_rota` schema only defines two priority levels, and
    SPEC.md §3 item 1 describes the coordinator as a role-wide fallback,
    not a per-region rota entry - resolved by `profiles.role =
    'coordinator'` directly, left for whichever unit (44) actually
    queries it.
  - `audit_log.actor_id`/`entity_id`: `not null` - PRD's `action`/
    `entity_type` are already `not null` in its own text; every planned
    use grepped across `prompts/*.md` (`view_contact`, `close_request`,
    transfer, block-user) always names both an actor and a specific
    entity, so both were resolved the same way. `action` stays plain
    `text`, deliberately not a check-constrained enum - PRD's own comment
    is an open-ended example list ("'view_contact', 'close_request',
    ..."), unlike `stage`/`status`/`close_reason`'s exhaustive lists
    elsewhere in this schema.
  RLS enabled on both new tables in the same migration (Unit 06
  precedent); `service_role` grants confirmed automatic via Unit 04's
  `alter default privileges` rule, zero grants to `anon`/`authenticated` -
  checked directly against `information_schema.role_table_grants`, not
  assumed from the rule existing.
- **Verified directly against the real local DB, not just reasoned about**
  (real fixture profiles, all cleaned up after): a first active
  priority-1 admin for the seeded region succeeds; a second active
  priority-1 admin for the *same* region is correctly rejected by the new
  partial unique index; a priority-2 admin for the same region succeeds
  (different priority, no conflict); `priority = 3` is correctly rejected
  by the check constraint; an *inactive* duplicate priority-1 row for the
  same region correctly succeeds (the partial index only covers
  `is_active = true`, confirming a rota handoff isn't blocked). A valid
  `audit_log` row succeeds; omitting `actor_id` or `entity_id` is
  correctly rejected. `npm run lint` clean, `npm run test` 34/34
  unchanged, `npm run security-scan` identical 18 BLOCKERS/18 WARNINGS to
  Unit 31's scan with zero new findings (expected - this unit touches no
  `lib/db` file and no client component). All fixtures removed afterward,
  confirmed back to the 0-row baseline across every state table
  (`requests`/`prospects`/`donors`/`notifications`/`push_subscriptions`/
  `search_logs`/`admin_rota`/`audit_log`) and `profiles` back to its
  4-row seeded baseline.
- **A genuine historical-reconstruction judgment call for Unit 34, not a
  guess: the forced-reset step is inline client-side state inside
  `AdminLoginFlow`, not a separate route, deliberately diverging from
  what the *current* `BankLoginFlow`/`ForcedPasswordResetForm` files look
  like today.** Those files reflect Unit 09's later real-wiring refactor
  (this repo has no git history to diff against - "Is a git repository:
  false" - so the split was reconstructed from this file's own prose, not
  read directly): Unit 09's own entry above says the screen "is its own
  route... **not** a client-side step inside `/bank/login`" *as of Unit
  09* - meaning it must have started as exactly that inside
  `BankLoginFlow`, and Unit 08's own entry independently confirms this
  ("every login was treated as first-login and always proceeded to the
  forced-reset step" via a mocked `setTimeout`, no separate route
  mentioned). Unit 34's own task text uses near-identical wording to
  Unit 08's ("a forced-password-reset screen shown on first login"),
  so `AdminLoginFlow.tsx` mirrors Unit 08's *original* shape - one
  component, `"login" | "reset" | "success"` step state, mocked
  `setTimeout` submit for both steps - not the current post-refactor
  `BankLoginFlow`/`ForcedPasswordResetForm` split. This is also the
  correct call independent of the historical reconstruction: a separate
  `/admin/reset-password` route would need its own `proxy.ts`
  `RESET_PASSWORD_GATES` entry to mean anything (Unit 09's own reasoning
  for why the split was necessary), and there is no real
  `must_reset_password` claim to gate on until Unit 35 wires real auth -
  `proxy.ts`'s own existing comment already says as much ("keyed by
  portal prefix so Unit 35... adds a row here, not a second mechanism").
  **Unit 35 should follow Unit 09's own precedent exactly: split into a
  real `/admin/reset-password` route only once it adds the real
  `RESET_PASSWORD_GATES` entry, not before** - flagged here so that
  unit's own work doesn't second-guess this unit's inline-state choice as
  an oversight.
- **`lib/supabase/proxy.ts`'s unauthenticated-access carve-out extended
  to `/admin/login`, the same fix Unit 08 needed for `/bank/login`
  (found live-testing in this unit too, not merely assumed from
  precedent)** - without it, `/admin`'s existing `PORTAL_ROLES` gate
  (`admin`/`coordinator`, live since Unit 05, from before any admin route
  existed) would redirect an anonymous visit to `/admin/login` straight
  to `/`, exactly the bug Unit 08's own entry describes for the bank
  portal. Verified live: `/admin/login` loads directly with no
  redirect and no session; `/admin` itself (no session) still correctly
  redirects to `/`, confirming the carve-out is narrowly scoped to the
  login path only, not the whole `/admin/*` tree.
- New `adminAuth.*` i18n namespace (21 keys) mirrors `bankAuth.*`'s exact
  key shape, real Kannada translations (not copied English) matching
  `bankAuth`'s existing translation style - `emailPlaceholder` uses
  `you@lionsclub.example` rather than `bankAuth`'s `you@bank.example`,
  since this account tier isn't bank-affiliated.
- Verified live (temporary Playwright script, removed after, absolute
  paths used throughout - this session's own `pwd` check confirmed the
  cwd had silently reset to the repo root by the time cleanup ran,
  exactly the standing gotcha `[[project_environment_gotchas]]` already
  documents, caught before it could leave anything behind): `/admin/login`
  loads unauthenticated, the login heading renders, no forgot-password
  control exists anywhere, empty submit shows both field errors without
  advancing, a valid mocked login reaches the reset step, a too-short
  password and a mismatched-confirmation are both rejected client-side
  without advancing, a valid reset reaches the mocked success step, the
  Kannada toggle correctly renders the new `adminAuth.loginTitle` key (and
  - confirming the shared locale cookie still works exactly as designed
  across every portal, not a regression - the toggle's effect was still
  visible on `/bank/login` until explicitly switched back), `/admin` with
  no session still redirects to `/`, and `/`, `/bank/login`, `/donor/
  register` all still load correctly. `npm run lint` clean, `npm run test`
  34/34 unchanged, `npm run security-scan` identical 18 BLOCKERS/18
  WARNINGS to Unit 33's scan with zero new findings (expected - no
  `createClient()` call exists anywhere in this unit's mocked component,
  and grepping the scan output for any reference to the new files found
  none). Zero DB writes this unit - baseline reconfirmed unchanged
  rather than skipped just because no writes were expected.
- **Unit 35 wired `AdminLoginFlow`/added `AdminForcedPasswordResetForm`
  for real, following Unit 09's bank-portal precedent exactly, and split
  the forced-reset step out of `AdminLoginFlow` into its own route right
  where Unit 34's own entry above said it would.** `custom_access_token_
  hook` needed zero changes - Unit 09's own migration already made
  `profile_role`/`must_reset_password` fully role-agnostic (the SQL
  query has no role filter at all), exactly matching that migration's own
  comment ("Unit 35 needs the identical mechanism... should add a role to
  a check, not invent a second flag") - confirmed by reading the live
  migration file before writing any code, not assumed. `proxy.ts` gained
  one line, `{ prefix: "/admin", resetPath: "/admin/reset-password" }` in
  `RESET_PASSWORD_GATES` - the exact row that file's own existing comment
  already reserved for this unit.
- **`completeForcedPasswordReset` (`lib/actions/bank-auth.ts`, Unit 09) is
  reused as-is by the new `AdminForcedPasswordResetForm`, not
  duplicated** - it was already fully role-agnostic (derives the id from
  the caller's own session, no bank-specific logic anywhere in it), so a
  second copy would have been pure duplication of exactly the kind this
  codebase's own conventions avoid. Deliberately did **not** rename the
  file despite the now-slightly-stale "bank-auth" name - a rename here
  would be refactoring beyond what this unit's task requires for a purely
  cosmetic mismatch; a short doc-comment addition flags the reuse instead
  so a future reader isn't confused about why an admin component imports
  from a file named `bank-auth.ts`.
- **The seed script gained admin/coordinator accounts by extension, not a
  second script** - `CLAUDE.md`'s own Commands table already described
  `db:seed:accounts` as covering "test bank_staff/admin accounts" before
  this unit started, so the single-command design was already decided,
  not invented here. `frontend/scripts/seed-bank-accounts.mjs` (filename
  kept as-is for the same "don't rename an already-shipped file for a
  cosmetic reason" call as above) now loops over a role-tagged account
  list with per-role `profileFields`: `bank_staff` gets `bank_id`
  (unchanged), `admin` gets `region_id` (Unit 02's placeholder Sirsi
  region - Unit 37 reads "the acting admin's region_id" directly per its
  own task text, so this is the field that matters for that unit, not
  `admin_rota`), and `coordinator` gets neither - a genuine, reasoned
  choice, not an oversight: SPEC.md §3 item 1 frames the coordinator as a
  *district-wide* escalation fallback, and Unit 33's own `admin_rota`
  schema only has two per-region priority tiers with no coordinator row
  shape, so a coordinator's scope is resolved by `role = 'coordinator'`
  directly, never a region. **No `admin_rota` rows were seeded by this
  unit** - Unit 35's own task text only asks for accounts, and no
  downstream unit's text says who populates the rota itself; flagging
  this open question explicitly rather than silently assuming Unit 37 or
  44 already has it covered.
- **Verified against the real local Supabase stack and real Auth API, not
  mocked (temporary Playwright scripts, removed after):** `admin1@test.
  local` and `coordinator1@test.local` both real-login via
  `signInWithPassword`, both correctly redirect to the real
  `/admin/reset-password` route (not an inline step, confirming the route
  split works), both complete a real `updateUser` password change +
  `completeForcedPasswordReset` + `refreshSession` round trip and reach
  the success step, and - the literal verify-item text - a wrong password
  is rejected with the real server-checked error message (confirmed by
  direct page-content inspection after a Playwright text-matcher timing
  issue in the first script run gave a false failure - re-checked by
  hand, not just re-run blindly). A session's `profile_role` claim being
  genuinely distinguishable between `admin` and `coordinator` was
  exercised implicitly by both accounts completing the identical flow
  correctly (Unit 49/50's coordinator-only gate is what will actually
  branch on the distinction; this unit only needed to prove the claim
  round-trips correctly for both roles, which it does). Cross-portal
  isolation re-confirmed: a freshly-authenticated `admin` session visiting
  `/bank` still correctly redirects to `/` (the role gate holds across
  portals, not just within one). Unit 09's own bank_staff flow re-run
  fresh and confirmed unaffected by this unit's changes. `npm run lint`
  clean. `npm run test` 34/34 unchanged. `npm run security-scan`: 20
  BLOCKERS (up from 18) + 18 WARNINGS (unchanged) - the two new findings
  are `AdminLoginFlow.tsx`/`AdminForcedPasswordResetForm.tsx`'s own
  `createClient()` calls, checked by hand and confirmed the exact same
  already-documented false-positive category as `BankLoginFlow.tsx`/
  `ForcedPasswordResetForm.tsx`'s own long-standing entries in this same
  BLOCKERS list (immediately followed by `signInWithPassword`/
  `updateUser`, both on the Rule 1 clarification's allowed list) - zero
  real new findings. `admin1`/`coordinator1`'s `must_reset_password` was
  explicitly restored to `true` afterward via direct DB update (mirroring
  Unit 11's own precedent for `bankstaff1` - these are permanent local
  fixtures like the bank accounts, not throwaway test data, so the
  post-test state matters for whoever tests next), confirmed via `psql`.
  Every other state table reconfirmed at its 0-row baseline; `profiles`
  correctly at 6 rows (4 prior + these 2 new permanent fixtures, not
  reverted since they're meant to persist).
- **Unit 36 built the `/admin` shell + A1 in one unit (unlike bank's
  Unit-10/11 split), matching this unit's own task text literally** -
  `lib/db/admin-portal.ts`'s `getActingAdmin()`/`getAdminContext()`
  mirror `bank-portal.ts`'s `getActingBankStaff()`/`getBankStaffContext()`
  exactly, including the same defensive role re-check pattern already
  established for `owner_admin_id` reads (Units 26/30) - here checking
  the *caller's own* role is actually `admin`/`coordinator`, not trusting
  `proxy.ts`'s route gate alone. `regionId`/`regionName` are nullable by
  design, not an oversight - coordinators are a district-wide role
  (SPEC.md §3 item 1), confirmed live with the real seeded
  `coordinator1@test.local` fixture showing "Coordinator · District-wide"
  in the header with no region.
- **Nav is 5 items, not 6** - A2 (`/admin/request/[id]`) is a dynamic
  per-row route reached from A1, not a persistent nav destination, same
  treatment as D3/B4's dynamic routes in Units 19/27. No stub page was
  created for it either (unlike A3/A4/A5/A6) - A1's mock rows don't link
  anywhere yet, so there's nothing that would 404; Unit 38 creates this
  route for the first time when it actually has content for it.
- **A3/A4/A5/A6 got real stub placeholder pages (`donors`/`banks`/
  `reports`/`audit`), same "…will appear here soon" pattern and wording
  style as Unit 10's original bank placeholders** - needed since all four
  are real persistent nav links in this unit's own shell; a nav link with
  no page behind it would 404, unlike A2. A6's stub is deliberately
  identical in shape to the other three, not pre-empting Unit 49's own
  job of adding a visible "coordinator access only" indicator - flagged
  in the stub's own comment so Unit 49 doesn't read the plain wording as
  something to preserve rather than replace.
- **A1's escalation flag implements the real per-urgency/per-stage
  semantics from PRD.md §9.2's "No prospect" row (>20 min normal, 0 min
  emergency, `finding_prospects` stage only), not a simplified single
  age-threshold rule - deliberately, so Unit 37's own task text ("reads
  its value from `app_settings`, not a hardcoded number") is accurate:
  the *logic* already exists here, only its threshold *source* changes in
  Unit 37.** Two named mock constants
  (`MOCK_ESCALATION_THRESHOLD_NORMAL_MINUTES` / `_EMERGENCY_MINUTES`)
  hold the same suggested defaults Unit 33 already seeded into
  `app_settings`, matching the exact hardcoded-mock-constant pattern
  Units 13/21 already established for this same category of scanner
  finding. 8 mock rows deliberately span all 5 stages, both urgencies,
  flagged/unflagged, owned/unowned, and zero/nonzero prospect counts -
  verified live that exactly 2 of 8 rows show the flag (the two
  `finding_prospects` rows past their respective threshold), not more or
  fewer.
- **Stage labels/filter options reuse `search.s5.stage*` i18n keys
  directly, a genuine cross-namespace reuse, not a new
  `adminPortal.queue.stage*` set** - Unit 39's own text ("keep stage
  vocabulary identical" between S5 and A2) is the explicit instruction
  this follows; since A1 is the same product-wide stage vocabulary as A2,
  applying it here too avoids a fourth independently-typed copy of the
  same five strings (`RequestStatusView.tsx`'s `stageLabel()` switch is
  now mirrored verbatim in `AdminQueueBoard.tsx`, not reinvented).
  Urgency labels, by contrast, get their own local
  `adminPortal.queue.urgencyNormal`/`urgencyEmergency` keys, matching
  Unit 21's own established precedent that urgency's *label text* (unlike
  its *value list*, `lib/serialise/urgency.ts`) is translated inline per
  screen, not centralized.
- **`AdminQueueBoard` stays a single Client Component with no server read
  of its own, same "mock-only dynamic screen" precedent as Units
  21/23/25/27** - the Server+Client split happens once Unit 37 adds a
  real fetch to justify it, not before.
- Verified live against the real local Supabase stack and real Auth API
  (temporary Playwright script, removed after; both real seeded fixtures
  logged in through their actual current password from Unit 35's own
  testing, then reset again): the shell header shows real role + region
  text for `admin1` ("Admin · PLACEHOLDER — Sirsi") and real role +
  district-wide text for `coordinator1` ("Coordinator · District-wide",
  confirming the nullable-region design renders correctly, not just
  compiles), the nav renders exactly the 5 expected items in order, A1
  renders all 8 mock rows by default sorted urgency-then-age (the oldest
  emergency-tier row, 5h ago, correctly first), exactly 2 rows show the
  escalation flag, the stage filter correctly narrows to 1 row when set
  to "Closed", all four stub routes render their placeholder with no
  404, the Kannada toggle renders the new `adminPortal.queue.title` key,
  `/admin` with no session still redirects to `/`, and `/`, `/bank/
  login`, `/donor/register` all still load. `npm run lint` clean. `npm
  run test` 34/34 unchanged. `npm run security-scan`: 21 BLOCKERS (up
  from 20) + 18 WARNINGS (unchanged) - the one new finding is
  `components/admin/SignOutButton.tsx`'s own `createClient()` call,
  checked by hand and confirmed the exact same already-documented
  category as `components/bank/SignOutButton.tsx`/`components/donor/
  SignOutButton.tsx` (immediately followed by `signOut()`, on the Rule 1
  clarification's allowed list) - zero real new findings.
  `admin1`/`coordinator1`'s `must_reset_password` restored to `true`
  afterward via direct DB update, same reasoning as Unit 35's own
  cleanup - these are permanent fixtures, not throwaway test data. Every
  state table reconfirmed at its expected baseline (0 rows everywhere
  except `profiles`, still correctly at 6).
- **Unit 37 wired A1 to real data - `lib/db/requests.ts`'s `getAdminQueue`/
  `getEscalationThresholds`, not a new `admin-portal.ts`/`admin-requests.ts`
  file** - deliberate: this queries the `requests` table, and this
  codebase organizes `lib/db/` by *table*, not by *portal*
  (`bank-portal.ts` itself only holds acting-user resolution + the bank's
  own settings, never `bank_stock`/`bank_shortages` reads - those live in
  their own table-named files). `getActingAdmin()` stays in
  `admin-portal.ts`, matching that same split.
- **A coordinator (`regionId === null`) gets an explicit, worded empty
  state, not a query run with a null region** - a genuine, reasoned
  design choice, not an oversight: `requests.region_id` is `not null`
  (Unit 16), so `.eq("region_id", null)` would silently return zero rows
  either way (SQL `NULL` never equals anything, not even another `NULL`),
  but doing that without telling the coordinator *why* their queue is
  always empty would look identical to "this region genuinely has no open
  requests," which is misleading. This unit's own constraint text ("do
  not add a way to view another region's queue") also reads as ruling out
  the alternative design (an all-regions view for coordinators) - not
  guessed silently, reasoned from the constraint's own wording. Flagging
  this here as a real, non-obvious product-UX question for whoever
  revisits the coordinator experience later - today a coordinator's own
  A1 is deliberately inert, not a bug.
- **`getAdminQueue`'s prospect-count aggregation is one query for the
  whole page, not one query per request row** - fetches every
  `prospects.request_id` for the returned page's request ids in a single
  `.in()` call, then counts in JS. Same "multiplied cap" pattern already
  established by `getSearchResults`' `MAX_STOCK_ROWS` (Unit 14: "8 groups
  x `MAX_BANKS_PER_REGION`"), applied here as `MAX_QUEUE_ROWS * 50` -
  avoids up to `MAX_QUEUE_ROWS` (50) round trips, not a premature
  optimization: this is a page every admin loads on every visit, unlike a
  one-off write.
- **The escalation flag now implements PRD.md §9.2's real per-urgency/
  per-stage semantics against real `app_settings` values, exactly
  matching the logic Unit 36 already built with hardcoded mock
  constants** - only the threshold *source* changed
  (`getEscalationThresholds()` replaces
  `MOCK_ESCALATION_THRESHOLD_NORMAL_MINUTES`/`_EMERGENCY_MINUTES`), per
  this unit's own task text ("reads its value from `app_settings`, not a
  hardcoded number") - confirming Unit 36's own design note ("so Unit
  37's job really is just swapping the threshold source... not adding
  missing logic") held up exactly as planned. Sort and the flag
  computation both stayed client-side (unchanged from Unit 36), still
  computed from real `createdAt` timestamps against "now" at render time,
  same "genuinely clock-relative, not baked into the server response"
  reasoning as S2's open/closed badge.
- **Verified against the real local Supabase stack with two real admin
  sessions in two different regions, not one session assumed to
  generalise** (temporary fixtures - a second real region, a second real
  Auth admin account via the Auth Admin API mirroring
  `seed-bank-accounts.mjs`'s own `createUser` pattern, seven real
  requests spanning both regions/all five stages/both urgencies, two real
  donor+prospect fixtures for a prospect-count check - all removed after,
  including the temporary Auth user via `auth.admin.deleteUser`):
  `admin1` (real Sirsi region) saw exactly its own region's 5 open-stage
  requests, never region2's `resolved` or `finding_prospects` requests;
  a second real admin account in region2 saw exactly its own region's 1
  open request, never Sirsi's - **region isolation confirmed in both
  directions with two real sessions**, not just one session's own
  region assumed correct by symmetry. The real escalation flag was
  checked against real elapsed wall-clock time crossing the real 20-minute
  normal threshold *while the fixtures sat idle during debugging* - a
  genuinely interesting confirmation, not a flaky test: a `normal`-urgency
  fixture request inserted at "8 minutes old" was correctly unflagged on
  an earlier check and correctly became flagged once real time pushed its
  age past 20 minutes on a later check, and a freshly-inserted "0 minutes
  old" `normal` request was then confirmed still correctly unflagged -
  proving the threshold boundary works in both directions against the
  real clock, not merely a fixed mock. A real `emergency` request at ~1
  minute old was correctly flagged immediately (the real 0-minute
  threshold). Real prospect count (2, from two real `prospects` rows) and
  real owner name (joined from `profiles` via `owner_admin_id`) both
  rendered correctly. `coordinator1` (real `null` region) saw the
  explicit no-region message, not an empty table with no explanation.
  Stage filtering against real data confirmed. `npm run lint` clean.
  `npm run test` 34/34 unchanged. `npm run security-scan`: 22 BLOCKERS (up
  from 21) + 18 WARNINGS (unchanged once the temporary setup script was
  removed - it briefly added 2 more, both the exact already-documented
  "insert payload sets an id field... no client request in a seed script
  for Rule 2 to even apply to" category, gone with the file). The one
  permanent new BLOCKER, checked by hand: `AdminQueueBoard.tsx`'s
  `import type { AdminQueueRow, EscalationThresholds } from
  "@/lib/db/requests"` - same already-documented type-only-import false
  positive as every prior instance of this category, erased at compile
  time. All fixtures (region2, the temporary Auth admin, seven requests,
  two donors/prospects) removed afterward; `admin1`/`coordinator1`'s
  `must_reset_password` restored to `true` (same reasoning as Units 35/36
  - permanent fixtures, not throwaway); every state table reconfirmed
  back to its exact baseline (`regions` at 1, `profiles` at 6, every
  other state table at 0).
- **Unit 38 (A2 request detail, hardcoded) stays a single Client
  Component using `useParams()`, the exact same "mock-only dynamic
  screen" precedent as Units 21/23/27** - `useParams()` itself doesn't
  exist anywhere else in the current codebase (D3/B4 both had it removed
  when their own real-wiring units, 24/28, added the Server-Component
  split) - reconstructed fresh from README's own textual description of
  that precedent, not copied from any still-existing file, since this
  repo has no git history to diff against.
- **The donor phone field is present and unconditional on every prospect
  row, not gated by status** - this unit's own scope note says so
  explicitly ("including a mock donor phone field for now — Unit 39 will
  apply the real disclosure rule"), matching the exact same treatment
  Unit 27 already gave B3's mock donor phone before Unit 28 wired the
  real Rule 3 serialisation layer. `ProspectStatus` (all 7 values) is
  imported from `lib/serialise/donor-contact.ts`, not redeclared - that
  type already existed for Rule 3's own gate function, and is the single
  source of truth for this exact value list already.
- **Stage labels and close-reason labels both reuse `search.s5.*` keys
  directly, not new `adminPortal.requestDetail.*` copies** - Unit 39's own
  text explicitly requires the former ("keep stage vocabulary identical")
  and explicitly ties the close flow to "Unit 30's close path exactly,"
  the same close-reason vocabulary S5 already uses for the identical
  five-value list - same reasoning already applied to A1's queue (Unit
  37). Urgency labels, by contrast, get their own local
  `adminPortal.requestDetail.urgencyNormal`/`urgencyEmergency` keys - no
  explicit cross-screen instruction exists for urgency, so this follows
  the codebase's *default* per-screen-declares-its-own-labels precedent
  instead, exactly mirroring Unit 37's own same choice for its urgency
  labels.
- **Transfer's mock region list (`Siddapur`, `Yellapur`) is real seeded
  flavour text, not fully invented** - the same two mock adjacent-region
  names Unit 13's own S2 mock already used, reused here rather than a
  fresh pair, matching this codebase's established "swap-in-place"
  precedent for mock data that echoes real/existing values (Units 02's
  own placeholder bank name/address/phone reused verbatim for the
  destination-bank display, same as Units 13/21/25's own precedent for
  mock bank data).
- **A real bug found and fixed during this unit's own live verification,
  not shipped: `takeOwnership()`'s first draft set `ownerName` to the
  *outcome message* string ("You're now the owner of this request."),
  not an actual owner value** - harmless in isolation (the message text
  happened to render in the owner slot too, so a shallow glance wouldn't
  have caught it) but semantically wrong and would have looked broken the
  moment a real owner name was involved. Caught by a Playwright check
  that looked for the literal word "You" in the owner field, not just the
  outcome banner - fixed by adding a dedicated `ownerYou` i18n key ("You")
  and setting `ownerName` to that instead.
- Verified live (temporary Playwright script, removed after; real admin1
  session, same reset-then-restore technique as prior units): the route
  renders with no 404, the dynamic id renders via `useParams()`,
  requester/patient/bank/stage fields all render correctly (stage reusing
  the real `search.s5.*` string, confirming the cross-namespace reuse
  works, not just compiles), all 7 prospect status values render, the
  7-event mock timeline renders in full, and each of the six actions
  (take ownership, call donor, schedule, stand down prospect, transfer
  region, close) was exercised individually and confirmed to produce a
  distinct, correct outcome - including both required-field validations
  (transfer with no region selected, close with no reason selected) each
  correctly blocking with an inline error before any state change, then
  succeeding once a value was provided. The `stood_down` transition was
  confirmed to actually flip that one prospect's own status badge, not
  just show a banner. Kannada toggle renders the new
  `adminPortal.requestDetail.title` key. Existing features (A1 queue, `/`,
  `/bank/login`) all re-confirmed working. `npm run lint` clean. `npm run
  test` 34/34 unchanged. `npm run security-scan`: identical 22 BLOCKERS/18
  WARNINGS to Unit 37's scan, zero new findings (expected - this
  component makes no `createClient()` call, no `lib/db` import of any
  kind, and touches no DB-backed data at all). Zero DB writes this unit -
  baseline reconfirmed unchanged. `admin1`'s `must_reset_password`
  restored to `true` afterward (a real reset was completed during this
  unit's own testing), matching the same permanent-fixture handling as
  every prior admin-portal unit.
- **Unit 39 wired all six A2 actions for real, plus the detail read that
  makes them meaningful, in a new `lib/db/admin-requests.ts` (mirroring
  `bank-prospects.ts`'s own precedent - Unit 28's exact shape for
  "a portal's multi-table actions on `requests`/`prospects`" - not merged
  into `requests.ts` or `prospects.ts` directly) plus a new
  `lib/db/audit-log.ts`'s `writeAuditLog()`, the first real writer to
  `audit_log` anywhere in the codebase.**
- **A genuine, security-relevant judgment call resolved with the project
  owner before writing any authorization code, not guessed either way:
  should a coordinator (district-wide role, no home region) be allowed to
  act on a request in *any* region via A2, the same way Unit 37 gave them
  an empty A1 queue for their own null region?** Confirmed: **yes,
  district-wide access on A2** - `canActOnRegion()` allows the action
  whenever `caller.role === "coordinator"`, independent of region match;
  an `admin` still needs an exact `regionId` match. Reasoning: Unit 44's
  planned escalation ladder ends with "notify the district coordinator,"
  and a coordinator who could never act on a request once escalated to
  them would make that entire named SPEC.md role non-functional. Low
  security risk either way - `role` is read from the server-verified
  session (`getActingAdmin`), never client input, so this only affects
  genuine coordinator accounts (already a small, super-admin-created,
  elevated tier per CLAUDE.md Conventions), never lets a normal `admin`
  spoof district-wide access.
- **`getScopedRequestRow` returns `null` for "doesn't exist" and "exists
  but out of the caller's scope" alike, same opaque-on-purpose shape as
  `bank-prospects.ts`'s `getBankScopedProspect` (Unit 28)** - a crafted
  request id from a region the caller isn't scoped to (or doesn't exist
  at all) is never distinguishable from the caller's own side, matching
  CLAUDE.md rule 3's "never reveal more than the recipient is entitled
  to" spirit extended to object-level authorisation generally, not just
  donor phone data.
- **Donor phone is revealed as a side effect of the detail *read* itself,
  not a separate click-triggered "reveal" action - a deliberate design
  difference from A3's own planned pattern (Unit 40: "guarded behind a
  visible reveal action, not shown by default"), reasoned directly from
  this unit's own constraint text: "'call donor' is a UI affordance
  around the phone number already revealed by this unit's own rule — it
  does not add a new disclosure path."** Since "call donor" is one of the
  six actions this unit's own opening line says to "wire... to real
  writes," but a `tel:` link has no write of its own, the only consistent
  reading is that disclosure happens on load (for any prospect currently
  `accepted`, region-scoped, via `revealDonorContact` - Unit 28's own
  Rule 3 serialisation layer, reused exactly, never a second formatting
  path), and "call donor" is purely UI plumbing around whatever the read
  already returned. Every such reveal writes one `audit_log` row as part
  of that same read - confirmed live to fire again on every subsequent
  reveal of the *same* prospect (no deduplication - PRD.md §9.3's own
  "no exceptions" wording, taken literally), and confirmed to correctly
  *stop* firing the moment that prospect is no longer `accepted` (e.g.
  after being stood down) since `revealDonorContact` itself returns
  `null` at that point - the gate and its audit consequence can never
  drift out of sync since one function owns both.
- **Donor *names* are shown unconditionally on every prospect row,
  unlike phone** - CLAUDE.md rule 3's own text is specifically about
  phone numbers, and Unit 40's own A3 precedent already shows donor names
  freely in region-scoped search results while gating only the phone -
  same reasoning applied here, not a new interpretation.
- **"Schedule" writes `requests.stage = 'scheduled'` directly - a
  straightforward direct write, not new business logic, matching the
  same "deliberate admin/bank action, not derived" pattern
  `cancelRequest`/`confirmDonation` already established for `closed`/
  `resolved`** (`syncRequestStageAfterProspectChange`'s own doc comment,
  Unit 24, explicitly reserves these stages for direct writes). **No
  appointment date/time column was added** - the "time window" gap
  flagged since Units 25/26 ("will need one whenever admin appointment
  scheduling is built, likely Units 38-39") is still open after this
  unit too; this unit's own text ("schedule reuse[s]... not new logic")
  reads as license to do the simple direct stage write, not to invent new
  schema. Flagged again here, explicitly, so a future unit doesn't
  assume this gap was silently closed.
- **"Stand down prospect" reuses `standDownProspect` (Unit 30) and
  `syncRequestStageAfterProspectChange` (Unit 24) exactly, per this
  unit's own "Read before writing" instruction** - verified live that
  standing down one of two live prospects on the same request correctly
  leaves the request in `evaluating_prospects` (the other prospect is
  still `accepted`), not reverted to `finding_prospects`, confirming the
  sync logic's own counting behaviour, not just that the call succeeded.
- **"Close" reuses `cancelRequest` (Unit 30) exactly, adding only an
  `audit_log` write (`'close_request'`, PRD.md §4.6's own literal example
  action value) after a genuine success** - not on an already-closed or
  not-found result. Verified live that closing a request with one live
  `accepted` prospect correctly stood that prospect down too (via
  `cancelRequest`'s own existing stand-down-every-live-prospect
  behaviour) - and, as a direct consequence, that a page reload *after*
  close no longer reveals that (now `stood_down`) prospect's phone or
  writes a further `view_contact` row for it, since `revealDonorContact`
  itself now returns `null`.
- **"Transfer region" looks up the receiving region's primary admin via
  `admin_rota` (`priority = 1`, `is_active = true`, Unit 33's own schema)
  and returns a clear `no_primary_admin` result if none exists, rather
  than crashing or silently leaving the request unowned** - genuinely
  necessary, not defensive-programming excess: **zero `admin_rota` rows
  exist anywhere in this codebase as of this unit** (flagged since Units
  35/37/38), so this is the actual, currently-reachable state for every
  real region today, not a hypothetical edge case. A new
  `listOtherRegions`/`listTransferableRegions` pair (in
  `admin-requests.ts`, not a new `lib/db/regions.ts` file - a single
  small query didn't warrant a new file) feeds the transfer dropdown,
  scoped to the request's own current region rather than a client-
  supplied one, same "re-resolve, don't trust a prior read" pattern as
  every other scoped lookup in this file. **Real seed data has exactly
  one region (Sirsi)**, so the transfer dropdown is correctly empty
  against the live local stack today - same already-documented "Blocking
  on real data" category as adjacent-region search chips (Unit 02).
- Verified live against the real local Supabase stack (temporary
  fixtures - a second region, a temporary `admin_rota` row assigning
  `admin1` as that region's own primary purely to exercise the transfer
  path, six real requests each isolating one action, three real donor
  fixtures, all removed after): take-ownership set real
  `owner_admin_id`/`admin_notified_at`; schedule moved a real
  `finding_prospects` request to `scheduled`; stand-down correctly
  updated one of two live prospects while leaving the request's stage
  unchanged (the other prospect still live); close correctly stood down
  its own live prospect via the reused `cancelRequest` path and
  transitioned to `closed`; transfer correctly moved a real request's
  `region_id` and reassigned `owner_admin_id` to the fixture region's
  real `admin_rota` primary, with the real region dropdown showing the
  fixture region by name. `audit_log` was checked directly via `psql`,
  not just trusted from the UI: exactly one `view_contact` row per
  distinct reveal (including a genuine second row for a prospect revealed
  twice across two page loads, and correctly zero further rows once a
  prospect left `accepted` status), one `transfer_region` row with the
  correct from/to/new-owner metadata, one `close_request` row with the
  correct reason. **Region isolation confirmed with a real session, not
  just reasoned about:** `admin1` (home region Sirsi) got the generic
  not-found message for a request in the fixture region, even though
  `admin1` was *also* that region's `admin_rota` primary (proving the
  scope check reads `profiles.region_id`, never `admin_rota`, for the
  *caller's own* scoping) - and a real `coordinator1` session
  successfully loaded that same fixture-region request, confirming the
  district-wide override actually works, not just compiles. Existing
  features unaffected. `npm run lint` clean. `npm run test` 34/34
  unchanged. `npm run security-scan`: 24 BLOCKERS (up from 22) + 20
  WARNINGS (up from 18) - all 4 new findings checked by hand, not
  reflexively dismissed: two are the already-established type-only-import
  and public-bank-phone categories; one
  (`admin-requests.ts:468`'s `profiles.phone` read) is the identical
  shape as `bank-prospects.ts:69`'s own already-accepted finding,
  re-verified by hand that the raw value never escapes `revealDonorContact`'s
  gate; one is a genuinely new false-positive shape worth cataloguing -
  the scanner's rule-2 regex (`id\s*:\s*(?:body|req|request|...)\.`,
  confirmed by reading `scripts/security-scan.py` directly rather than
  guessing) matches `id: request.id` purely because this function's own
  local variable is named `request` (an already-fetched,
  authorisation-checked DB row), not because of any real client-supplied
  primary key - `getAdminRequestDetail`/`getScopedRequestRow` never
  accept a request id for a write, only for a `.eq()` lookup already
  gated by region/coordinator scoping. All fixtures (region, `admin_rota`
  row, six requests, three donors, five `audit_log` rows) removed
  afterward; `admin1`/`coordinator1`'s `must_reset_password` restored to
  `true` (permanent fixtures, same handling as every prior admin-portal
  unit); every state table reconfirmed at its exact baseline (`regions`
  at 1, `profiles` at 6, every other table at 0).
- **Unit 40 (A3 donor lookup, hardcoded) implements a genuinely different
  reveal interaction than A2's own real version, and this is expected,
  not an inconsistency to fix.** This unit's own task text is explicit
  and literal: phone "guarded behind a visible 'reveal contact' action
  (not shown by default)" - a real click-to-reveal per row, unlike A2
  (Unit 39's real wiring), which reveals on page load for an already
  region/status-gated prospect with no separate click at all. The
  "Read before writing: Unit 38's A2 screen - same... interaction
  pattern" instruction was written referencing Unit 38's *mock* A2
  (which showed its own mock phone unconditionally, no reveal click
  either), before Unit 39 resolved A2's real disclosure mechanism the way
  it did - by the time this unit was actually built, the two screens'
  real reveal mechanisms had already diverged for good, unit-specific
  reasons (A2: "call donor is a UI affordance around the phone number
  already revealed by this unit's own rule"; A3: an explicit, visible
  per-row action makes the audit trail's existence legible to the user,
  this unit's own stated reason). Followed this unit's own literal,
  unambiguous instruction rather than reconciling it against A2's
  now-real behaviour.
- **Availability status (available / paused / in cooldown / not
  available) is a genuine, clock-relative computation against real
  `Date` objects, not static mock strings** - same "compute it for real
  even in a mock-only unit" precedent already established by D2's own
  cooldown state (Unit 23) and S2's open/closed badge (Unit 13). 7 mock
  rows deliberately span all four states plus two blood groups sharing a
  group (A+) to exercise the blood-group filter meaningfully.
- Verified live (temporary Playwright script, removed after; real admin1
  session, same reset-then-restore technique as every prior admin-portal
  unit): all 7 mock donors render, every phone is hidden by default with
  its own reveal button, clicking one row's reveal shows only that row's
  `tel:` link while every other row stays hidden (confirming per-row
  state, not a single global toggle), the blood-group filter narrows
  correctly, all four availability-status strings render (including the
  two with an interpolated real date), the "available only" filter
  correctly excludes paused/cooldown/unavailable rows, and a combined
  filter with zero matches correctly shows the empty-state message
  rather than an empty list with no explanation. Kannada toggle renders
  the new `adminPortal.donorLookup.title` key. Existing features (A1
  queue, `/`, `/bank/login`) unaffected. `npm run lint` clean. `npm run
  test` 34/34 unchanged. `npm run security-scan`: identical 24
  BLOCKERS/20 WARNINGS to Unit 39's scan, zero new findings (expected -
  this component makes no `createClient()` call and touches no `lib/db`
  import of any kind). Zero DB writes this unit - baseline reconfirmed
  unchanged; `admin1`'s `must_reset_password` restored to `true`
  afterward (a real reset was completed during this unit's own login),
  matching every prior admin-portal unit's handling.
- **Unit 41 surfaced a genuine, security-relevant contradiction between
  CLAUDE.md rule 3's literal wording and PRD.md §9.1 A3's own text -
  resolved with the project owner before writing any disclosure code,
  not guessed either direction (see "PRD corrections needed" item 5
  above).** Rule 3 as originally worded named exactly two release
  channels ("an admin ... with an `accepted` prospect," "the bank that
  donor is scheduled at") - both tied to a specific prospect/request
  relationship. A3 has no such relationship at all; it's a general
  regional search. A literal reading would make A3's own reveal feature
  permanently non-functional for any donor not currently matched to
  something, which can't be what a "search regional donors... contact
  reveal audit-logged on every view" screen is for. **Resolved: a third,
  real release channel** - the project owner's own specification, tighter
  than a bare "region + role" check: the caller must be an admin/
  coordinator scoped to the donor's own region, a specific *open* request
  must genuinely exist in that same region (the operational
  justification - not necessarily blood-group-matched to this donor, just
  evidence the region has a live need), and a non-empty reason is
  required - every reveal logged with donor id, admin id, request id, and
  the reason, and rate-limited per admin per rolling hour. **CLAUDE.md
  rule 3 itself was updated** (not just the code) to name this third
  channel explicitly, matching the M1 review's own precedent for amending
  CLAUDE.md when a real gap is found (Unit 06's Rule 1 clarification).
- **`revealDonorContact` (`lib/serialise/donor-contact.ts`) gained a third
  `caller` value, `"admin_region_lookup"`, rather than a second
  serialisation function** - CLAUDE.md rule 3's own "never re-implement
  the check per endpoint" holds: this is still the one function every
  disclosure path calls. The existing `"admin"` caller value was renamed
  to `"admin_prospect"` (updating Unit 39's own `admin-requests.ts` call
  site, its only caller) so the two admin channels read as clearly
  distinct in the type itself, not just in a comment. For
  `admin_region_lookup`, `prospectStatus` is `null` (there is no
  prospect) and the function trusts the caller completely - by design,
  the same "upstream scoping, this function is the final gate" division
  of labour the other two channels already use (`getBankScopedProspect`/
  `getScopedRequestRow` already verify scope *before* calling this
  function for their own channels); here, `lib/db/admin-donors.ts`'s
  `revealDonorContactForLookup` is what verifies region match, the open
  request, the reason, and the rate limit, all *before* this function is
  ever called.
- **A new `app_settings` row, `admin.donor_reveal_rate_limit_per_hour`
  (default 20, new migration `20260803200000_admin_donor_lookup_rate_
  limit.sql`) - a timing/threshold parameter per CLAUDE.md's own
  "Timing parameters" section, never hardcoded.** The rate limit is
  counted directly from the admin's own `audit_log` `view_contact` rows
  in the last rolling hour - no new infrastructure (CLAUDE.md rule 9),
  and deliberately the same data the audit trail itself already records:
  every successful reveal both satisfies the audit requirement and feeds
  the very count that limits the next one, so the two can never drift out
  of sync the way two parallel mechanisms could.
- **Search results have no phone field in their type at all, not merely
  "no phone shown by default"** - `AdminDonorSearchRow` (`lib/db/
  admin-donors.ts`) never carries a phone under any circumstance,
  confirmed by the project owner's own explicit requirement. Reveal is
  always a separate, individually-called server action
  (`revealDonorContactForLookup`) per donor, never bundled into the list
  response - verified live that the raw network/DOM content before any
  reveal contains no phone-shaped string anywhere on the page.
- **A3 stays region-scoped like A1 (Unit 37), not district-wide like A2
  (Unit 39) - a coordinator gets the same explicit "no home region"
  message as A1, confirmed as a genuinely separate question from A2's own
  exception, not assumed to inherit it.** A2's district-wide exception was
  justified specifically by Unit 44's planned "escalate to district
  coordinator, who must then be able to act on that one specific request"
  workflow - a real functional necessity for an act-on-a-known-item
  screen. A3 is a browse/search surface like A1, with no equivalent
  "the coordinator was directed here for a specific reason" - PRD.md
  §9.3's own "admins are region-scoped" rule applies at full force here.
- **Real pagination (`DONORS_PER_PAGE = 20`, `.range()`-based), not a
  generous cap** - this unit's own constraint explicitly distinguishes
  itself from the "cap = pagination" precedent used everywhere else in
  this codebase so far ("this is explicitly the regional donor list —
  paginate it"), the first unit to actually need real forward-paging UI
  rather than a sufficiently generous `.limit()`. `AdminDonorLookup.tsx`
  gained real Previous/Next controls backed by `hasMore` from the
  server's own `count` - verified live with 22 real fixture donors in one
  region (20 on page 1, exactly the remaining 2 on page 2, Previous
  correctly returns to page 1).
- Verified live against the real local Supabase stack (temporary fixtures
  - 22 real donors in Sirsi spanning all 8 blood groups for a genuine
  pagination test, 1 donor in a separate fixture region for isolation,
  1 real open request, 20 pre-seeded `audit_log` rows to exercise the
  rate limit without 20 manual reveal clicks - all removed after): real
  pagination confirmed (20 + 2 across two pages, region isolation
  confirmed by the total matching only the Sirsi fixtures, the foreign
  donor never appearing on either page), the blood-group filter narrows
  correctly against real data, no phone number appears anywhere before
  any reveal, the reveal panel's request picker and reason field both
  render, submitting with no reason is rejected server-side, submitting
  at the pre-seeded rate limit is correctly rejected as `rate_limited`
  (confirmed against 20 real `audit_log` rows, not a mocked counter) -
  and, after clearing those fixture rows, a genuinely fresh reveal with a
  real open request and a real reason succeeds and shows the real `tel:`
  link, with the resulting `audit_log` row checked directly via `psql`
  and confirmed to carry the exact `requestId`/`reason` metadata. The
  coordinator's explicit no-region message was reconfirmed on this screen
  too, independently from A1's own instance of the same message. `npm run
  lint` clean. `npm run test` 34/34 unchanged. `npm run security-scan`:
  25 BLOCKERS (up from 24) + 21 WARNINGS (up from 20) - both new findings
  checked by hand: the already-established type-only-import category, and
  a `profiles.phone` read in `admin-donors.ts` verified, not assumed, to
  be the identical "raw value only ever feeds `revealDonorContact`'s
  gate, never returned directly" shape as the two already-accepted
  instances of this category. All fixtures removed afterward;
  `admin1`/`coordinator1`'s `must_reset_password` restored to `true`;
  every state table reconfirmed at its exact baseline (`regions` at 1,
  `profiles` at 6, every other table at 0).
- **Unit 42's policy-notes field reuses B5's exact shape (plain
  `<textarea>`, same label/save pattern) - address/phone/opening hours
  stay B5-only**, per this unit's own "Read before writing" instruction
  and PRD.md §9.1 A4's own narrower field list (verify, suspend, policy
  notes only - not the bank's full settings surface).
- **Both verify and suspend are implemented as real bidirectional
  toggles (Verify/Revoke verification, Suspend/Reactivate), not one-way
  actions** - a genuine, reasoned completion of PRD's literal two-action
  wording ("Verify, suspend"): an admin tool that could suspend a bank but
  never reactivate it, or verify one but never revoke a mistaken
  verification, wouldn't be a usable admin tool. Not scope creep - both
  directions of the same two existing booleans (`is_verified`/
  `is_active`), not a new concept.
- 3 mock banks deliberately span all three non-default combinations
  (verified+active, unverified+active, verified+suspended) so every
  action - verify, suspend, and their reverses - has a real row to
  exercise, not just the default happy-path bank. Bank 1 reuses Unit 02's
  real seeded name/address/phone (same "swap-in-place" precedent as
  Units 13/21/25/38's own mock data).
- Verified live (temporary Playwright script, removed after; real admin1
  session, same reset-then-restore technique as every prior admin-portal
  unit): all 3 mock banks render with their correct initial verified/
  active states, Verify/Reactivate/Suspend each flip their target bank's
  badge correctly, policy-notes edit + save shows the confirmation
  message, Kannada toggle renders the new `adminPortal.bankManagement.
  title` key. Existing features (A1, A3, `/`, `/bank/login`) unaffected.
  `npm run lint` clean. `npm run test` 34/34 unchanged. `npm run
  security-scan`: identical 25 BLOCKERS/21 WARNINGS to Unit 41's scan,
  zero new findings (expected - this component makes no `createClient()`
  call and touches no `lib/db` import of any kind). Zero DB writes this
  unit - baseline reconfirmed unchanged; `admin1`'s `must_reset_password`
  restored to `true` afterward (a real reset was completed during this
  unit's own login).
- **Unit 43 found a genuine, real gap while reading before writing, not
  invented: nothing anywhere in the codebase checked `is_active` (or
  `is_verified`) on the bank-portal side before this unit.** Grepped
  `lib/db/bank-portal.ts`, `proxy.ts`, `BankLoginFlow.tsx` and every
  bank-portal action file - a suspended bank's own staff could fully use
  B1-B5 with zero restriction before this unit. This unit's own
  instruction ("confirm both, do not assume one implies the other") is
  exactly what surfaced it - Unit 14's public search already correctly
  filtered on both flags (confirmed, unchanged), but the portal-access
  side had nothing at all.
- **A genuine, resolved-not-guessed interpretive question: does
  `is_verified = false` block portal access too, or only public search?
  PRD.md §8.2's own rule text is precise and answers this directly:
  "`is_verified = false` accounts cannot post stock publicly" - about
  public posting only, no portal-access consequence stated.** Unit 43's
  own paraphrase ("Suspending (`is_verified = false` or `is_active =
  false`)... must immediately affect... bank-portal access") reads more
  broadly than PRD's own precise wording - resolved in favour of PRD's
  more specific rule (CLAUDE.md: "PRD.md is authoritative") rather than
  the paraphrase: only `is_active = false` blocks the portal
  (`getActingBankStaff`, `lib/db/bank-portal.ts`); `is_verified = false`
  continues to block public search only (Unit 14, unchanged). Not treated
  as a stop-and-ask case the way Unit 41's phone-disclosure channel was -
  PRD's text here is specific enough to resolve confidently, and the
  alternative (blocking portal access for an unverified bank) would
  create a real chicken-and-egg problem: a newly onboarded bank could
  never set up its own stock/settings for an admin to review and verify
  in the first place. Documented here rather than silently picked either
  way.
- **The suspension gate lives in `getActingBankStaff` itself (`lib/db/
  bank-portal.ts`), not a UI-only check** - every single bank-portal
  action already calls this function first, so extending it here means a
  crafted request straight at a server action is rejected exactly the
  same as normal navigation, not just the rendered page. A new
  `BankSuspendedError` (distinct from the existing generic "no verified
  session"/"no associated bank" errors) lets `app/bank/(portal)/
  layout.tsx` show a specific "Account suspended" message via a
  try/catch, rather than every B1-B5 page 500ing on a raw thrown error -
  still logged in, still able to sign out, just blocked from the
  portal's own content, same spirit as the forced-password-reset gate.
- **`lib/db/admin-banks.ts` added, mirroring `admin-requests.ts`/
  `admin-donors.ts`'s own region-scoping pattern exactly** - a coordinator
  (no home region) gets the same explicit "no regional bank list" message
  as A1/A3, not A2's district-wide exception (this is a browse/manage-
  list screen, not an act-on-a-specific-escalated-item screen - same
  reasoning already applied twice, third time now, not re-derived from
  scratch).
- Verified live against the real local Supabase stack (a temporary
  fixture bank + a temporary real bank_staff Auth account in Sirsi, a
  second fixture bank in a different region for isolation, all removed
  after - deliberately never touching the real seeded `PLACEHOLDER Blood
  Bank`/`bankstaff1`/`bankstaff2` fixtures that other units' own test
  accounts depend on): the fixture bank_staff could access the portal
  normally while active+verified; suspending via A4 immediately blocked
  real portal access (a real login attempt showed "Account suspended",
  not the stock dashboard) *and* immediately removed the bank from a
  real public search - both effects checked directly and independently,
  per this unit's own explicit instruction, not assumed from one
  succeeding; reactivating restored both. Separately, revoking
  verification (`is_verified = false`) was confirmed to leave portal
  access intact while still correctly excluding the bank from public
  search - proving the two flags really do have the two different
  consequences this unit's own README entry above argues for, not just
  asserted. A4's own region isolation was confirmed with a second fixture
  bank in a different region, never appearing in `admin1`'s own list.
  Coordinator's explicit no-region message reconfirmed on this screen
  too. Existing features (`/`, `/donor/register`) unaffected. `npm run
  lint` clean. `npm run test` 34/34 unchanged. `npm run security-scan`:
  26 BLOCKERS (up from 25) + 23 WARNINGS (up from 21) - checked by hand,
  not just counted: one genuinely new blocker (the established type-
  only-import category), one genuinely new warning
  (`admin-banks.ts`'s own `blood_banks.phone` read, the bank's own public
  number, same already-documented category), one apparent "new" warning
  that was actually Unit 12's own long-standing `getBankSettings` finding
  simply shifted to a new line number by this unit's own edits earlier in
  the same file (net zero, not a new risk), and one warning from a
  temporary setup script (gone with the file). All fixtures removed
  afterward, including `bank_stock` rows the temporary fixture bank
  auto-provisioned on its own first real portal load (Unit 12's own
  established auto-provisioning behaviour) and 5 real `search_logs` rows
  this unit's own public-search checks wrote (the standing "search_logs
  gets missed" gotcha, caught this time, not missed); `admin1`/
  `coordinator1`'s `must_reset_password` restored to `true`; every state
  table reconfirmed at its exact baseline, including the real
  `PLACEHOLDER Blood Bank`'s own permanent 8-row `bank_stock` state
  (pre-existing since Unit 12, correctly left untouched, not mistaken for
  fixture debris).
- **Unit 44 hit a real schema blocker before writing any escalation
  logic, resolved with the project owner rather than guessed: Unit 18's
  `sendPush`/`recordNotification` writes `notifications.donor_id`, which
  had a real FK constraint to `donors` specifically - admin/coordinator
  profiles have no `donors` row, so calling it for an admin as this
  unit's own text literally asks ("Unit 18's sendPush, reused for admin
  notifications") would throw a foreign-key violation, not just silently
  fail to deliver.** Two options were on the table (a new admin-only push
  helper bypassing `notifications` entirely, or widening the shared
  table) - the project owner chose the latter, explicitly to avoid two
  parallel notification code paths that could drift apart (retry/
  rate-limit logic living in only one of them, say), with four concrete
  requirements, all implemented exactly:
  1. **`notifications.donor_id` renamed to `recipient_id`, FK repointed
     to `profiles`** (new migration `20260803210000_notifications_multi_
     recipient.sql` - Unit 18's own migration is already merged and
     stays untouched). Safe for every existing donor notification since
     `donors.id = profiles.id` always (Unit 02's 1:1 pattern). The index
     was renamed too (`notifications_recipient_id_idx`) - the project
     owner's own reasoning ("a column called donor_id holding admin IDs
     is the kind of naming lie that produces a wrong query in six
     months") applies equally to a stale index name.
  2. **New `recipient_role` column** (`donor` | `admin` | `coordinator`,
     `not null`, no default after backfill) - denormalised rather than
     re-derived via a join to `profiles` on every read, per the project
     owner's own stated reason: Unit 55's metrics need to separate donor
     response rates from admin response times cheaply.
  3. **Every existing reader/writer of the old column found and
     updated, not assumed** - grepped the whole codebase first (found
     exactly one real call site, `createRequest`'s donor-invite loop in
     `lib/db/requests.ts`) before touching anything; `lib/db/
     notifications.ts`'s `recordNotification` and `lib/push/send.ts`'s
     `sendPush` (now taking an explicit `recipientRole` parameter,
     passed by the caller rather than looked up, since the caller already
     knows it and a lookup would be a redundant query) both updated;
     `npm run lint`'s clean pass across the whole refactor is itself
     confirmation no call site was missed (a mismatched signature would
     have failed to typecheck).
  4. **`requests.admin_notified_at`/`escalated_at` deliberately
     untouched** - the project owner's own explicit instruction: those
     record *when this request's own state changed* (who's currently
     responsible for it and since when); `notifications` records *every
     individual delivery attempt*. Neither replaces the other; both are
     genuinely needed, not redundant.
  PRD.md §4.6's own literal schema still says `donor_id fk -> donors` -
  flagged as a new "PRD corrections needed" item (this section's own
  running list) rather than silently left contradicting what's actually
  built.
- **A second, smaller schema addition this same unit: `requests.
  coordinator_notified_at`** (own migration,
  `20260803220000_requests_coordinator_notified.sql`) - PRD.md §9.2's
  "Secondary inaction -> notify district coordinator" trigger needs its
  own idempotency marker, distinct from `escalated_at` (which already
  means "when was the secondary admin notified," the trigger condition
  *and* guard for the previous rung). Without a separate marker, this
  tier would re-notify every coordinator on every cron run once past
  threshold, since `escalated_at` itself never changes again after the
  first escalation. Same "add a narrow timestamp column when a real
  state-tracking need arises" precedent as `zero_match_at`/
  `prospect_cancelled_at`/`idle_prompted_at`.
- **`lib/db/admin-rota.ts` (new) extracts `getRotaAdmin`/
  `getDistrictCoordinatorIds` out of what used to be inline in Unit 39's
  `transferRequestToRegion`** - this unit needs the identical
  primary/secondary-admin lookup for its own triggers, and duplicating
  that query a second time would violate this codebase's "shared logic
  gets exactly one implementation" rule; `transferRequestToRegion` itself
  was refactored to call the shared function too, not left with its own
  copy alongside the new one. District coordinators are resolved by
  `role = 'coordinator'` directly (SPEC.md §3 item 1's role-wide
  "fallback" framing, no ordering among multiple coordinators since
  nothing in PRD/SPEC ranks them) - every coordinator gets notified, not
  just one.
- **`lib/db/escalation.ts` (new) implements PRD.md §9.2 rows 1-5** (rows
  6/7, idle-prompt and auto-expiry, already shipped in Unit 31 - this
  unit's own Verify checklist re-confirms those still work, not just the
  five new ones). All three "notify primary" triggers (no-prospect,
  prospect-appeared, zero-match) share one idempotency guard,
  `admin_notified_at IS NULL` - once *any* of the three fires for a
  request, the other two become no-ops for it, since a second ping about
  the same request for a different one of these three reasons serves no
  purpose. This is the same column Unit 39's take-ownership already
  sets, so an admin who proactively claims a request before any
  automated trigger fires is correctly treated as "already handled" here
  too, with zero special-casing needed - `admin_notified_at`'s real
  meaning is "some admin already knows about this," regardless of how
  that came to be true.
- **"No prospect" (row 1) uses two separate simple queries (one per
  urgency tier), not one `.or()` filter string** - this codebase already
  has a standing precedent against building `.or()` filters by hand
  (`lib/db/pincodes.ts`'s `resolveLocation`, Unit 14: real fragility, not
  just style, the moment typed input contains a character `.or()`'s own
  filter DSL treats specially) - two plain `.lt()` reads sidestep the
  question entirely, same reasoning applied to a cron job's own
  hardcoded, non-user-supplied values (less risky here, but the same
  simpler pattern was preferred anyway for consistency).
- **"Prospect appeared" (row 2) is measured by polling
  `stage = 'evaluating_prospects'`, not a real event/webhook** - there is
  no event mechanism anywhere in this codebase (CLAUDE.md rule 9), and
  `syncRequestStageAfterProspectChange` (Unit 24) is the only writer of
  that transition, so it's a reliable proxy for "a prospect just
  accepted." "Immediately" (PRD's own word) is approximated by this job's
  cron frequency (every minute), not by anything in the function itself.
- **All five new cron jobs run every minute, unlike Unit 31's 15-minute
  polling** - Unit 31's own thresholds were hours (12h/48h); these are
  minutes (20/15/15, and 0 for the emergency no-prospect case), so the
  polling interval needed to be meaningfully smaller than the threshold
  itself, not just reused at the same granularity. Reuses Unit 31's own
  `cron_site_url`/`cron_secret` Vault entries directly - calling five
  more routes on the same app with the same shared secret needs no new
  secret storage.
- **A1's "Unowned request with prospects raises an alert" (PRD.md §9.3,
  this unit's own explicit verify item) is a client-side derivation of
  data `getAdminQueue` (Unit 37) already fetches** (`ownerName === null
  && prospectsCount > 0`) - no new query, genuinely distinct from the
  existing escalation-threshold flag (which is age/stage-based and only
  ever applies to `finding_prospects`; this one applies to any open stage
  the instant a real prospect exists with nobody yet responsible for it).
- **Verified live with real, automatic `pg_cron` execution, not just
  manual route calls** - a real, unprompted discovery during this unit's
  own verification: several fixture requests were already correctly
  processed (`admin_notified_at`/`escalated_at`/`coordinator_notified_at`
  all set, real `notifications` rows written with correct
  `recipient_id`/`recipient_role`) by pg_cron's own automatic
  once-a-minute execution *before* any manual `curl` call was made -
  confirmed directly via `cron.job_run_details` showing real
  `succeeded` runs at the expected one-minute cadence. All eight real
  fixture requests (one per trigger, plus a normal-urgency control fixed
  at 5 minutes old - deliberately under the 20-minute threshold - and an
  unowned-with-a-real-accepted-prospect fixture for the A1 flag)
  resolved exactly as expected: the control correctly did *not* fire;
  every real trigger fired exactly once, attributed to the correct real
  recipient (`admin1` as region-configured primary, a lightweight
  fixture profile as secondary, the real `coordinator1` for the
  secondary-inaction tier); `delivered_at` correctly stayed `null` for
  all of them (no admin/coordinator has ever registered a push
  subscription - no unit builds that UI yet, a real, known,
  already-flagged gap, not a bug in this unit). **The literal "adjust the
  setting and re-test" verify requirement was satisfied explicitly, not
  just implied by the control case:** `escalation.no_prospect_normal_
  minutes` was temporarily lowered from 20 to 2, the control fixture
  (already sitting at ~7 minutes old, previously correctly unfired)
  was re-polled and *did* fire this time, then the setting was restored.
  A1's new "Needs an owner" flag was confirmed rendering for the real
  fixture with a live accepted prospect and no owner. The pre-existing
  donor-invite path (`createRequest` -> `sendPush("donor", ...)`) was
  re-verified with a genuine, real S4 submission through the actual UI
  (OTP, form, submit) rather than just trusted from the type-safe
  refactor - the resulting `notifications` row correctly carried
  `recipient_role = 'donor'`. Unit 31's own two jobs (`idle-prompt`,
  `expire-requests`) and the monthly `reset-notif-counts` job were all
  re-run and confirmed still working, unaffected by this unit's
  `notifications` schema change (neither job touches that table).
  `npm run lint` clean throughout every stage of this refactor. `npm run
  test` 34/34 unchanged. `npm run security-scan`: 26 BLOCKERS (unchanged
  from Unit 43) + 22 WARNINGS (down from 23, purely Unit 43's own
  temporary setup script disappearing) - genuinely **zero new findings
  of any kind** from this unit's substantial new code, confirmed by
  grepping the scan output for every new/changed file by name. All
  fixtures (eight requests, their prospects/notifications, two
  `admin_rota` rows, three fixture profiles/donors) removed afterward;
  `admin1`/`coordinator1`'s `must_reset_password` restored to `true`;
  `escalation.no_prospect_normal_minutes` restored to `20`; every state
  table reconfirmed at its exact baseline.
- **Unit 46 shipped (2026-08-03), starting M5.** Schema-only migration
  adding `reports` exactly per PRD.md §4.6, `20260803233000_reports.sql`.
  `reporter_id`/`subject_id` given `not null` beyond PRD's own bare marker -
  same "a report naming neither party is meaningless" reasoning already
  applied to every other bare FK in this schema (`admin_rota`/`audit_log`,
  Unit 33). `status` deliberately stays plain `text default 'open'` with
  **no** check constraint, unlike `stage`/`close_reason`/`role`/
  `blood_group` - neither PRD nor SPEC gives an exhaustive value list for it
  anywhere (only the one default), matching the same open-ended treatment
  already given to `audit_log.action`. RLS enabled in the same migration
  (Unit 06 precedent); `service_role` grants automatic via Unit 04's
  default-privilege rule, confirmed directly against
  `information_schema.role_table_grants` - zero grants to
  `anon`/`authenticated`. **Confirmed, not assumed: `profiles.is_blocked`
  already exists** (Unit 02's original migration) - Unit 48 will not need a
  new column for its own block-user action, only this table plus that
  existing flag. No PRD screen defines a report-submission entry point
  (SPEC.md's own "block-and-report button" names no screen id) - already
  tracked in this file's own "Open decisions" item 2, not re-flagged as a
  new gap. Verified live against the real DB: a valid insert (real
  `reporter_id`/`subject_id`, both real seeded profiles) correctly defaulted
  `status='open'` and a real `created_at`; a bogus `reporter_id` was
  correctly rejected by the FK constraint (`23503`), not silently accepted.
  `npm run lint` clean, `npm run test` 34/34 unchanged, `npm run
  security-scan` identical 26 BLOCKERS/22 WARNINGS to Unit 45's own count,
  zero new findings (expected - this unit touches no `lib/db` file and no
  component). Fixture row removed afterward; every state table (including
  the new `reports`) reconfirmed at its exact baseline.
- **Unit 47 shipped (2026-08-03).** A5 moderation UI (hardcoded mock),
  replacing Unit 36's stub placeholder at `/admin/reports`. `AdminModeration`
  stays a single Client Component owning its own mock data, same "mock-only
  dynamic screen" precedent as every prior hardcoded admin unit (36/38/40/
  42) - no server props threaded in yet, that's Unit 48's job. **PRD's
  one-line description ("Open reports, block user, review flagged
  accounts") was read as one screen with a status filter, not three
  separate concepts** - "review flagged accounts" is served by an
  All/Open-only status filter (same UX role as A1's stage filter), not a
  second screen section; block-user targets the report's *subject* only,
  never the reporter, per SPEC.md's own S1 framing ("admin watches for one
  donor recurring... report-and-suspend"). Region scoping is deliberately
  out of this unit's own scope (deferred to Unit 48, same treatment every
  prior hardcoded-mock unit gave its own real-data question) - no
  `noRegionMessage` key added yet. 4 mock reports span open/blocked status,
  three different subject roles (donor/bank_staff/searcher), and a
  selling/buying-blood-flavoured reason among them (§11.3's own required
  reason category, previewed here even though Unit 48 owns the real reason
  list). `reason`/`details`/names are free-text mock content, not run
  through i18n - same treatment as `patientName`/donor `fullName` elsewhere,
  CLAUDE.md rule 8 governs this app's own interface copy, not simulated
  user-submitted text. New `adminPortal.moderation.*` i18n namespace (22
  keys), reusing this codebase's established per-screen role-label pattern
  rather than a shared cross-namespace role dictionary (no existing
  instruction to keep this vocabulary identical to the shell header's own
  `roleAdmin`/`roleCoordinator` keys, unlike the stage-label reuse Units
  37/39 were explicitly told to do). Verified live (real `admin1` session,
  reset-then-restore technique): the real title/mock rows/status badges all
  render, the status filter correctly narrows to open-only, blocking a
  report updates that one row's badge and hides its own block button
  without affecting other rows, the Kannada toggle renders the new title
  key, and A1 still loads unaffected. `npm run lint` clean, `npm run test`
  34/34 unchanged, `npm run security-scan` identical 26 BLOCKERS/22
  WARNINGS to Unit 46's own count, zero new findings (expected - pure mock
  component, no `lib/db` import, no `createClient()` call). Zero DB writes
  this unit - baseline reconfirmed unchanged; `admin1`'s
  `must_reset_password` restored to `true` afterward.
- **Unit 48 shipped (2026-08-03) — a genuine, security-relevant judgment
  call resolved with the project owner before writing any authorization
  code, not guessed either way: should A5 be region-scoped like A1/A3/A4,
  or district-wide?** `reports` (Unit 46) has no `region_id` column at
  all - unlike every other admin list screen, there's no natural column to
  scope by, and the report's two parties (reporter/subject) can be in
  different regions or have none (a bank_staff/admin subject's own
  region/bank concept doesn't map cleanly onto "the report's region"
  either way). **Confirmed: district-wide for every admin/coordinator** -
  matches SPEC.md's own S1 framing ("admin watches for one donor recurring
  across unrelated requests," a cross-region concern) and avoids an
  arbitrary reporter-vs-subject-region tiebreak the PRD text never asks
  for. `lib/db/reports.ts`'s `getReportsForModeration`/`blockReportedUser`
  take no region parameter at all - the first admin-portal read/write in
  this codebase with zero region scoping, a deliberate exception (not an
  oversight) with its own reasoning documented in that file's doc comment.
- **`profiles.is_blocked` already existed (Unit 02) and Unit 17's matching
  engine already excluded blocked donors (`lib/matching/eligibility.ts`'s
  `isDonorEligible`, already unit-tested since that unit) - this unit's own
  "confirm blocked donors are actually excluded, don't just trust the flag
  exists" instruction was satisfied by a real live test, not by reading the
  code and assuming it still held.** Verified live: a real fixture donor
  was genuinely matched and invited by a first real S4 request (a real
  `prospects` row, confirmed via `psql`); blocked via a real A5 action;
  a second, identical real S4 request afterward correctly set
  `zero_match_at` with **zero** `prospects` rows for that donor - the
  exclusion is real, not asserted.
- **The harder half of this unit's own task - "session invalidated or
  rejected on next request" - needed a genuine architectural choice, not
  just a flag write: a JWT-claim approach (mirroring `profile_role`/
  `must_reset_password`) was rejected because it inherits the same
  documented staleness window (bounded by `jwt_expiry`, not instant),
  which contradicts this task's own "next request" wording.** Instead,
  `lib/db/profiles.ts` gained a shared `assertNotBlocked(profileId)` +
  `BlockedUserError`, a genuine per-request DB check called from all three
  portals' own `getActingX()` resolvers (`getActingDonor`/
  `getActingBankStaff`/`getActingAdmin`) - one shared implementation, not
  three copies, same "shared logic gets exactly one implementation" rule
  already applied to `revealDonorContact`/`standDownProspect`. Each
  portal's own layout catches the new `BlockedUserError` and shows a
  friendly "Account blocked" message (new `blockedTitle`/`blockedMessage`
  keys in all three portal i18n namespaces) - `app/bank/(portal)/layout.tsx`
  extends its existing `BankSuspendedError` catch with a second branch
  (distinct message, not conflated with "suspended"); `app/admin/(portal)/
  layout.tsx` gained a try/catch it didn't have before; `app/donor/
  (portal)/layout.tsx` now calls `getActingDonor()` defensively (it never
  needed donor-scoped data for its own header before) purely to catch this
  error at the one shared layout, not per-page. Verified live for all
  three portals, not just donor: a permanent bank_staff fixture
  (`bankstaff1`, unblocked afterward) correctly showed the blocked message
  distinct from the suspended one; a temporary throwaway admin account,
  created pre-blocked and deleted after, correctly showed the blocked
  message instead of the real queue.
- **Block-user targets the report's *subject* only, never the reporter**
  (SPEC.md's own S1 framing: the admin acts on the person being watched),
  and is audited the same way a contact reveal is (`writeAuditLog`,
  Unit 39's own precedent) - `entity_type: "profile"`, since the subject
  could be any role, not only a donor. `reports.status` stays the plain,
  unconstrained text column Unit 46 designed - this unit establishes
  `'blocked'` as a real value in practice (written on a successful block),
  without retroactively adding a check constraint.
- **PRD.md §11.3's "the report mechanism must accept [selling/buying
  blood] as a reason" is already satisfied by Unit 46's own design, not by
  new code** - `reports.reason` has no check constraint at all, so it was
  already structurally incapable of rejecting any reason text, including
  this one. No new canonical reason-list file was added (would have
  implied a semi-fixed vocabulary the schema deliberately doesn't have) -
  confirmed live instead, with a real fixture report whose `reason` was
  literally "Suspected of asking for payment (selling/buying blood)",
  reaching real A5 display with no issue. This unit's own explicit scope
  limit ("does not build the report submission entry point") ruled out
  building real reason-selection UI to attach a canonical list to anyway.
- Verified live end-to-end (temporary fixtures - a flipped-then-reverted
  donor role/row on test number `...01`, two real reports against real
  seeded profiles, one temporary pre-blocked admin account, all removed/
  reverted after): A5 rendered both real reports with correct reporter/
  subject names and role labels; the status filter narrowed to open-only
  and correctly hid both now-blocked reports; blocking each wrote exactly
  one `audit_log` `block_user` row with correct actor/entity/metadata,
  checked directly via `psql`. `npm run lint` clean. `npm run test` 34/34
  unchanged. `npm run security-scan`: 27 BLOCKERS (up from 26) + 22
  WARNINGS (unchanged) - the one new blocker checked by hand and confirmed
  the already-established type-only-import false positive
  (`AdminModeration.tsx`'s `import type { AdminReportRow, ReportRole }`);
  the two `[rule 3]` warnings at new line numbers in `profiles.ts` are the
  same long-standing `ensureProfile` false positive, shifted only because
  this unit's own new code was inserted above it in the same file - net
  zero, not a new risk (same category as Unit 43's own precedent for this
  exact shift-not-new distinction). All fixtures removed/reverted
  afterward - both test phone profiles back to `searcher`/`is_blocked=false`,
  `bankstaff1` back to `is_blocked=false`, the temporary admin account
  fully deleted (both its Auth user and orphaned `profiles` row - deleting
  the Auth user alone does **not** cascade-delete the profile, confirmed
  live, not assumed), `admin1`/`coordinator1`/`bankstaff1`'s
  `must_reset_password` restored to `true`; every state table reconfirmed
  at its exact baseline.
- **Unit 49 shipped (2026-08-03).** A6 audit log UI (hardcoded mock),
  replacing Unit 36's stub placeholder at `/admin/audit`. `AdminAuditLog`
  stays a single Client Component owning its own mock data, same
  "mock-only dynamic screen" precedent as every prior hardcoded admin unit
  (36/38/40/42/47) - no server props yet, that's Unit 50's job. Per this
  unit's own explicit "Read before writing" instruction, the 5 mock rows
  deliberately mirror the four real `action`/`entity_type` pairs already
  written anywhere in this codebase (`view_contact`/`donor`, Units 39/41;
  `transfer_region`/`request` and `close_request`/`request`, Unit 39;
  `block_user`/`profile`, Unit 48) - not invented values - so Unit 50's own
  wiring is a straight read against the real table, not a reshape. The
  visible "coordinator access only" banner (this unit's own literal task
  text) renders unconditionally for now, regardless of who's viewing this
  mock screen - real server-side gating is explicitly Unit 50's job
  (`proxy.ts`), matching CLAUDE.md's own "hiding a nav link is not
  sufficient" framing already applied to this exact screen since Unit 36.
  The now-orphaned `adminPortal.comingSoon` key was deleted, not left
  behind - grepped first to confirm A6 was genuinely its last remaining
  call site (A3/A4/A5 already stopped using it in Units 41/43/47). New
  `adminPortal.auditLog.*` i18n namespace (16 keys). Verified live (real
  `admin1` session, reset-then-restore technique): the real title/banner/
  all 5 mock rows render with correct action/entity labels, the action
  filter correctly narrows the real table body to just the matching
  row - caught and fixed one test-script-only false failure during this
  same verification, not a product bug: the first assertion checked
  `body` innerText and falsely matched the still-present `<select>`'s own
  unfiltered `<option>` text, the identical Playwright locator-ambiguity
  class already logged for A1's own stage filter - fixed by scoping to
  `tbody`, same resolution. Kannada toggle renders the new title key, A1
  and A5 both still load unaffected. `npm run lint` clean, `npm run test`
  34/34 unchanged, `npm run security-scan` identical 27 BLOCKERS/22
  WARNINGS to Unit 48's own count, zero new findings (expected - pure mock
  component, no `lib/db` import). Zero DB writes this unit - baseline
  reconfirmed unchanged; `admin1`'s `must_reset_password` restored to
  `true` afterward.
- **Unit 50 shipped (2026-08-03) — a real, pre-existing bug found and
  fixed while extending `lib/supabase/proxy.ts`, not shipped as a
  regression.** Per this unit's own "extend Unit 05's middleware, don't add
  a second ad-hoc check" instruction, `PORTAL_ROLES` gained a new,
  more-specific entry (`{ prefix: "/admin/audit", roles: ["coordinator"] }`)
  listed *before* the general `/admin` entry - `.find()` returns the first
  match, so ordering is now load-bearing where it never was before.
  **Found while wiring, not assumed correct:** the existing
  `RESET_PASSWORD_GATES` lookup matched by `g.prefix === gate.prefix`
  (exact equality) - for a request under `/admin/audit`, `gate.prefix` is
  now `"/admin/audit"`, which has no exact match in
  `RESET_PASSWORD_GATES` (only `"/bank"`/`"/admin"` do), so the forced-
  password-reset redirect would have silently never fired for a
  coordinator visiting `/admin/audit` directly with
  `must_reset_password` still true - a real gap, not hypothetical.
  **Fixed** by changing that lookup to `pathname.startsWith(g.prefix)`,
  which correctly matches `"/admin"` for any `/admin/*` path regardless of
  which more-specific `PORTAL_ROLES` entry applied, with zero behavior
  change for the three pre-existing gates (`gate.prefix` was always
  exactly `"/bank"`/`"/admin"` for paths under those prefixes, so
  `startsWith` and `===` agree in every case that already existed).
  **Verified live, not just reasoned about:** a coordinator with
  `must_reset_password=true`, signed in with a password already past a
  prior reset, was sent straight to `/admin/reset-password` when visiting
  `/admin/audit` directly (skipping `/admin` entirely) - confirmed both
  before AND after the fix would have differed, by tracing the exact
  lookup logic, not by assuming the fix mattered.
- The redirect target for a rejected non-coordinator admin is `/admin`
  (a new `redirectTo` field on the `PORTAL_ROLES` entry, defaulting to the
  existing `"/"`/`"/donor/register"` behaviour when omitted) - a
  deliberately softer landing than the generic cross-portal-mismatch
  redirect, since an admin rejected from this one coordinator-only
  sub-route still has a perfectly valid `/admin` session to return to,
  unlike a genuine wrong-portal visit. The nav link itself stays visible
  to every admin/coordinator (Unit 36's own original design, unchanged) -
  clicking it now produces a real, working redirect instead of a
  previously-inert placeholder, matching CLAUDE.md's "hiding a nav link is
  not sufficient" framing without needing to also hide it.
- **`lib/db/audit-log.ts` gained real, `.range()`-based pagination
  (`getAuditLogEntries`), same established shape as `AdminDonorLookup`'s
  own real-pagination precedent (Unit 41), not a generous cap** - an audit
  log grows unboundedly by definition, unlike A1/A4/A5's own lower-traffic
  lists. A defensive `caller.role !== "coordinator"` re-check lives in this
  function itself, independent of `proxy.ts`'s own gate - same "route gate
  covers normal navigation, this covers any direct call" pattern already
  established for `getActingAdmin`'s own role re-check (Units 26/30/36).
  `action`/`entityType` are read and displayed as plain, unconstrained
  strings (Unit 33's own deliberate design) - `AdminAuditLog.tsx`'s own
  label functions fall back to the raw value for anything not already
  known, rather than assuming only the four/three values seen so far can
  ever appear.
- Verified live (real `admin1`/`coordinator1` sessions, reset-then-restore
  technique; 22 real fixture `audit_log` rows against `admin1`'s own real
  profile, removed after): a non-coordinator admin visiting `/admin/audit`
  was redirected server-side to `/admin` without the audit screen's own
  content ever rendering (checked the response body directly, not just
  the URL); a real coordinator session reached the real list, saw the
  real actor name (joined from `profiles`) and real action label, and real
  pagination showed exactly 20 rows on page 1 and the remaining 2 on page
  2, Previous correctly returning to the full first page. `npm run lint`
  clean. `npm run test` 34/34 unchanged. `npm run security-scan`: 28
  BLOCKERS (up from 27) + 23 WARNINGS (up from 22) - both new findings
  checked by hand: the established type-only-import category
  (`AdminAuditLog.tsx`), and a genuinely new instance of Unit 14's own
  "unrelated `id:` field caught by the scanner's fixed lookahead window"
  category - `audit-log.ts:21`'s flagged line is `writeAuditLog`'s
  `.insert()` call itself (which sets no `id` field at all), with the
  match actually coming from `AuditLogRow`'s own `id: string;` type field
  a few lines below it, confirmed by reading the scanner's own windowed
  behavior rather than assumed identical to Unit 14's instance. All
  fixtures removed afterward; `admin1`/`coordinator1`'s
  `must_reset_password` restored to `true`; every state table reconfirmed
  at its exact baseline.
- **Unit 51 shipped (2026-08-03).** D6 settings UI (hardcoded mock),
  replacing Unit 19's original shell-only placeholder at `/donor/settings`.
  `DonorSettingsView` stays a single Client Component with local mock
  state, same "mock-only dynamic screen" precedent as every prior
  hardcoded unit - real wiring (edits to `donors`/`profiles`, real pause,
  real account deletion) is Unit 52's job. **The pause-notifications
  control deliberately reuses D2's own `donorPortal.home.*` keys verbatim
  (`pauseControlLabel`, `availabilityToggleLabel`, `pauseDaysLabel`,
  `pauseDaysOption`, `pauseButton`, `pausedMessage`, `resumeButton`), not a
  fresh `settings.pause*` set** - this unit's own "Read before writing:
  Unit 23's D2 screen... keep it consistent" instruction is exactly the
  kind of explicit cross-screen vocabulary instruction this codebase
  already reuses stage/close-reason labels for (Units 37/39); PRD.md
  §7.1 lists "pause notifications" as the same underlying
  `is_available`/`paused_until` mechanism D2 already exposes, reachable
  from Settings too, not a second concept - Unit 52 should wire both
  screens to the identical `setAvailabilityAction`/`pauseAvailabilityAction`/
  `resumeAvailabilityAction` server actions D2 already has, never a second
  implementation. **Delete-account's confirmation text is deliberately
  honest about both real consequences (PRD.md §12 Epic 4, SPEC.md D10)** -
  removing the donor record, and (when a pledge is active) standing it
  down and notifying the responsible admin - not a vague "are you sure?",
  this unit's own explicit verify item. A mock `hasActivePledge` toggle
  (sentinel state, not a separate demo mechanism - same pattern as Unit
  23's own D2/D3 multi-state preview) picks between the two confirmation
  message variants. The now-orphaned `donorPortal.settings.comingSoon` key
  was deleted, confirmed via grep to have no other call site. New
  `donorPortal.settings.*` i18n keys (19 new, `title` already existed).
  Verified live (real donor OTP session via test number `...01`, flipped
  to a real `donor` role + `donors` row via `psql`, reverted after): the
  real title/sections render, empty-name and invalid-PIN are both rejected
  client-side, a valid edit reaches the real "Saved." confirmation, the
  pause/resume control works, the delete flow's confirmation text
  genuinely includes both "stood down" and "admin notified" wording, the
  cancel path returns to settings untouched, and the confirm path reaches
  the real "Account deleted" state. Kannada toggle renders the new title
  key, D2 still loads unaffected. `npm run lint` clean, `npm run test`
  34/34 unchanged, `npm run security-scan` identical 28 BLOCKERS/23
  WARNINGS to Unit 50's own count, zero new findings (expected - pure mock
  component, no `lib/db` import). Zero real DB writes beyond the temporary
  test fixture; baseline reconfirmed unchanged afterward.
- **Unit 52 shipped (2026-08-03) — a real, stale reference in this unit's
  own task text found and corrected while ahead-reading, not followed
  blindly.** "Unit 24's stand-down function — reuse it" names the wrong
  unit: Unit 24 wired D2/D3 and owns no stand-down primitive at all
  (`declineProspect`'s own design deliberately leaves a prospect
  `invited`, never `stood_down` - Unit 24's own README entry). The real,
  reusable primitive is `standDownProspect` (`lib/db/requests.ts`, Unit
  30), already wrapped by `cancelPledge` (`lib/db/prospects.ts`, Unit 26)
  for exactly this donor-initiated, single-active-pledge case.
  `deleteDonorAccount` (`lib/db/donors.ts`) calls `cancelPledge` verbatim,
  not a third copy of the same primitive - SPEC.md D10's "prospect
  auto-stood_down, admin notified" is already exactly what `cancelPledge`
  does (`standDownProspect` + `requests.prospect_cancelled_at` set
  unconditionally, the same signal every other stand-down path already
  relies on), needing zero new notification code.
- **"In one transaction" (this unit's own task text) was resolved as
  "safely ordered sequential writes," not a literal SQL transaction** -
  `createDbClient()` is a PostgREST client with no real multi-statement
  transaction across separate `.from()` calls, the same already-
  documented limitation as `createRequest` (Unit 22). Standing down the
  pledge *before* marking the donor deleted (not the reverse) means the
  only possible partial-failure state is safe and retriable - a crash
  mid-way leaves a correctly-stood-down prospect and a donor simply not
  yet deleted, never a deleted-and-excluded donor whose own prospect
  still looks live to a bank/admin with no cancellation signal sent.
  Considered and rejected introducing a real Postgres stored-procedure
  transaction (technically available via `.rpc()`, not literally "new
  infrastructure" per rule 9) - no other unit in this build has needed
  one despite similarly multi-step writes (`createRequest`,
  `confirmDonation`, `cancelRequest`), and this ordering-based approach
  reaches the same safety property without introducing a first-of-its-
  kind pattern.
- **A real, previously-latent gap closed: nothing checked `donors.deleted_at`
  on the donor-portal-access side before this unit** - `deleted_at` was
  already fully respected by Unit 17's matching engine and Unit 41's A3
  donor lookup, but a deleted donor's own session could have kept using
  every D2-D6 screen indefinitely (their `donors` row still exists, just
  flagged), exactly the "soft hide-from-UI" outcome this unit's own
  constraint explicitly warns against. **Resolved by resetting
  `profiles.role` to `searcher` as part of deletion itself**, not a new
  `DeletedAccountError` class mirroring Unit 48's `BlockedUserError` -
  `lib/supabase/proxy.ts`'s existing role gate already handles the rest
  for free (next `/donor/*` visit redirects to `/donor/register`, the
  same experience a never-registered searcher gets), needing zero new
  error-handling code in any layout. `donors.deleted_at` itself remains
  the permanent, authoritative deletion record regardless of this role
  change - matching engine/A3 exclusion never depended on `profiles.role`
  in the first place.
- **Full personal-data scrubbing (anonymising `profiles.full_name`, say)
  was deliberately NOT added** - PRD.md §12 Epic 4's own literal
  acceptance item ("removes the donor and stands down any pledge") is
  narrower than a GDPR-style full erasure, and is fully satisfied by
  `deleted_at` alone; SPEC.md §10 item 4 ("who owns a data deletion
  request") is still an open question for the Lions Club, not something
  this unit's own scope resolves. **Superseded at the M5 review gate
  (Unit 54, 2026-08-03):** the project owner confirmed the broader
  security-review checklist reading should win here after all -
  `deleteDonorAccount` now also nulls `profiles.full_name`. See Unit 54's
  own "M5 review outcome" section for the full reasoning, including why
  `profiles.phone` is still deliberately left alone.
- `getDonorSettingsState` (`lib/db/donor-portal.ts`) reuses
  `getDonorHomeState` (Unit 24) for the availability/pause/active-pledge
  fields rather than re-deriving "has an active pledge" a second way -
  D6's edit form only adds its own `profiles.full_name`/`donors.blood_
  group`/`donors.pincode` reads on top. `updateDonorProfile`
  (`lib/db/donors.ts`) mirrors `registerDonor`'s own PIN validation
  exactly (`resolveLocation`, never trust a client-supplied region) -
  DOB is deliberately not editable here, matching PRD's own D6 field
  list. The pause control's real wiring reuses D2's own
  `setAvailabilityAction`/`pauseAvailabilityAction`/`resumeAvailabilityAction`
  verbatim (Unit 24), exactly as flagged in Unit 51's own README entry -
  not a second implementation.
- Verified live against the real DB and matching engine, not just the
  mock-era Playwright checks (real fixtures - a flipped donor role/row on
  test number `...01`, a real matched-and-accepted prospect via an actual
  S4→D3 flow, all removed/reverted after): D6 loaded the real fixture
  donor's actual name/pincode from the server; an invalid pincode was
  correctly rejected server-side (`pinNotFound`); a valid edit (name,
  blood group, pincode) persisted for real, confirmed via `psql`; real
  pause/resume worked through D2's own shared actions; deleting the
  account with a real active pledge showed the correct "stood down +
  admin notified" confirmation wording, and afterward `psql` confirmed
  directly: `prospects.status='stood_down'`, `requests.stage` reverted to
  `finding_prospects`, `requests.prospect_cancelled_at` set,
  `donors.deleted_at` set, `profiles.role='searcher'`. A fresh real S4
  request for the donor's (edited) blood group afterward correctly
  matched **zero** donors (`zero_match_at` set) - the literal "verified
  directly, not assumed" requirement, done for real. The post-deletion
  session was confirmed redirected from `/donor` to `/donor/register` on
  its very next request. `npm run lint` clean, `npm run test` 34/34
  unchanged, `npm run security-scan`: 30 BLOCKERS (up from 28) + 23
  WARNINGS (unchanged) - both new blockers checked by hand: the
  established type-only-import category
  (`DonorSettingsView.tsx`'s `import type { DonorSettingsState }`) and the
  established Rule-1-clarification category (`createClient()` immediately
  followed by `refreshSession()`, an Auth-service call already on the
  allowed list) - zero real new findings. All fixtures removed afterward;
  every state table reconfirmed at its exact baseline.
- **Unit 53 shipped (2026-08-03).** Privacy notice (`/privacy`) and terms
  of service (`/terms`) pages, both public Server Components under
  `app/(public)/` reading the dictionary directly (Unit 10's own
  precedent for server-side-only translated text) - static content, no
  schema change, matching this unit's own scope limit. **"Reachable from
  every portal" (PRD.md §11.1) is satisfied with one shared footer added
  to the root `app/layout.tsx`**, not four separate edits to each
  portal's own shell - the root layout is already the strict ancestor of
  every route in this app (public/donor/bank/admin all nest under it), so
  one footer there reaches all of them for free, avoiding four copies of
  the same two links.
- **Confirmed, not silently skipped, per this unit's own "confirm
  consent_at/consent_version actually references the version of this
  text" instruction: `CONSENT_VERSION` stays at `"1"`, not bumped** -
  `donorRegister.consentText` (D1's own checkbox) is unchanged; the new
  `/privacy` page covers the same three required facts plus genuinely
  new detail (searcher-side data, grievance contact) the checkbox never
  claimed to cover, so nothing a donor already consented to has changed
  meaning. Documented directly in `lib/db/donors.ts`'s own
  `CONSENT_VERSION` comment, not just here, so a future unit doesn't
  re-litigate this from scratch.
- **Named grievance contact (PRD.md §11.1) is a `PLACEHOLDER`, same
  established convention as every other pending-real-data item** (Unit
  02's geography/bank data, Unit 35's admin accounts) - real contact
  details are pending Lions Club confirmation, not this unit's own job to
  invent.
- Verified live (temporary Playwright script, removed after; zero DB
  writes this unit): both pages load 200 with zero auth, real required
  content renders (§11.2's phone-sharing fact, §11.3's prohibition
  wording, the grievance section); the shared footer with both links
  renders on all four portals' own pre-auth entry points (`/`,
  `/donor/register`, `/bank/login`, `/admin/login`) and on an existing
  authenticated flow (`/search`, unaffected); clicking the footer link
  navigates correctly. **One genuine environment gotcha found and
  resolved, not a product bug:** the Kannada toggle's own mechanism
  (`LocaleProvider.setLocale`) only sets a cookie and updates client-side
  React state - it never calls `router.refresh()` - so a Server
  Component's own rendered text (this unit's pages, like Unit 10's shell
  headers before it) only picks up the new locale on the *next real
  navigation*, unlike a `"use client"` screen's `useTranslation()` text,
  which updates instantly. The first test assertion checked immediately
  after the click and failed; fixed by reloading first, matching what a
  real user would actually experience. `npm run lint` clean, `npm run
  test` 34/34 unchanged, `npm run security-scan`: 31 BLOCKERS (up from
  30) + 23 WARNINGS (unchanged) - one already-established category
  (Rule-1-clarification `refreshSession`) and one genuinely new one (a
  `[rule 7]` false positive on the word "diagnosis" appearing in
  disclaiming, not schema-adding, prose - see the Security review
  section's own catalogue for the full writeup). One stray `search_logs`
  row from this unit's own `/search` check was cleaned up afterward (the
  standing "gets missed" gotcha, caught this time) - baseline reconfirmed
  at 0 rows.
- **Unit 55 shipped (2026-08-03), starting M6 - found two real schema gaps
  before writing any aggregation code, both resolved with the project
  owner rather than approximated or guessed (see the two `AskUserQuestion`
  exchanges this session for the full reasoning each option weighed).**
  PRD.md §14's eight metrics turned out to split cleanly into six that
  the existing schema already supports and two that genuinely didn't:
  1. **"Tier 1 hit rate" (row 6) had no data path at all** - `search_logs`
     (Unit 07) never recorded whether stock was actually found at search
     time, and has no link whatsoever (no phone/session) to whether a
     request later followed. **Resolved: add `search_logs.stock_found`**
     (new nullable boolean, no default - existing rows and any
     no-blood-group search stay null, never fabricated) - `lib/db/
     search.ts`'s `getSearchResults` already computes exactly this
     (whether any verified/active bank in the region has `units > 0` for
     the searched blood group), it just never stored it. Per the project
     owner's own explicit follow-up: the dashboard (Unit 57) must show
     the sample window this metric is counted over, not just a bare
     percentage - `getPlatformMetrics` returns `sampleSince` (earliest
     counted `searched_at`) for exactly this.
  2. **"Admin response time distribution" (row 8) had no trustworthy
     signal either, discovered while designing the metric, not something
     the schema visibly lacked up front.** `admin_notified_at` is real,
     but Unit 39's `takeOwnership` (`lib/db/admin-requests.ts`)
     unconditionally overwrote it to "now" on every call - including when
     escalation (`lib/db/escalation.ts`) had already set it earlier -
     destroying the real notify-to-act gap for exactly the escalated
     requests this metric exists to surface. **Fixed: `takeOwnership` now
     only sets `admin_notified_at` when it was still null.** Separately,
     even with that fixed, there was no dedicated "ownership actually
     assigned" timestamp at all - `requests.updated_at` is unsafe to
     reuse (bumped by many later, unrelated writes: schedule/close/
     resolve, even a donor's own prospect-accept via
     `syncRequestStageAfterProspectChange`). **Resolved: new
     `requests.owner_assigned_at`** (nullable, set exactly once, guarded
     `IS NULL`, never overwritten), written by both `takeOwnership` and
     `transferRequestToRegion` (transfer counts as first engagement too,
     if nobody had claimed the request yet - it does NOT reset
     `admin_notified_at`'s own always-fresh-on-transfer behaviour, a
     separate, already-correct design from Unit 39).
  New migration `20260803234500_metrics_signals.sql` - both columns
  additive, nullable, no default, no other unit's schema touched.
  **Architecture mirrors `lib/matching/` vs `lib/db/matching.ts`
  exactly** - `lib/metrics/stats.ts` (generic `median`/`percentage`/
  `bucketize`/`minutesBetween`), `lib/metrics/requests.ts`
  (`firstAcceptanceMinutes`, `acceptanceToDonationMinutes`,
  `classifyProspectOutcome`, `adminResponseMinutes` - all pure, DB-free,
  each independently unit-tested), `lib/metrics/search.ts`
  (`tier1HitRate`), and `lib/db/metrics.ts`'s `getPlatformMetrics` doing
  the actual reads (one capped `.limit()` query each against `requests`/
  `prospects`/`search_logs` - rule 4's "generous but explicit" cap
  reasoning, same as `MAX_ESCALATION_CANDIDATES`, not real pagination -
  this is a single-district aggregate, not a list endpoint) and shaping
  rows into the pure functions' input. Two judgment calls made and
  documented, not asked about (narrow, well-reasoned, unlike the two
  above): **"% closed found_elsewhere" (row 5) uses all requests as its
  denominator**, matching row 2's own "% requests reaching resolved"
  phrasing pattern, not "of closed requests only" - PRD.md §14 doesn't
  literally say either way. **"Ignored" (row 7) requires the prospect's
  own request to have reached a terminal stage** (`resolved`/`closed`) -
  a still-active request's un-responded invite hasn't had its window
  close yet, so it's "not yet decided," not "ignored"; "declined" (the
  Unit 24 "Not now"/"Not for a while" signal - still `invited`, but
  `responded_at` set) counts regardless of request stage, since that's a
  genuine reply, not a timeout. Monthly buckets (`invited_at`'s own
  `YYYY-MM`) reuse the `notif_month` convention (Unit 22) rather than
  inventing a new one. Deliberately excludes any registered-donor count
  anywhere in the output - PRD.md §14's own explicit "not a success
  metric," confirmed by grep, not just by omission.
  **Verified live against the real local Supabase stack, not just the 24
  new `lib/metrics/*` unit tests (58/58 total, up from 34):** a temporary
  API route calling `getPlatformMetrics()` directly (removed after) was
  hand-checked against 4 real fixture requests, 5 fixture prospects
  spanning two different invite-months, and 4 fixture search_logs rows
  (including one deliberate null `stock_found` for a no-blood-group
  search) - every one of the eight metrics matched its hand-computed
  expected value exactly (prospects-per-donation 5, 25% resolved, 30min
  median first-acceptance, 120min median acceptance-to-donation, 25%
  found_elsewhere, 66.67% tier-1 rate over a 3-row counted sample,
  correct per-month decline/ignore split, admin response median 255min
  across a 10min and a 500min sample). Separately, `stock_found` was also
  confirmed against a **real** `/search` hit (not a fixture): the real
  seeded PLACEHOLDER Blood Bank's real A+ stock (42 units) produced
  `stock_found = true`, a real O+ search (0 units) produced `false`, and
  a bare region-only search produced `null` - all three read back
  directly via `psql`. All fixtures, the temporary route, and the three
  real `search_logs` rows the live `/search` check itself created were
  cleaned up afterward; baseline reconfirmed at 0 rows across every state
  table, including a stray single `audit_log` row found predating this
  session (referencing already-deleted requests/prospects from an
  earlier unit's own testing) - cleaned up since found, same precedent as
  Unit 23's own stray `search_logs` cleanup. `npm run lint` clean, `npm
  run test` 58/58, `npm run security-scan`: unchanged 31 BLOCKERS/23
  WARNINGS (zero new findings - the one shifted line number,
  `admin-requests.ts`'s `id: request.id`, is the already-documented Unit
  39 false positive, not new).
- **Unit 56 shipped (2026-08-03).** `/admin/metrics` (PRD.md §14), hardcoded
  mock, same "single Client Component, no props, mock data inline" precedent
  as every prior `*_UI`-only unit (Units 38/40/42/47/49) - no dynamic route
  param exists here to justify a Server+Client split yet, Unit 57 adds one
  when it adds the real fetch. `components/admin/AdminMetricsDashboard.tsx`'s
  `MOCK_METRICS` constant is typed as `PlatformMetrics` (imported `type`-only
  from `lib/db/metrics.ts`, Unit 55) rather than a fresh ad-hoc shape - same
  "swap to real data is visually seamless" reasoning as every earlier
  `*_UI`-then-wire pair, so Unit 57's job really is just calling
  `getPlatformMetrics()` in place of this constant. No charting library
  added (would need asking first, per the project owner's own standing
  "no new dependencies without asking" preference, separate from CLAUDE.md
  rule 9's own infrastructure scope) - every "chart" is plain Tailwind
  (a CSS-width bar per bucket for the admin-response histogram, a plain
  table for the monthly decline/ignore trend), no new packages. The
  histogram's bucket `label` values (`"<=1h"`, `"1-4h"`, etc. - Unit 55's own
  `lib/metrics/stats.ts` bucket identifiers) are treated as stable,
  untranslated identifiers, not display text - a `bucketLabel()` switch maps
  each to a real `en`/`kn` i18n key, the identical pattern
  `AdminAuditLog.tsx`'s own `actionLabel()`/`entityLabel()` already
  established for raw DB text needing per-value translation. Nav gained a
  6th item (Metrics), same admin/coordinator gate as the rest of the shell -
  `proxy.ts` needs no new `PORTAL_ROLES` entry, this isn't a coordinator-only
  screen like A6. Registered-donor count confirmed absent from the mock data
  too, not just Unit 55's real module. Verified live with a real
  `admin1@test.local` session (temporary Playwright script, removed after) -
  **found and worked around a real environment issue, not a product bug:**
  `admin1`'s actual Auth password had drifted from the documented
  `TempPass123!` at some point in this session's own earlier testing and was
  never restored, so login itself failed until a temporary Auth-admin-API
  script reset it back to the known value; restored again afterward. Once
  logged in: title, 6 nav items in the correct order (`Queue/Donors/Banks/
  Reports/Audit log/Metrics`), all eight metric sections rendered, and the
  Kannada toggle correctly re-rendered the page title. `admin1`'s
  `must_reset_password` restored to `true` afterward, same as every prior
  unit's own fixture-account cleanup. `npm run lint` clean, `npm run test`
  58/58 unchanged, `npm run security-scan`: 32 BLOCKERS (up from 31) + 23
  WARNINGS (unchanged) - the one new finding,
  `AdminMetricsDashboard.tsx`'s `import type { PlatformMetrics } from
  "@/lib/db/metrics"`, checked by hand and confirmed the same
  already-documented type-only-import false positive as every prior
  instance. Zero DB writes from this unit itself - baseline reconfirmed
  unchanged (0 rows everywhere, `profiles` at 6).
- **Unit 57 shipped (2026-08-03).** New `lib/actions/admin-metrics.ts`'s
  `loadPlatformMetrics` - same `"use server"` + `getActingAdmin()` re-check
  shape as `admin-reports.ts`'s `loadAdminReports` - calls Unit 55's
  `getPlatformMetrics()` directly, no metric math reimplemented in the
  action or the component (this unit's own explicit constraint).
  `AdminMetricsDashboard`'s `MOCK_METRICS` constant is gone entirely, not
  just unused (same "delete, don't adapt" precedent as every prior
  `*_UI`-then-wire pair) - the component now takes `metrics: PlatformMetrics`
  as a prop, `app/admin/(portal)/metrics/page.tsx` is now an `async` Server
  Component calling the action, same split as `AdminReportsPage`/
  `AdminAuditLog`'s own page. **No date-range control added** - `getPlatformMetrics`
  has no date-range parameter to control, and this unit's own task text is
  explicit that adding one anyway would imply a filter that isn't actually
  applied; instead a new `fullHistoryNote` banner says plainly that every
  figure reflects full history. Two small, real correctness additions found
  while wiring (not asked for verbatim, same "fix what real data exposes"
  category as many earlier wiring units): an explicit "not enough data yet"
  empty state for the monthly decline/ignore table and the admin-response
  histogram when either is genuinely empty (the real local DB starts at
  zero rows, so this path is not hypothetical), and `tier1SampleSince` now
  slices the raw ISO timestamp down to just the date portion for display
  (functionally correct either way, just needlessly verbose unsliced).
  **Verified live against the real local Supabase stack, not just re-reading
  the code:** reused Unit 55's exact same fixture set (4 requests, 5
  prospects, 4 search_logs) and a real `admin1@test.local` session - every
  number rendered exactly matched Unit 55's own hand-computed values (5.0
  prospects/donation, 25.0% resolved, 25.0% found-elsewhere, 30 min median
  first-acceptance, 120 min median acceptance-to-donation, 66.7% tier-1 rate
  over 3 counted searches, both months' decline/ignore splits, and the
  admin-response histogram/median/sample-size) - confirmed via the actual
  rendered page text, not the component's own prop payload alone (though
  that was also inspected in the RSC stream and matched too). Found a real
  environment issue again during this session's own testing, not a product
  bug: `admin1`'s password had drifted a second time (this unit's own
  earlier verification run pushed it to a new value via the forced-reset
  flow) - reset back to the documented `TempPass123!` via the same temporary
  Auth-admin script pattern, `must_reset_password` restored to `true`
  afterward. All fixtures cleaned up, baseline reconfirmed at 0 rows
  everywhere except the permanent 6 profiles. `npm run lint` clean, `npm run
  test` 58/58 unchanged, `npm run security-scan`: unchanged 32 BLOCKERS/23
  WARNINGS (zero new findings - `lib/actions/admin-metrics.ts` is
  server-only code, same shape as every other action file, and the
  component's type-only import is the identical finding already confirmed
  at Unit 56).

---

## Security review — for tools without the `security-review` skill

Claude Code's `security-review` skill (checked in at
`~/.claude/skills/security-review/` on whichever machine set it up - not
part of this repo) has two halves: a mechanical scanner and a judgment
checklist. The scanner is now copied into this repo at
`scripts/security-scan.py` (`npm run security-scan`) - plain Python
standard library, no Claude-specific dependency, runs from any tool. The
judgment checklist below is the half a script can't do; whoever runs a
milestone review (Units 06, 15, 32, 45, 54, 58) without access to the
skill should still work through this by hand against the diff.

**Known false-positive categories, confirmed running the scanner against
this repo as of Unit 10** - don't treat these as findings without
rechecking what the flagged line actually does:
- Any `createClient()` (from `lib/supabase/client.ts`) inside a `"use
  client"` component, flagged as a rule-1 BLOCKER unconditionally. Check
  what auth method is called next - `signInWithOtp`/`verifyOtp`/
  `signInWithPassword`/`updateUser`/`signOut`/`refreshSession`/
  `getSession`/`onAuthStateChange` are the browser-safe exception (Rule 1
  clarification above); `.from()`/`.rpc()`/`.storage` would be real.
- "Table created without RLS in the same migration" for every Unit 02
  table - RLS was deliberately enabled in Unit 04's migration, not
  Unit 02's. The scanner only checks one file at a time.
- "insert payload sets an `id` field" wherever a seed/admin script inserts
  a row using an id it already has from a prior `auth.admin.createUser()`
  call (e.g. `frontend/scripts/seed-bank-accounts.mjs`) - there's no
  client request in a seed script for Rule 2 to even apply to.
- "phone selected outside lib/serialise" in `lib/db/profiles.ts`'s
  `ensureProfile` - this reads a user's *own* phone from their *own*
  session-derived row (set at OTP verification), not donor data being
  exposed to a different party. Rule 3 is about the latter.

**More confirmed running the scanner as of Unit 12:**
- "client component imports from lib/db" for an `import type { ... }
  from "@/lib/db/..."` line (e.g. `BankSettingsForm.tsx`, `ShortageBoard.
  tsx`, `StockDashboard.tsx` importing `BankSettings`/`BloodGroup`/
  `StockRow` as types). `import type` is erased entirely at compile time
  - none of `lib/db`'s runtime code, including the secret-key client,
  ships to the browser. The scanner's regex matches the import path
  textually and can't see the `type` keyword.
- "phone selected outside lib/serialise" in `lib/db/bank-portal.ts`'s
  `getBankSettings` - this is `blood_banks.phone`, the bank's own public
  business number (already shown in search results via `BankCard.phone`,
  Unit 07), not a donor's. A different table than the other phone
  false-positive above - check which table before assuming either one
  covers the other.

**More confirmed running the scanner as of Unit 13:**
- "timing parameter appears hardcoded" for `FRESHNESS_THRESHOLD_HOURS` in
  `components/search/SearchResults.tsx` - same shape as the identical
  hardcode in Unit 11's original `StockDashboard.tsx`, and for the same
  reason: this unit is explicitly mock-only, no network calls (its own
  scope limit), so there's no `app_settings` read to wire up yet. Unit 14
  replaces it with a real `getAppSetting("bank.stock_freshness_hours")`
  call, the same fix Unit 12 already made on the bank-portal side.

**More confirmed running the scanner as of Unit 14:**
- "insert payload sets an `id` field" in `lib/db/search.ts` - the actual
  match isn't near the `search_logs` insert at all; it's the unrelated
  `return { region: { id: regionId, ... } }` statement, which just falls
  inside the scanner's fixed 500-character lookahead window after the
  insert call. The search_logs insert itself never sets an `id`.
- "phone selected outside lib/serialise" in `lib/db/search.ts`'s
  `getSearchResults` - `blood_banks.phone`, the bank's own public number,
  deliberately shown to anonymous searchers per PRD.md §6.1 S2 itself
  ("Blood bank cards: name, address, phone (tap to call)"). The clearest
  case yet of this false-positive category - this phone number being
  public *is the feature*, not an oversight.
- "client component imports from lib/db" for `SearchForm.tsx`'s
  `import type { PincodeOption, ResolvedLocation } from "@/lib/db/
  pincodes"` - same type-only-import false positive as Unit 12's
  instances, erased at compile time.

**More confirmed running the scanner as of Unit 20 - one flagged, one
real (not the same finding, don't conflate them):**
- "primary key taken from client input" in `lib/db/donors.ts`'s
  `registerDonor` (`id: input.id` in the `donors` upsert) - a false
  positive, same class as `ensureProfile`'s already-documented one
  (`lib/db/profiles.ts`), just a different regex shape (`id:` explicit
  key-value vs. `id` shorthand) that hadn't tripped the scanner's pattern
  before now. Verified, not assumed: grepped the whole codebase for every
  call site of `registerDonor` - there is exactly one
  (`lib/actions/donor-registration.ts`), and it supplies `id` from
  `getClaims()`'s server-verified session, never from its own client-facing
  parameter list (which has no `id` field at all).
- **The scan did NOT catch the actual bug, which was real, not a false
  positive.** The first version of `lib/actions/donor-registration.ts`
  wrote `registerDonor({ id, ...input })` - spreading the client-supplied
  `input` object *after* the server-derived `id`. Object spread lets a
  later key win, so a raw request crafted directly against this action's
  endpoint (bypassing the UI and its TypeScript parameter shape entirely -
  Next.js Server Actions don't enforce that shape at runtime) could
  smuggle its own `id` field into the JSON body and silently overwrite the
  legitimate one, letting an attacker overwrite an arbitrary victim's
  `profiles.role`/`full_name` and `donors` row. Caught by manually tracing
  the call chain while checking the scanner's (unrelated, false-positive)
  finding on the same file, not by the scanner itself. Fixed by building
  the object passed to `registerDonor` from named fields only
  (`{ id, fullName: input.fullName, dob: input.dob, ... }`), never
  spreading the raw input. **Any later unit's server action that combines
  a session-derived id with a client-supplied options object should build
  that object from named fields, never `{ id, ...clientInput }`** - the
  scanner will not catch this shape of bug, it has to be checked by hand
  every time.

**More confirmed running the scanner as of Unit 22:**
- "client component imports from lib/db" for `RaiseRequestFlow.tsx`'s
  `import type { BankOption } from "@/lib/db/blood-banks"` - same
  type-only-import false positive as Units 12/14's instances, erased at
  compile time.
- `lib/actions/raise-request.ts` applied Unit 20's standing rule from the
  start, not as an afterthought: `raiseRequestAction`/
  `checkOpenRequestAction` build the object passed to `createRequest`
  from named fields only, never `{ ...clientInput }` spread anywhere near
  the session-derived `phone`/`profileId`.

**More confirmed running the scanner as of Unit 24:**
- "client component imports from lib/db" for `DonorHomeView.tsx`'s
  `import type { DonorHomeState } from "@/lib/db/donor-portal"` and
  `RequestResponseFlow.tsx`'s `import type { RequestView } from
  "@/lib/db/prospects"` - same type-only-import false positive as
  Units 12/14/22's instances, erased at compile time.

**More confirmed running the scanner as of Unit 26 - one flagged, one
worth the extra scrutiny it got before being treated as a false positive:**
- "client component imports from lib/db" for `PledgeView.tsx`'s
  `import type { PledgeDetail } from "@/lib/db/prospects"` - same
  type-only-import false positive as Units 12/14/22/24's instances.
- "phone selected outside lib/serialise" in `lib/db/prospects.ts`'s
  `getActivePledgeDetail`, twice: `blood_banks.phone` (the bank's own
  public number - same already-documented category as Unit 14's
  instance) and `profiles.phone` for `requests.owner_admin_id` (the
  *admin's* own phone, which this screen is explicitly required to show
  per Unit 26's own constraint - "This screen shows the admin's phone to
  the donor, never another donor's"). The second one got a real second
  look, not a reflexive false-positive dismissal, because
  `owner_admin_id` is the same `profiles` table donor phone numbers live
  in, and has no DB-level check constraint restricting it to admin-role
  rows - nothing writes it at all yet (M4's job), so today it's always
  null and never a real risk, but the *read* code shouldn't be the thing
  relying on some future write path getting it right. Hardened
  defensively: the query now also selects `role` and only trusts the row
  as "the admin" when it's actually `admin`/`coordinator`; anything else
  (including a hypothetical future bug that points `owner_admin_id` at a
  donor) falls back to the same null-safe "no admin assigned yet" path
  D4 already renders for the common pre-M4 case, never exposing the
  wrong person's phone number.

**More confirmed running the scanner as of Unit 30:**
- "client component imports from lib/db" for `RequestStatusView.tsx`'s
  `import type { RequestStatusView as RequestStatusData } from
  "@/lib/db/requests"` - same type-only-import false positive as every
  prior instance of this category.
- "phone selected outside lib/serialise" in `lib/db/requests.ts`'s
  `getRequestStatus` - `profiles.phone` for `requests.owner_admin_id`,
  the exact same already-documented category as Unit 26's
  `getActivePledgeDetail` instance (the admin's own staff phone, shown to
  whoever holds this request's own link, with the identical `role IN
  ('admin','coordinator')` defensive re-check copied verbatim). Not a new
  category, just a new file - checked by hand rather than assumed
  identical, since this is also the unit that introduced a genuinely new,
  deliberate no-session access model for the surrounding function, and
  that surrounding decision deserved its own scrutiny even though this
  particular finding turned out to be the same shape as before.

**More confirmed running the scanner as of Unit 35:**
- "Supabase client constructed inside a client component" for
  `AdminLoginFlow.tsx`/`AdminForcedPasswordResetForm.tsx` - same
  already-documented Rule 1 clarification category as `BankLoginFlow.tsx`/
  `ForcedPasswordResetForm.tsx`'s own long-standing entries - each
  `createClient()` call here is immediately followed by
  `signInWithPassword`/`updateUser`, both Auth-service calls on the
  allowed list, checked by hand rather than assumed identical just
  because the file names look similar.

**More confirmed running the scanner as of Unit 36:**
- "Supabase client constructed inside a client component" for
  `components/admin/SignOutButton.tsx` - same already-documented Rule 1
  clarification category as `components/bank/SignOutButton.tsx`/
  `components/donor/SignOutButton.tsx` - `createClient()` immediately
  followed by `signOut()`, an Auth-service call on the allowed list.

**More confirmed running the scanner as of Unit 37:**
- "client component imports from lib/db" for `AdminQueueBoard.tsx`'s
  `import type { AdminQueueRow, EscalationThresholds } from
  "@/lib/db/requests"` - same already-documented type-only-import false
  positive as every prior instance of this category, erased at compile
  time.

**More confirmed running the scanner as of Unit 39 - three already-known
categories, one genuinely new one:**
- "client component imports from lib/db" for `AdminRequestDetail.tsx`'s
  `import type { AdminRequestDetailView, RegionOption } from
  "@/lib/db/admin-requests"` - same already-documented type-only-import
  false positive as every prior instance.
- "phone selected outside lib/serialise" in `admin-requests.ts` for
  `blood_banks.phone` - the bank's own public number, same already-
  documented category as every prior instance of this table/column.
- "phone selected outside lib/serialise" in `admin-requests.ts` for
  `profiles.phone` read for a batch of donor ids - the identical shape as
  `bank-prospects.ts:69`'s own already-accepted finding (Unit 28): the
  raw value is only ever used as `revealDonorContact`'s input, never
  returned directly: re-verified by hand, not assumed identical just
  because the shape matches.
- **New category: "primary key taken from client input" for `id:
  request.id`, where `request` is a local variable's own name, not an
  HTTP request.** The scanner's rule-2 regex
  (`id\s*:\s*(?:body|req|request|input|payload|params|searchParams)\.`,
  confirmed by reading `scripts/security-scan.py` directly) matches any
  variable literally named one of that fixed word list, with no
  understanding of what the variable actually holds. Here it holds an
  already-fetched, region/coordinator-scoped database row
  (`getScopedRequestRow`'s own return value) - `id: request.id` is
  echoing back that row's own primary key into a response shape, never
  accepting a client-supplied id for a write. Worth remembering for any
  future unit that names a local variable `request`, `body`, `input`,
  `payload`, `params`, or `searchParams` for a DB row or other
  server-side value - the same false trigger will recur.

**More confirmed running the scanner as of Unit 41:**
- "client component imports from lib/db" for `AdminDonorLookup.tsx`'s
  `import type { AdminDonorSearchRow, OpenRequestOption } from
  "@/lib/db/admin-donors"` - same already-documented type-only-import
  false positive as every prior instance.
- "phone selected outside lib/serialise" in `admin-donors.ts` for
  `profiles.phone` read for a single `donorId` - re-verified by hand
  (not assumed identical just because the shape looks similar): the raw
  value is only ever used as `revealDonorContact`'s input, never returned
  directly - same category as `bank-prospects.ts:69`/
  `admin-requests.ts:468`'s own already-accepted instances.

**More confirmed running the scanner as of Unit 43:**
- "client component imports from lib/db" for `AdminBankManagement.tsx`'s
  `import type { AdminBankRow } from "@/lib/db/admin-banks"` - same
  already-documented type-only-import false positive as every prior
  instance.
- "phone selected outside lib/serialise" in `admin-banks.ts` for
  `blood_banks.phone` - the bank's own public number, same already-
  documented category as `lib/db/bank-portal.ts`'s `getBankSettings` and
  `lib/db/search.ts`'s own instances of this exact table/column.

**More confirmed running the scanner as of Unit 53 - one already-known
category, one genuinely new one:**
- "client component imports from lib/db" for `DonorSettingsView.tsx`'s
  `import type { DonorSettingsState } from "@/lib/db/donor-portal"` -
  same already-documented type-only-import false positive as every prior
  instance.
- "Supabase client constructed inside a client component" for
  `DonorSettingsView.tsx`'s own `createClient()` call inside
  `confirmDelete()` - immediately followed by `refreshSession()`, an
  Auth-service call already on the Rule 1 clarification's allowed list,
  same category as every prior `refreshSession()`/`signOut()` instance.
- **New category: `[rule 7] forbidden field: diagnosis` fired on
  `lib/i18n/en.ts`'s own privacy-page copy, not a schema/type addition at
  all.** The flagged line is `privacyPage.whatWeCollectBody`'s own prose -
  "the patient's first name only (never a surname, **diagnosis**, or
  hospital record)" - explicitly *disclaiming* collection of the forbidden
  field, the opposite of adding one. The scanner's rule 7 check is a plain
  keyword match against the word itself, with no understanding of negation
  or surrounding context - worth remembering for any future unit writing
  privacy/compliance copy that needs to *name* a forbidden category in
  order to explain it isn't collected.

### The judgment checklist (from the skill's SKILL.md, reproduced here)

**Rule 3 — donor phone numbers** (the most important check):
- Every new endpoint returning donor data passes through `lib/serialise`
- No endpoint re-implements the phone visibility check inline
- Phone is released only to: an admin in that donor's region with an
  `accepted` prospect, or the bank the donor is scheduled at
- No search or list response contains a phone number under any role
- Requester-facing request status shows counts only - no names, no
  numbers, before acceptance

**Rule 1 — server-only database access**:
- Every new route handler authenticates before querying
- Region scoping is applied - an admin for region A cannot read region
  B's requests by changing an ID in the URL
- Object-level authorisation is checked, not just role
- No new table grants `REFERENCES`, `TRIGGER`, or `TRUNCATE` to `anon` or
  `authenticated` - check `information_schema.role_table_grants`
  directly, and `pg_default_acl` if the same gap keeps recurring (see the
  Unit 06 outcome below - this exact thing happened once already)

**Rule 5 — donation confirmation**:
- Only a bank-authenticated route can write a `donations` row or set
  `prospect.status = 'donated'`
- Nothing lets a donor self-report a donation
- Confirming a donation is what sets `last_donated_at`/`next_eligible_at`
  - no other code path writes them

**Rule 6 — public search**:
- No auth check, redirect, signup wall, or email capture on any route
  under `app/(public)/`
- Search still works logged out (test it in a private window)

**Rule 7 — minimal patient data**:
- No new column, form field, or type stores diagnosis, hospital record
  number, doctor name, or free-text medical notes
- `patient_name` is first name only

**Privacy and audit**:
- Every route exposing patient or donor contact data writes to
  `audit_log`
- Account deletion removes personal data; donation history is
  anonymised, not deleted
- No personal data in URL query strings, log output, or error messages

**Data integrity**:
- `request.stage` is still derived from prospects, never set
  independently
- `closed` still requires a reason
- One open request per phone, one active prospect per donor - both
  enforced server-side
- Blood group compatibility table unchanged, still red-cells-only

Report findings before fixing anything - BLOCKER (violates a numbered
rule, don't merge) / WARNING (likely violation or unclear, needs a human
decision) / INFO (worth knowing, not blocking). If the scan and checklist
are both clean, say so plainly rather than inventing findings.

---

## M1 review outcome (Unit 06)

Two decisions came out of the review, both resolved with you before acting,
not silently:

1. **Rule 1 clarification, added to CLAUDE.md verbatim:** Supabase Auth
   (GoTrue) calls — `signInWithOtp`, `verifyOtp`, `signOut`, `getSession`,
   `onAuthStateChange` — may run in the browser. That's the only way
   interactive OTP entry works. Everything touching application data
   (`.from()`, `.rpc()`, `.storage`) stays server-only. The
   `security-review` skill's `SKILL.md` now states this exception
   explicitly so `PhoneOtpFlow.tsx`'s `createClient()` calls stop being
   flagged as a BLOCKER on every future scan.
2. **`anon`/`authenticated` had `REFERENCES`/`TRIGGER`/`TRUNCATE` on every
   table (Unit 06 migration `revoke_anon_authenticated_table_grants`):**
   none of these three expose row data, but `TRUNCATE` bypasses RLS
   entirely — RLS only governs SELECT/INSERT/UPDATE/DELETE, so Unit 04's
   RLS-with-no-policies backstop never closed this. Traced to a
   `pg_default_acl` entry owned by the `postgres` role (the role our
   migrations run as) that auto-grants these three on every new table in
   `public` — fixed both the 7 existing tables *and* the default itself,
   confirmed by creating and dropping a throwaway table and checking its
   grants came back empty. Without the default-privilege fix this would
   have recurred at every future milestone's new tables (M2's
   `bank_stock`/`bank_shortages`, M3's `requests`/`prospects`, etc.).
   `security-review`'s `SKILL.md` now has a standing check for this so
   it's caught automatically at every milestone review.

**A correction to an earlier review claim, for the record:** the review
initially justified the RLS-timing gap (tables created in Unit 02, RLS
enabled in Unit 04) by claiming Unit 02's migration had "no GRANT
statements, so default-deny protected the tables." That premise was
false — the grants above did exist the whole time. The conclusion (no row
data was ever exposed) still held, but for a narrower reason: none of the
three granted privileges include SELECT/INSERT/UPDATE/DELETE. Don't trust
a "no grants exist" claim anywhere in this project without querying
`information_schema.role_table_grants` directly — it was wrong once
already.

---

## M2 review outcome (Unit 15)

First genuinely shippable point (PRD.md §13: "Stock lookup works end to
end") — reviewed as such, not just screen-by-screen.

**Scan:** 8 BLOCKERS + 14 WARNINGS, all cross-checked against the
false-positive log Units 08–14 already built up in this file — zero new,
zero unresolved. Table grants for all three new M2 tables (`bank_stock`,
`bank_shortages`, `search_logs`) checked directly against
`information_schema.role_table_grants`, not inferred from RLS being
enabled: zero grants to `anon`/`authenticated`, full expected grants to
`service_role`.

**Judgment checklist:** Rule 1 (region/bank scoping — re-verified via the
crafted-request tests already run in Units 12/14, not re-derived from
scratch), Rule 3 (not applicable — M2 touches zero donor data; the only
phone in any response is `blood_banks.phone`, deliberately public per
PRD.md §6.1 S2), Rule 6 (verified live, zero auth anywhere on `/` or
`/search`). Epic 2's six items and Epic 5's two stock rows: all PASS,
each backed by a real test already run in Units 12/14 (cross-bank/
cross-region isolation, real staleness, real timestamp-on-every-save),
not re-verified by inspection alone this time since the evidence already
exists.

**One real finding, not previously caught:** `lib/db/pincodes.ts`'s
`resolveLocation` passed the raw typed input straight into `.ilike()`
unescaped. `%`/`_` are ILIKE wildcards, not literal characters — verified
live against the real DB that a bare `%` resolved to an arbitrary region
(the first pincode row) instead of correctly finding no match. Not a
CLAUDE.md numbered-rule violation (public, read-only, no data exposure),
just a genuine input-handling gap the unit that wrote it hadn't tested.
**Fixed same session:** added `escapeLikePattern()` (escapes `\` first,
then `%` and `_` — order matters, since escaping `%`/`_` first would
double-escape the backslashes just inserted), applied to the
`office_name` fallback lookup. Kept `ilike` rather than switching to an
exact match — the point of that fallback is still serving
close-but-imperfect typed input, not just wildcard safety. **Re-verified
live after the fix**, same four cases: bare `%` and bare `_` now
correctly resolve to no match; a real office name typed in the wrong
case still resolves correctly (fuzzy matching intact); a literal
backslash in the input neither crashes nor false-matches.

**Verdict: M2's end-to-end loop genuinely works**, not just "six screens
render" — a bank_staff session setting real stock (Unit 12) and an
anonymous, unauthenticated search (Unit 14) were tested through the same
real `bank_stock` row in the same session, including the stale-stock,
cross-region-isolation, and unverified-bank-exclusion edge cases. The one
known gap for M3 to inherit, not fix: real seed data has zero adjacent
regions today, so that specific chip won't appear until real geography
data is collected (flagged under "Blocking on real data" since Unit 02).

---

## M3 review outcome (Unit 32, 2026-08-03)

Per PRD.md §13, M3 is "the milestone that proves the product" — reviewed as
such: every item in Epic 3 and Epic 4, the donation-confirmation rows of
Epic 5, CLAUDE.md rules 1/3/5/6 by name, and a fresh live end-to-end run of
the full loop (not resting on prior units' own verification evidence).

**Scan:** 18 BLOCKERS + 18 WARNINGS, all individually cross-checked against
the false-positive catalogue this file already carries — zero new, zero
unresolved.

**Judgment checklist, all clean:** Rule 1 — `information_schema.
role_table_grants` queried directly for `requests`/`prospects`/
`notifications`/`push_subscriptions` (zero grants to `anon`/
`authenticated`), RLS confirmed enabled on all four via `pg_class.
relrowsecurity` directly, not inferred; every bank-portal mutation
re-resolves `bankId` from `getActingBankStaff()` and re-checks object
ownership via `getBankScopedProspect`, never trusting a client-supplied id
or a prior page-load read. Rule 3 — `revealDonorContact` read fresh, is
genuinely the single gate (bank: `accepted`/`screening`; admin: `accepted`
only), sits on top of (not instead of) B3's own query-level bank scoping;
`getRequestStatus` (S5) never selects a donor column at all. Rule 5 —
grepped the whole codebase for `last_donation_at`/`eligible_from`/
`group_verified_at`/`status: "donated"` writes: `confirmDonation` is the
only writer of any of them, and it only runs from a real bank_staff
session. Rule 6 — `proxy.ts`'s `PORTAL_ROLES` gates only `/donor`,
`/bank`, `/admin`; every `app/(public)/` route (including S4/S5) confirmed
reachable with zero auth in a fresh browser context.

**End-to-end loop re-verified fresh, live, for this review** (not reused
from Unit 28's own evidence) - real D1 registration → real S4 raise-request
→ real matching-engine invite → real D3 accept → real B3 (donor name+phone
correctly released) → real B4 confirm, with the DB checked directly
afterward: `donors.last_donation_at`/`group_verified_at` set,
`eligible_from` = +3 real calendar months, `requests.stage='resolved'`,
`prospects.status='donated'`. The loop genuinely works end to end.

**Two real gaps found, zero BLOCKERs - discussed with the project owner,
both deferred rather than fixed now (2026-08-03):**
- **Epic 4's "Stood-down donors receive a thank-you message" is not
  satisfied when the stand-down happens via someone *else's* action** (a
  requester's whole-request cancel, Unit 30's `cancelRequest` standing
  down another donor's live prospect). `sendPush` is only ever called from
  `createRequest`'s initial invite (grepped `lib/`, confirmed) - no push,
  no D2 banner, no D5 history entry acknowledges a `stood_down` outcome.
  The only existing thank-you (`donorPortal.pledge.cancelledMessage`) is
  shown solely on the donor's *own* D4 screen when *they* initiate the
  cancel (Unit 26) - it never fires for a stand-down someone else caused.
  Violates CLAUDE.md's own domain-vocabulary framing ("Stood down: always
  receives a warm thank-you - never silence"), not a numbered rule.
  **Decision: deferred, not fixed now** - real UI/notification design work
  (something like S5's passive-banner pattern, or a genuine push once a
  channel exists), out of scope for a review-gate unit whose own text says
  "produces findings, not new features." Flagged for whoever picks this up
  - no unit currently owns it in the 33-58 plan.
- **Epic 3's "Request with zero eligible donors notifies an admin
  immediately" is only half-built.** `createRequest` correctly sets
  `requests.zero_match_at` (Unit 22), but nothing anywhere in the codebase
  reads it (grepped, confirmed) - no admin is actually notified. The real
  consumer is Unit 44's escalation engine (M4) - this is Unit 22's own
  documented scope boundary, not an oversight, but the acceptance
  criterion itself isn't fully green until Unit 44 ships. **Decision:
  deferred, not fixed now** - building even a minimal notification here
  would need `admin_rota` (Unit 33, not built yet) and risks a throwaway
  implementation Unit 44 has to replace, reopening the "M3 =
  requester/donor timers only, Unit 44 = admin escalation" boundary
  `prompts/31-scheduled-jobs-core-loop.md`'s own scope-limit note already
  draws.

**Verdict: M3's core loop is real and proven end-to-end.** The two
deferred gaps are both real product-completeness items, not security
BLOCKERs, and both have a clear owner in the remaining build plan (a
future unit, or a design conversation before one is written) rather than
being silently dropped.

---

## Units 28-32 consistency audit (2026-08-03, user-requested, plus a live test run)

The same methodology as the Units 1-18 and 19-27 audits, run right after
Unit 32 closed out M3 - each of the five units' own prompt files re-read in
full, cross-referenced against this file's existing decision log, grepped
across every `prompts/*.md` for downstream assumptions, and the live DB/
codebase spot-checked directly rather than trusted from prior claims. Since
this closes out a full milestone, also ran the four milestone-level checks:
programmatic i18n key-parity diff, migration-files-vs-live-schema diff, full
`npm run test`, and a debug-marker/mock-scaffolding grep - plus a genuine
fresh live Playwright test run (not a repeat of Unit 32's own E2E, which
only exercised the donation-confirmation path).

**One real documentation gap found and fixed:** Unit 31's own "Read before
writing" line ("Unit 18's `sendPush` - reuse for the idle prompt") directly
contradicts what was actually built (a passive S5 banner, confirmed with
the project owner before writing any code - see Unit 31's own
implementation notes above). The decision itself was already documented
thoroughly, but the entry never explicitly named *this specific line* as
the one being deliberately not followed, which could read as an oversight
to a future reader who checks that line against the code. Fixed by adding
an explicit cross-reference to Unit 31's own entry above (append, not
rewrite) - Unit 31 is already built, so per the standing convention its own
prompt file text is left untouched; the correction lives here.

**Everything else, checked and confirmed consistent:**
- All 12 migration files on disk exactly match Supabase's own
  `schema_migrations` tracking, including Unit 31's `scheduled_jobs` -
  zero drift.
- Live `requests` schema matches every unit's documented claims exactly:
  `idle_prompted_at` present, `close_reason`/`stage` check constraints
  carry all five/five values, `zero_match_at`/`prospect_cancelled_at`
  both present from earlier units.
- i18n: 297 keys in both `en.ts` and `kn.ts` (up from 261 at the Units
  19-27 audit, reflecting Units 29-31's new `search.s5.*` keys) - zero
  gaps either direction, zero empty values. **One correction to the prior
  audit's own count:** that audit said "only two identical EN/KN values by
  design"; a full re-scan found **three** - the two previously named
  (`languageToggle.english`, the email-format placeholder) plus
  `languageToggle.kannada` ("ಕನ್ನಡ" - the Kannada word for Kannada, correct
  identically in both dictionaries by the same logic as `english`). Not a
  bug in either audit - the third pair was simply never called out by name
  before; corrected here for the record.
- `npm run test`: 34/34 pass.
- No leftover debug markers (`TODO`/`FIXME`/`console.log`) or mock
  scaffolding anywhere in `frontend/lib`/`frontend/components` - the one
  `MOCK_` string match (`RequestResponseFlow.tsx`) is a doc comment
  *describing* Unit 23's mock removal, not leftover mock code itself.
  Zero stray temp scripts or throwaway API routes anywhere in `frontend/`.
- Table grants and RLS re-verified by direct query (not re-trusted from
  Unit 32's own claims): zero `anon`/`authenticated` grants and RLS
  enabled on all of `requests`/`prospects`/`notifications`/
  `push_subscriptions`.
- Units 38/39/44's own prompt files re-read fresh: all three still
  accurately describe what Units 28-31 actually built (`revealDonorContact`
  as the one serialisation function, `cancelRequest` as the one close path,
  `standDownProspect` as the shared stand-down primitive, "keep stage
  vocabulary identical" matching `lib/serialise/stage.ts`'s existence) -
  no new staleness beyond the one Unit 31 note above.

**Fresh live test run (temporary Playwright scripts and one fixture donor,
all removed/cleaned up after), covering the paths Unit 32's own E2E didn't
touch:**
- A real S4-raised request with zero eligible donors was cancelled via S5
  with a reason, reaching the real cancelled confirmation.
- A real S4-raised request matched a real fixture donor through the actual
  matching engine (one real `invited` prospect - zero fixtures pre-seeded
  into the read). Backdating its `updated_at` past the real
  `app_settings`-configured 12h threshold and calling the real
  `/api/cron/idle-prompt` route produced the real S5 "still needed?"
  banner; clicking "Yes, still needed" cleared it live. Backdating past
  the real 48h expiry threshold and calling the real
  `/api/cron/expire-requests` route correctly auto-closed the request
  (`stage='closed'`, `close_reason='expired'`) and stood the real invited
  prospect down via the reused `cancelRequest` path - confirmed in the DB
  directly both times, not just from the UI.
- Existing features (`/`, `/search`, `/bank/login`, `/donor/register`)
  all re-confirmed still loading.
- Fixture donor, both requests, their prospects/notifications, and one
  stray test profile's `full_name` were all cleaned up afterward -
  confirmed back to the 0-row baseline across every state table.

**Verdict: Units 28-32 are consistent with each other, with the rest of
the 01-58 plan, and with the live system.** One documentation
cross-reference gap fixed (Unit 31's contradicted "Read before writing"
line), one minor prior-audit count corrected (three identical i18n pairs,
not two) - both cosmetic, neither a functional bug. No new functional gaps
beyond the two already logged in Unit 32's own review outcome above.

---

## Units 33-41 consistency audit + extensive live test (2026-08-03, user-requested)

Explicitly requested as "test everything extensively and conduct an audit"
- broader than the per-unit ahead-read, and (since M4 isn't complete yet -
the M4 review gate is Unit 45) run with the full milestone-level checklist
anyway rather than a lighter documentation-only pass, given the explicit
"test everything extensively" ask. Same methodology as the Units 1-18/
19-27/28-32 audits: each unit's own prompt file re-read in full,
cross-referenced against this file's existing decision log, grepped across
every `prompts/*.md` for downstream assumptions, live DB/codebase
spot-checked directly - plus the four milestone-level checks (i18n parity,
migration-vs-schema diff, full `npm run test`, debug-marker grep) and a
genuinely fresh, connected live Playwright run spanning A1 -> A2 -> A3
together in one session (not per-unit isolated evidence reused).

**Nothing stale found across the ahead-read.** Grepped every `prompts/*.md`
for `admin_rota`/`revealDonorContact`/`STANDDOWNABLE_STATUSES`/
`OPEN_STAGES` - no not-yet-built unit's text assumes a shape that
contradicts what was actually built. The internal renames from Unit 41
(`"admin"` -> `"admin_prospect"` caller value, `OPEN_STAGES`/
`STANDDOWNABLE_STATUSES` exported) are pure implementation detail invisible
at the prompt-file level, nothing to flag. **One nice external
cross-validation found, not previously noticed:** Unit 45's own
pre-written text ("rule 3 is now load-bearing across A2 and A3, both of
which reveal donor phone numbers; confirm there is exactly one
serialisation path across both") already anticipates exactly the design
Unit 41 landed on (extending `revealDonorContact` with a third channel,
never a second function) - the plan's own foresight matches what was
actually built, checked now rather than left for Unit 45 to discover.

**Live schema/grants (direct query, not inference):** `admin_rota`/
`audit_log` both have RLS enabled (`pg_class.relrowsecurity`), zero grants
to `anon`/`authenticated`, full `service_role` grants via the standing
default-privilege rule. All 10 `app_settings` rows present with the exact
documented values, including the new
`admin.donor_reveal_rate_limit_per_hour` (20).

**Rule 3, re-verified end to end, not just re-read:** grepped every call
site of `revealDonorContact` in the whole codebase - exactly one function
definition, exactly three call sites (`bank-prospects.ts`: `"bank"`,
`admin-requests.ts`: `"admin_prospect"`, `admin-donors.ts`:
`"admin_region_lookup"`), one per legitimate channel. A broader grep for
every `.phone` read anywhere in `lib`/`app`/`components` found nothing
that reaches a donor's phone outside this gate - every other match is
either a searcher's own phone (`raise-request.ts`'s `claims.phone`), a
bank's own public phone, or the gate's own already-checked output.

**i18n: 416 unique leaf keys in both `en.ts` and `kn.ts`** (programmatic
extraction, not spot-checked) - zero gaps either direction, zero empty
string values, up from 297 at the Units 28-32 audit (M4's new `adminAuth`/
`adminPortal` namespaces account for the difference).

**Migrations: all 14 files on disk exactly match Supabase's own
`schema_migrations` tracking** (`local` = `remote` for every one) - zero
drift, including the new Unit 33/41 migrations.

**`npm run lint` clean, `npm run test` 34/34** (unchanged from before M4 -
no new source files added new test coverage gaps, and none of M4's own
units added `.test.ts` files of their own, consistent with M4 being
integration/live-verified rather than unit-tested so far).

**Zero leftover debug markers or stale mock scaffolding** - no `TODO`/
`FIXME`/`console.log` anywhere in `lib`/`app`/`components`; the sole
`MOCK_` string match is `RequestResponseFlow.tsx`'s own doc comment
*describing* Unit 23's mock removal (already confirmed harmless at the
Units 28-32 audit, still harmless now) - not real leftover code. Zero
stray temp scripts anywhere in `frontend/` or the repo root.

**Fresh live test (real fixtures - one donor, one request, one accepted
prospect in the real Sirsi region, all removed after; real admin1 +
coordinator1 sessions, not fixtures pretending to be sessions), covering
the connected A1 -> A2 -> A3 flow in one continuous run rather than each
screen's own prior isolated evidence:**
- A1 showed the real fixture request with the correct real stage label.
- A2 auto-revealed the one accepted prospect's phone on load (confirming
  Unit 39's reveal-on-load design still works correctly after all of M4's
  later changes), took ownership for real, and scheduled for real
  (stage transitioned, confirmed in the UI).
- A3's region-scoped search found the *same* fixture donor, and a reveal
  tied to the *same* live request succeeded with a real reason.
- `audit_log` was checked directly via `psql`, not trusted from the UI:
  5 real rows total, 4 attributed to `admin1` (the initial A2 load, the
  post-take-ownership refresh, the post-schedule refresh - each a genuine
  re-reveal of the still-`accepted` prospect, correctly re-logged every
  time per PRD's "no exceptions" wording - and the A3 reveal, correctly
  carrying `reason` metadata instead of `prospectId`), 1 attributed to
  `coordinator1` (their own A2 visit, correctly logged under their own
  actor id, not admin1's).
- Coordinator1 confirmed to get the explicit no-region message on **both**
  A1 and A3, while still getting real district-wide access on A2 for the
  identical real request - the three screens' three different scoping
  rules (A1/A3 region-only, A2 district-wide) all verified together in
  one session, not asserted independently and assumed to compose
  correctly.
- Existing features (`/`, `/bank/login`, `/donor/register`, `/search`)
  all re-confirmed loading.

**One false alarm during this pass, run down to a confirmed non-issue, not
just dismissed:** an early check for A1 rendering a still-`evaluating_
prospects` request failed once. Investigated rather than assumed
transient - the request was genuinely present and correctly rendered
(confirmed via a raw `innerText` dump of the table), but `getByText(...)`
matched the stage *filter dropdown's own `<option>` element* (identical
text to the real table cell) rather than the visible row - the same class
of Playwright locator-ambiguity gotcha already documented multiple times
this session (options inside a closed `<select>` aren't reliably
"visible" to Playwright's own algorithm). Re-confirmed conclusively with a
`tbody`-scoped locator on a fresh fixture. Not a product bug - a
test-script locator specificity issue, run to ground rather than
hand-waved.

**Verdict: Units 33-41 are consistent with each other, with the rest of
the 01-58 plan, and with the live system.** Zero real gaps found. All
fixtures and temporary scripts removed afterward; `admin1`/
`coordinator1`'s `must_reset_password` restored to `true`; every state
table reconfirmed at its exact baseline (`regions` at 1, `profiles` at 6,
every other table at 0).

---

## M4 review outcome (Unit 45, 2026-08-03)

Per that unit's own task text: real `security-review` skill invoked against
the full Units 33-44 diff, CLAUDE.md rules 1/3/6 re-checked by name (not just
the mechanical scanner), all six Epic 6 acceptance criteria checked, and a
fresh live end-to-end run of M4's own core loop - not reused from the Units
33-41 audit's own evidence a few hours earlier the same day, re-run now per
this unit's explicit instruction.

**Scan:** 26 BLOCKERS + 22 WARNINGS - identical to Unit 44's own final count,
zero drift, zero new findings. Every finding individually re-checked against
this file's false-positive catalogue, including the two `[rule 2]` "primary
key taken from client input" blockers (`donors.ts:77` - the long-standing
`registerDonor` upsert false positive; `admin-requests.ts:499` - Unit 39's
own catalogued "local variable literally named `request`" false trigger,
re-confirmed by reading the line: `id: request.id` echoes back an
already-scoped DB row's own primary key, never a client-supplied id).

**Judgment checklist, all clean:**
- **Rule 1** - `getActingAdmin()` re-checks role server-side (not just
  trusting `proxy.ts`'s gate); every A1/A3/A4 read scopes off
  `caller.regionId`, never a client-supplied region; `getScopedRequestRow`'s
  `canActOnRegion()` re-check confirmed live with a crafted-URL test (a
  foreign-region request id gave admin1 the generic not-found message, and
  gave coordinator1 real access - the district-wide exception, scoped to A2
  only, confirmed still correctly *not* extended to A1/A3/A4). Zero
  `anon`/`authenticated` grants on `admin_rota`/`audit_log`/`notifications`,
  queried directly.
- **Rule 3** - `revealDonorContact` still has exactly 3 call sites
  codebase-wide (`bank-prospects.ts`: `"bank"`, `admin-requests.ts`:
  `"admin_prospect"`, `admin-donors.ts`: `"admin_region_lookup"`) - the
  single serialisation layer holds across both A2 (reveal-on-load) and A3
  (reveal-on-click), confirmed by grep, not just by reading the one file.
  Live-verified the raw HTML response (not just rendered text) contains zero
  phone digits before any A3 reveal.
- **Rule 5** - grepped every M4 file for `donated`/`last_donation_at`/
  `group_verified_at`: M4 only ever *reads* `prospects.status === "donated"`
  for A2's timeline display text: nothing in Units 33-44 writes any
  donation-confirmation field. `confirmDonation` (M3) remains the sole
  writer.
- **Rule 6** - `/search` confirmed live to return 200 with zero auth in a
  fresh browser context, no redirect - `proxy.ts`'s `PORTAL_ROLES` gate still
  only covers `/donor`/`/bank`/`/admin`.
- **Rule 7** - no diagnosis/hospital-record/doctor-name field anywhere in
  M4's migrations or types.

**Epic 6's six acceptance criteria, all confirmed fresh and live, in one
connected session (not per-item isolated evidence):** a real S4 request (O+)
matched a real fixture donor through the actual matching engine, a real D3
accept, then as `admin1`: **(1)** the request appeared only in admin1's own
Sirsi queue, never in a foreign region's; **(2)** A2's reveal-on-load and
A3's reveal-on-click each wrote their own real `audit_log` row, checked
directly via `psql` (four `view_contact` rows for the same still-accepted
prospect across four separate page loads - no dedup, per PRD's own "no
exceptions" wording, exactly as Unit 39 already established); **(3)** a
fresh, independently-fixtured, backdated request was escalated by the real
`escalate-no-prospect` route - and on a second such fixture, real automatic
`pg_cron` execution fired it *before* any manual call was made, writing a
real `notifications` row with `recipient_role='admin'`; **(4)** the "Needs an
owner" flag rendered correctly for the real unowned-with-an-accepted-
prospect fixture; **(5)** a real transfer reassigned both `region_id` and
`owner_admin_id` and wrote a `transfer_region` audit row with the correct
from/to/new-owner metadata, checked directly; **(6)** submitting close with
no reason selected was rejected client-side with no state change, then
closing with a real reason succeeded and wrote a `close_request` audit row.
Region isolation and the coordinator's A2-only district-wide exception were
both re-confirmed together in the same session (a foreign-region request:
not-found for admin1, real access for coordinator1), not assumed from the
Units 33-41 audit's own prior instance of the same check.

**Zero BLOCKERs, zero new findings, zero open questions raised.** All
fixtures (two donor-matched requests, a transfer-test fixture, an
isolation-test fixture, a second temporary region, two temporary
`admin_rota` rows, one flipped-then-reverted donor profile, all resulting
`audit_log`/`notifications` rows) removed afterward - confirmed back to the
exact documented baseline (0 rows on every state table, `bank_stock` still
its permanent 8, `profiles`/`regions`/`blood_banks` at 6/1/1).
`admin1`/`coordinator1` restored to `must_reset_password = true`. `npm run
lint` clean throughout.

**Verdict: M4 is clean and ships as-is.** No BLOCKERs, no deferred gaps
opened by this review (unlike M3's own review gate, which surfaced two real
product-completeness gaps) - the milestone's own escalation ladder, transfer
mechanism, and third phone-disclosure channel all independently re-verified
working, live, in a single connected session.

---

## Units 42-51 consistency audit + connected live test (2026-08-03, user-requested: "test it extensively... do audits and see if its consistent... and the pieces fit together")

Same methodology as the Units 1-18/19-27/28-32/33-41 audits, covering the
range since the last one (which stopped at 41): the tail of M4 (42-45) plus
everything built in M5 so far (46-51). Each unit's own prompt file re-read
in full (42-44 fresh, not previously read this session; 45-51 already fresh
from having just built them), cross-referenced against this file's existing
decision log, grepped across every `prompts/*.md` for downstream assumptions,
plus the four milestone-level checks and a genuinely fresh connected live
Playwright run - not a repeat of any single unit's own isolated evidence.

**Ahead-read: nothing stale found.** Grepped every `prompts/*.md` for
`is_blocked`/`assertNotBlocked`/`BlockedUserError`/`admin-banks`/
`getAuditLogEntries`/`admin_rota`/`recipient_role`/`donorPortal.settings`/
`reports.reason` - no not-yet-built unit (52-58) assumes a shape that
contradicts what was actually built. Units 52/53/54's own prompt files were
re-read fresh too and all still accurately describe the current state (Unit
52 correctly expects to reuse Unit 24's stand-down path and Unit 20's
donor schema; Unit 54 correctly scopes its review to Units 46-53).

**Live schema/grants (direct query, not inference):** `reports`/`admin_rota`/
`audit_log`/`notifications` all have RLS enabled, zero grants to
`anon`/`authenticated`. `profiles.is_blocked`, `blood_banks.is_verified`/
`is_active` all present as documented. All 18 migrations on disk match
Supabase's own `schema_migrations` tracking, zero drift.

**i18n: 488 unique leaf keys in both `en.ts` and `kn.ts`** (programmatic
extraction via a small Node script, not spot-checked - the diff script
itself needed one real fix mid-run: an initial byte-by-byte scan matched
value-string contents as if they were keys, producing pathological garbage
output; rewritten as a line-based parser before trusting its result) - zero
gaps either direction, zero empty string values, up from 416 at the Units
33-41 audit (M5's new `adminPortal.moderation`/`adminPortal.auditLog`/
`donorPortal.settings` namespaces account for the difference).

**`npm run lint` clean, `npm run test` 34/34, zero debug markers** (`TODO`/
`FIXME`/`console.log`) anywhere in `lib`/`app`/`components` - the sole
`MOCK_` string match is `RequestResponseFlow.tsx`'s own doc comment
describing Unit 23's mock removal, already confirmed harmless at every
prior audit, still harmless now.

**Fresh connected live test (temporary fixtures - a second bank + its own
real bank_staff Auth account, a flipped-then-reverted donor role/row on
test number `...01`, two real requests, one real report, all removed/
reverted after; real `admin1`/`coordinator1` sessions), spanning A4 → A2 →
A5 → A6 → D6 in one continuous session rather than each unit's own prior
isolated evidence:**
- A4: verifying then suspending a real fixture bank correctly, in the same
  session, added it to and then removed it from real public search
  results, *and* correctly blocked its own real bank_staff account from
  the bank portal - both consequences of `is_active`, reconfirmed together
  live rather than assumed from Unit 43's own prior claim.
- A real S4 request matched the fixture donor for real (one real
  `invited` prospect - correctly never `accepted`, since D3 was never
  driven in this pass) before any blocking.
- A2: took ownership and closed that same request for real, generating
  real `audit_log` rows.
- A5: blocked the fixture donor via a real report (inserted directly, since
  Unit 46 still has no submission entry point - the same already-documented
  open item, not rediscovered as new).
- A real second S4 request, identical blood group/region, *after* blocking,
  correctly matched **zero** donors (`zero_match_at` set, no `prospects`
  row) - re-confirming Unit 48's own matching-engine-exclusion claim fresh,
  not reused.
- A6 (Unit 50, real data): the real `close_request` row from this same
  session's own A2 action rendered correctly, attributed to the correct
  real actor - confirming Units 39/48's audit writes and Unit 50's own read
  path compose correctly together, not just individually.
- **D6 (Unit 51, built three units *after* Unit 48's donor-portal
  blocked-check): loaded normally for the not-yet-blocked donor, then
  correctly showed the blocked message instead of the settings form once
  blocked** - the single most important check in this pass, since Unit 51
  didn't exist when Unit 48 wrote that gate and could plausibly have ended
  up underneath a differently-shaped layout by accident. It didn't -
  confirmed, not assumed.
- Rule 6 (`/search` unauthenticated) reconfirmed live once more.

**Two INFO-level observations, not BLOCKERs, discussed here rather than
fixed unilaterally (per the same judgment-call discipline as the main
per-unit workflow, since this audit's own scope was explicitly broadened
by the user's "test everything extensively" ask):**
1. **A4's verify/suspend/policy-notes actions (`lib/db/admin-banks.ts`)
   never write to `audit_log`**, unlike `transfer_region`/`close_request`
   (Unit 39), `block_user` (Unit 48), or `view_contact` (Units 39/41). This
   is consistent with CLAUDE.md's own literal audit requirement ("every
   route exposing patient or donor *contact* data writes `audit_log`") and
   the same narrower reading the M4 review gate (Unit 45) already applied -
   bank metadata isn't donor/patient contact data - so this is not a
   regression against any standard this build has actually committed to.
   But it is a real asymmetry between "significant admin actions" (some
   audited, some not) worth Unit 54's own explicit attention, since Epic 7
   and §11's compliance requirements are exactly what that review gate
   checks.
2. **`lib/db/admin-rota.ts`'s `getRotaAdmin`/`getDistrictCoordinatorIds`
   (Unit 44) don't filter out a blocked admin/coordinator** - if one were
   ever blocked (Unit 48) while still a region's rota primary/secondary or
   holding the coordinator role, `escalation.ts` would still attempt to
   `sendPush` to them. Low real impact (the push itself carries no
   donor-contact data, and the blocked admin's own portal session is
   already rejected regardless via `assertNotBlocked`, so they couldn't
   act on it even if notified) - flagged as a minor operational
   inefficiency, not a security issue, for whoever next touches the
   escalation engine.

**Verdict: Units 42-51 are consistent with each other, with the rest of the
01-58 plan, and with the live system.** Zero real functional gaps found -
both observations above are judgment calls for a future unit/review gate to
weigh in on, not something silently wrong. All fixtures and temporary
scripts removed afterward; `admin1`/`coordinator1`'s `must_reset_password`
restored to `true`; every state table reconfirmed at its exact baseline
(`bank_stock` still its permanent 8, `profiles`/`regions`/`blood_banks` at
6/1/1).

---

## M5 review outcome (Unit 54, 2026-08-03)

Per that unit's own task text: real `security-review` skill invoked against
the full Units 46-53 diff, Epic 7's six items and every §11 compliance
requirement checked, CLAUDE.md rules 1/3/6 re-checked by name plus rule 2
(no client-supplied primary keys, given this milestone added account
deletion and blocking), and account deletion + blocking both verified fresh
live end to end - not reused from Units 48/52's own prior evidence, per this
gate's own explicit instruction.

**Scan:** 31 BLOCKERS + 23 WARNINGS - identical to Unit 53's own final
count, zero drift, zero new findings.

**Judgment checklist, all clean:**
- **Rule 1** - every `getActingX()` still defensively re-checks role/scope;
  A5 confirmed district-wide by deliberate decision (Unit 48), A6 gated
  coordinator-only in `proxy.ts` (Unit 50) - live-verified fresh that a
  non-coordinator admin is rejected server-side before `/admin/audit`'s
  own content ever renders. Table grants/RLS on `reports`/`admin_rota`/
  `audit_log` re-confirmed directly.
- **Rule 2** - `deleteDonorAccountAction` takes no client-supplied
  parameters at all; `blockReportedUserAction` takes a `reportId` but
  derives the actual write target (`report.subject_id`) from the report
  row itself, never from client input. Every table's `id` column defaults
  to `gen_random_uuid()` except `donors.id`, which is deliberately the
  caller's own server-resolved profile id (the established 1:1 pattern).
- **Rule 3** - `revealDonorContact` still has exactly 3 call sites
  codebase-wide, unchanged by all of M5.
- **Rule 6** - `/search`, `/privacy`, `/terms` all reconfirmed live to
  return 200 with zero auth in a fresh context.
- **Rule 5, rule 7, data integrity** - grepped every M5 file: zero
  references to any donation-confirmation field or forbidden medical-data
  field; `request.stage`/close-reason/one-open-request/one-active-pledge
  invariants all untouched by M5.

**Account deletion and blocking, both re-verified fresh, live, in this
session - not reused:** a real donor was matched, blocked via a real A5
report, excluded from a second real request, and rejected on their own next
portal visit; separately (after unblocking to continue testing), a real
accepted pledge was stood down by real account deletion
(`prospect_cancelled_at` set, stage reverted, `deleted_at` set, role reset
to `searcher`), with a fresh request afterward matching zero donors.

**One real WARNING found, discussed with the project owner, then fixed
(not left open) - the only finding of this review:** `deleteDonorAccount`
set `deleted_at` but never scrubbed `profiles.full_name`, satisfying
PRD.md §12 Epic 4's own narrower literal text ("removes the donor and
stands down any pledge") but not the generic security-review checklist's
broader "account deletion removes personal data; donation history is
anonymised, not deleted." **Resolved: the broader reading wins** - `profiles.
full_name` is now nulled as part of deletion, confirmed live that a bank/
admin's own historical view of an already-accepted prospect shows the real
name before deletion and no name at all after, without touching the
underlying `donors`/`prospects` rows Unit 55's future metrics still need.
`profiles.phone` was deliberately left alone after checking, not by
oversight - grepped every `lib/db/*.ts` file and confirmed nothing ever
looks up a profile *by* phone (every lookup is by session-derived `id`),
every real phone-reveal gate already keys off live `prospects.status` (a
deleted donor's own prospect is always in a terminal, non-`accepted` state
by the time deletion completes), and nulling it would introduce a real type
inconsistency (`Profile.phone` is typed `string`, not `string | null`) for
anyone who deletes their donor account and later returns as a plain
searcher via the same number.

**Verdict: M5 ships clean.** Zero BLOCKERs at any point in this review; the
one WARNING found was fixed the same session, not deferred - unlike M3's
own review gate (two genuine deferred product-completeness gaps) and more
like M4's (zero open items), M5 closes with nothing outstanding.

---

## M6 review outcome (Unit 58, 2026-08-03) - final milestone, last review gate in the build order

Per this unit's own task text: real `security-review` skill invoked against
the full Units 55-57 diff, CLAUDE.md rules 1/3/6 re-checked by name, all
eight PRD.md §14 metrics confirmed live and correctly computed, and -
since this closes out the entire build order - every item in this file's
own "PRD corrections needed" and "Open decisions" sections re-confirmed
still explicitly tracked, not silently dropped.

**Scan:** 32 BLOCKERS + 23 WARNINGS - identical to Unit 57's own final
count, zero drift, zero new findings once cross-checked against this
file's own false-positive catalogue.

**Judgment checklist, all clean:**
- **Rule 1** - the metrics dashboard reads exclusively through
  `lib/actions/admin-metrics.ts`'s `loadPlatformMetrics`
  (`"use server"` + `getActingAdmin()`), never a direct client query.
  Both new migration columns (`search_logs.stock_found`,
  `requests.owner_assigned_at`) confirmed via direct `psql` query to carry
  zero `anon`/`authenticated` grants, RLS still enabled on both tables.
  No client-supplied id anywhere in the metrics feature - there's no
  per-object action for region/object-scoping to apply to (a deliberate
  district-wide operational view, not a per-region screen like A1/A3/A4 -
  confirmed as intentional, not a scoping gap, by re-reading Unit 56's own
  design note).
- **Rule 3** - confirmed by direct grep across every M6 file: zero
  occurrences of `phone` anywhere in `lib/db/metrics.ts`, `lib/metrics/*`,
  `lib/actions/admin-metrics.ts`, or `AdminMetricsDashboard.tsx`. The
  `prospects` read in `getPlatformMetrics` doesn't even select `donor_id`.
  `revealDonorContact` still has exactly 3 call sites codebase-wide,
  unchanged by all of M6.
- **Rule 6** - `/search` reconfirmed live to return 200 with zero cookies
  in a fresh request; `stock_found` is computed and logged silently
  server-side, no gate/redirect/signup-wall added anywhere near it.
- **Rule 5, rule 7, data integrity** - grepped every M6 file: zero writes
  to any donation-confirmation field or forbidden medical field;
  `request.stage`/close-reason/one-open-request/one-active-pledge
  invariants all untouched by M6.
- **All eight §14 metrics confirmed present** in `PlatformMetrics`;
  registered-donor count confirmed absent everywhere by grep, not just by
  omission.
- **This file's own "PRD corrections needed" (6 items) and "Open
  decisions" (2 items) sections re-read in full** - both still explicitly
  open, nothing silently dropped across the whole build.

**One real, non-security finding from a fresh live end-to-end test (a real
`createRequest` → real matching → real `takeOwnership` → real
`acceptProspect` → real `markProspectArrived` → real `confirmDonation`
loop, run fresh for this review, not reused from Units 55/57's own fixture
evidence) - found, discussed with the project owner, then fixed, not left
open:** the very first run showed `medianRequestToFirstAcceptanceMinutes`
as slightly **negative** (-0.018 min). Root cause: `requests.created_at`
relied on the column's own Postgres `default now()`, while every other
timestamp in this codebase (including `prospects.responded_at`) is set
explicitly via Node's `new Date().toISOString()` in application code - a
real, if small, clock-source mismatch between the Docker Postgres
container and the host/Node process surfaced this as a real negative
delta, the first place in this codebase that ever diffs a
Postgres-sourced timestamp against a Node-sourced one. **Not a security
issue, and this unit's own task text says it "produces findings, not new
features"** - flagged to the project owner rather than silently patched.
**Resolved: fix now.** `lib/db/requests.ts`'s `createRequest` now sets
both `created_at` and `updated_at` explicitly via the same
`new Date().toISOString()` call already used everywhere else in this
function, and `prospects.invited_at` is set the same way on the same
insert for full consistency (not strictly required by any current metric,
but the same root cause, same fix, same file). Re-ran the identical live
end-to-end test after the fix: `medianRequestToFirstAcceptanceMinutes`
correctly read a small **positive** value (0.0019 min) instead. `npm run
lint` clean, `npm run test` 58/58 unchanged, `npm run security-scan`
unchanged 32/23 after the fix. All fixtures and the temporary API route
used for both the pre-fix and post-fix runs removed afterward; existing
features smoke-checked (`/`, `/search`, `/bank/login`, `/donor/register`,
`/admin/login`, `/admin/metrics` [307 redirect, correctly gated],
`/privacy`, `/terms` all still load correctly); baseline reconfirmed at 0
rows everywhere, `profiles` at 6.

**Verdict: M6 ships clean.** Zero BLOCKERs at any point in this review;
the one real finding (a clock-source correctness issue, not a security
rule violation) was found via a genuinely fresh live test and fixed the
same session, not deferred - matching M4's and M5's own "nothing
outstanding" precedent rather than M3's two deferred gaps. **This closes
the full 58-unit build order.** The six "PRD corrections needed" items and
two "Open decisions" items remain the only standing, explicitly-tracked
work not owned by any unit in this build - see those sections at the top
of this file.

---

## Full-build consistency audit (2026-08-03, user-requested, after Unit 58 - "run a final full-build consistency audit")

The first audit to cover the entire 58-unit build in one pass, not an
incremental range - prior audits covered 1-18, 19-27, 28-32, 33-41, 42-51
separately; this one closes the gap (52-58, never previously audited as
their own pass) and re-runs every milestone-level check at full-build
scope for the first time, rather than accumulated per-range counts.

**Per-unit consistency check, Units 52-58** (52/53/54 re-read fresh - not
previously read in full this session; 55-58 already fresh from having
just built/reviewed them): each unit's own prompt file re-read in full,
cross-referenced against this file's existing decision log for that unit,
grepped for any downstream reference - none possible for 55-58 (nothing
is numbered beyond them) and none found for 52-54 either. One thing
double-checked and found **already correctly documented, not a gap**:
Unit 52's own task text requires "notify the owning admin the same way
other stand-downs do" on account deletion - traced through
`deleteDonorAccount` → `cancelPledge` → `standDownProspect` +
`requests.prospect_cancelled_at`, and confirmed this is exactly what
Unit 52's own README entry already says ("SPEC.md D10's... already
exactly what `cancelPledge` does... needing zero new notification code")
- `prospect_cancelled_at` is read passively by A2's own request timeline
(`admin-requests.ts:399`), the same passive (not push) mechanism every
other stand-down path in this codebase already uses (`cancelRequest`,
Unit 30, has no push either) - "notify the same way" was correctly read
as "the same passive way," not a broken promise. Units 53/54 both
independently re-verified accurate: the shared root-layout footer still
reaches every portal (confirmed via the actual `app/layout.tsx`, not
assumed), the grievance contact is still the documented `PLACEHOLDER`,
`CONSENT_VERSION` is still `"1"`.

**Whole-build i18n key-parity check (first-ever full-build-scope run, not
incremental)**: a fresh line-based Node script (not the pathological
character-scan approach from an earlier session) diffed every leaf string
key in `en.ts`'s value block against `kn.ts` in full - **523/523 keys,
zero missing either direction, zero empty values.** Five identical
EN/KN pairs found, all legitimate (not gaps): `languageToggle.english`/
`languageToggle.kannada` (a language names itself in its own script even
in the other locale, by design), `bankAuth.emailPlaceholder`/
`adminAuth.emailPlaceholder` (email-format examples, not prose),
`adminPortal.headerWithRegion` (a bare `{role} · {region}` template with
no translatable content of its own).

**Migration-files-vs-live-schema diff**: 19 files on disk, 19 rows in
`supabase_migrations.schema_migrations` (up from 18 at the last full
count, Unit 55's `20260803234500_metrics_signals.sql`) - exact match,
zero drift.

**Full `npm run test`**: 58/58 passing (up from 34 at the last full-build
count, the 24 new `lib/metrics/*` tests from Unit 55).

**Leftover debug-marker/mock-scaffolding grep** (`TODO`/`FIXME`/
`console.log`/`MOCK_`/`debugger` across all of `app/`/`lib/`/
`components/`): one hit, a harmless doc-comment in
`RequestResponseFlow.tsx` narrating Unit 23's own mock constant's removal
("Unit 23's `MOCK_REQUEST`... are both gone entirely") - not actual
leftover code, confirmed by reading the surrounding comment. No stray
temporary API routes or `verify-*.mjs`/`fix-*.mjs` scripts found anywhere
in the repo.

**Two whole-build-scope non-negotiable-rule re-confirmations, not
previously checked at this scope in one pass:**
- **Rule 3**: `revealDonorContact` still has exactly the same 3 call
  sites project-wide (`admin-donors.ts`, `admin-requests.ts`,
  `bank-prospects.ts`) - unchanged since Unit 41, re-confirmed after all
  58 units.
- **PRD.md §14's "not a success metric"**: grepped every donor-count-
  shaped identifier across the whole app, not just Unit 55's own module -
  the only real matches are A1's own per-request `notifiedCountLabel`/
  `acceptedCountLabel` (a specific request's own prospect counts, an
  explicit PRD field, not a platform-wide total) and privacy-page prose
  describing what a registered donor can do. No screen anywhere in the
  entire built app surfaces a total registered-donor count.

DB baseline reconfirmed clean throughout and after this audit (0 rows
everywhere except the permanent 6 profiles/1 region/1 bank), `admin1`'s
`must_reset_password` correctly at `true`. **Zero new gaps found** beyond
the one already-resolved Unit 52 documentation double-check above, which
turned out not to be a gap at all.

---

## Post-M6 work (2026-08-04 through 2026-08-09) — reconstructed, not a live log

**Read this note before trusting anything below as precisely as the entries
above it.** Everything above this point (M1 review through the full-build
audit) was written in the same session as the work it describes - a real,
contemporaneous build log. Everything below happened across several later
sessions and was **never logged into this file until 2026-08-09**, when
the project owner pointed out that the docs (this file included) had
drifted from the real codebase and asked for a catch-up pass. This section
is reconstructed from session memory afterward, not written live - treat
it as a orientation summary, not a precise record. **For the authoritative
current state of anything mentioned here, check `CLAUDE.md` and
`FUTURE-WORK.md` directly, not this summary.** Also worth knowing: this
repo's git history stops at Unit 07 (`git log`, last real commit
2026-07-31) - none of Units 08-58 or anything below were ever committed.
Everything past that point exists only as uncommitted working-directory
files. No rollback point, no diff history, for the large majority of this
project's actual code.

**Roughly chronological, real features/fixes, not exhaustive:**

- **Platform manager portal** (`app/ops-control/`, 2026-08-04) - a fifth
  account tier that creates real regional admin accounts and PIN
  codes/regions. One fixed operator, deliberately not linked from any nav.
  Also the point where a UI/UX redesign pass happened. See `CLAUDE.md`'s
  Conventions section for the full current writeup.
- **Admin-assign-to-bank redesign** (2026-08-06) - `prospects.assigned_at`
  became the real gate for when a bank can see a donor's contact (B3/B4),
  replacing an earlier, looser interpretation that leaked contact info too
  early. See `CLAUDE.md` rule 3's own detailed writeup.
- **Unit 59: admin case ownership + "My Cases"** (2026-08-07) - a "Handle"
  button and exclusive per-case action lock, plus a fix for a real A3
  donor-lookup region-scoping bug, a table redesign, and a PIN-code filter.
  `prompts/59-admin-case-ownership-and-my-cases.md` has the original plan;
  no separate outcome write-up exists here.
- **Self-service password reset** (2026-08-07) - see the dedicated section
  in `FUTURE-WORK.md`, including the 2026-08-09 `amr`-check security fix.
- **D4 appointment time** - explicitly scoped out by the project owner, not
  built. See `FUTURE-WORK.md`.
- **Real geography + blood bank data** (2026-08-09) - see `FUTURE-WORK.md`'s
  dedicated section. Also updated the "Blocking on real data" section
  above in this same file.
- **Real SMTP (Brevo)** (2026-08-09) - see `FUTURE-WORK.md`. SMS/OTP
  provider explored (Twilio blocked on trial for India, Vonage/Fast2SMS/
  MSG91 researched) but still undecided.
- **10 more local test-OTP numbers added** (2026-08-09) -
  `supabase/config.toml`'s `[auth.sms.test_otp]` now has 12 total
  (`+919900000001` through `...012`), all still OTP `123456`.
- **Persistent phone-OTP sessions + two real bugs found fixing it**
  (2026-08-09) - see `CLAUDE.md`'s Rule 1 clarification for the full
  writeup (the stuck-forever risk that got a defensive timeout anyway, and
  the broken phone-format stripping that got fixed to `slice(-10)`).
- **Donor portal header + raise-a-request session header** (2026-08-09) -
  donor portal header now shows the donor's name (matches bank portal's
  existing name-left/sign-out-right convention); raise-a-request flow now
  shows "Signed in as {phone}" + a working sign-out on every step past
  OTP verification - real bug found and fixed along the way (the sign-out
  button's `router.push` to its own route was a same-route no-op that
  didn't reset visible state; fixed with a hard navigation).
- **A full adversarial test pass on the password-reset flow** (2026-08-09)
  - platform_manager exclusion, cross-session PKCE code isolation,
    single-use code enforcement, timing-based enumeration (a real,
    unfixed-in-app-code finding - inherent to Supabase's synchronous
    SMTP-send architecture), malicious input handling, open-redirect
    allow-list, password validation edge cases, double-submit protection.
    All confirmed live, not just read from code. Results not written up
    as a dedicated entry here - ask the project owner or check chat
    history from that session if the specifics matter.
- **Final pre-launch security review** - started 2026-08-09, **not
  finished** - see `prompts/60-final-security-review.md` for the handoff
  and `prompts/60-final-security-scan-raw-output.txt` for the last
  mechanical scan run. Do that review before treating this codebase as
  launch-ready; nothing in this catch-up section is a substitute for it.

---

## M1 — Foundations
- [ ] 01 — Project scaffold
- [ ] 02 — Schema + seed geography
- [ ] 03 — Phone OTP auth UI (public/donor)
- [ ] 04 — Phone OTP auth wiring
- [ ] 05 — Role-based route middleware
- [ ] 06 — Review gate: M1

## M2 — Bank portal + searcher tier 1 (first shippable point)
- [x] 07 — Bank stock/search schema + shared types
- [x] 08 — Bank auth UI (email + password)
- [x] 09 — Bank auth wiring
- [x] 10 — Bank portal shell
- [x] 11 — Bank portal screens (hardcoded)
- [x] 12 — Wire bank portal to real data
- [x] 13 — Searcher shell + S1/S2 screens (hardcoded)
- [x] 14 — Wire searcher (S1+S2) to real data
- [x] 15 — Review gate: M2

## M3 — Requests, donor portal, matching, web push (the core loop)
- [x] 16 — Requests + prospects schema
- [x] 17 — Matching engine
- [x] 18 — Web push infrastructure
- [x] 19 — Donor portal shell + D1 registration UI
- [x] 20 — Donor registration wiring
- [x] 21 — S4 raise-request UI
- [x] 22 — Wire S4 to real data
- [x] 23 — D2 + D3 UI (hardcoded)
- [x] 24 — Wire D2 + D3 to real data
- [x] 25 — D4 + D5 UI (hardcoded)
- [x] 26 — Wire D4 + D5 to real data
- [x] 27 — B3 + B4 UI — donation confirmation (hardcoded)
- [x] 28 — Wire B3 + B4 to real data — donation confirmation authority
- [x] 29 — S5 request status UI (hardcoded)
- [x] 30 — Wire S5 to real data + cancel action
- [x] 31 — Scheduled jobs: notification budget, idle prompt, expiry
- [x] 32 — Review gate: M3

## M4 — Admin portal, escalation engine (coordination layer)
- [x] 33 — Admin operations schema
- [x] 34 — Admin auth UI (email + password)
- [x] 35 — Admin auth wiring
- [x] 36 — Admin portal shell + A1 queue UI (hardcoded)
- [x] 37 — Wire A1 to real data
- [x] 38 — A2 request detail UI (hardcoded)
- [x] 39 — Wire A2 to real data
- [x] 40 — A3 donor lookup UI (hardcoded)
- [x] 41 — Wire A3 to real data + audit on reveal
- [x] 42 — A4 bank management UI (hardcoded)
- [x] 43 — Wire A4 to real data
- [x] 44 — Escalation engine
- [x] 45 — Review gate: M4

## M5 — Audit, moderation, consent, deletion (compliance)
- [x] 46 — Reports schema
- [x] 47 — A5 moderation UI (hardcoded)
- [x] 48 — Wire A5 to real data
- [x] 49 — A6 audit log UI (hardcoded)
- [x] 50 — Wire A6 to real data (coordinator-only)
- [x] 51 — D6 donor settings UI (hardcoded)
- [x] 52 — Wire D6 to real data (incl. account deletion)
- [x] 53 — Privacy notice + consent pages, consent capture hardening
- [x] 54 — Review gate: M5

## M6 — Metrics dashboard (operational visibility)
- [x] 55 — Metrics aggregation queries
- [x] 56 — Metrics dashboard UI (hardcoded)
- [x] 57 — Wire metrics dashboard to real data
- [x] 58 — Review gate: M6
