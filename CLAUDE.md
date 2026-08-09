# CLAUDE.md

Operating rules for this repository. Read fully before the first change in any session.

---

## Project

Blood donation platform for the Lions Club, Uttara Kannada district. Connects people who need blood with blood banks that have it and donors who can supply it, coordinated by regional volunteer admins.

**Core model:** software matches and notifies; humans coordinate. The automated part ends when a donor raises their hand. Everything after that is a named regional admin working the phone.

This is a real product handling real people's contact data. Errors here mean a family fails to find blood, or a donor's phone number ends up somewhere it shouldn't.

## Reference documents

| File | Contains |
|---|---|
| `PRD.md` | Data model, screens, permissions, acceptance criteria, build order |
| `SPEC.md` | Event timelines, edge cases handled, edge cases deliberately ignored |

`PRD.md` is authoritative. **If a request contradicts it, stop and say so — do not silently diverge.** If something is genuinely undecided, mark it `[DECIDE]` and ask rather than guessing.

---

## Stack

Next.js (App Router) · TypeScript · Tailwind · Postgres (Supabase) · Vercel · PWA with Web Push

## Commands

```bash
npm run dev            # local dev
npm run build          # production build
npm run lint           # eslint + tsc --noEmit
npm run test           # vitest
npm run db:migrate       # apply migrations
npm run db:seed          # regions, pincodes, adjacency
npm run db:seed:accounts # test bank_staff/admin accounts (local only)
npm run security-scan    # mechanical half of the security-review skill (see below)
```

`npm run security-scan` runs `scripts/security-scan.py`, the standard-library-only mechanical scanner Claude Code's `security-review` skill uses (Step 1 of it). It has no Claude-specific dependencies, so any tool can run it — but it is deliberately noisy and does not know about this file's Rule 1 clarification: every `createClient()` call inside a `"use client"` component is flagged as a BLOCKER, even when the very next line is `signInWithOtp`/`signInWithPassword`/`updateUser`/`signOut` (all Auth-service calls, browser-safe by the clarification above). Confirm what method is actually called before treating one of these as real. The judgment checklist the script *can't* run (donor phone exposure, region scoping, donation-confirmation authority, etc.) still has to be done by reading the diff — see `prompts/README.md`'s security-review notes for the full checklist text if the `security-review` skill isn't available in your tool.

### Git history — read this before trusting `git log`/`git blame` on anything before 2026-08-09

This repo's real, incremental commit history stops at `Unit 07` (2026-07-31) — nothing from Unit 08 onward was ever committed as it was built. **Every commit from 2026-08-01 through 2026-08-09 was made retroactively, in one batch, on 2026-08-09**, reconstructed by grouping the then-uncommitted working-tree files by filesystem modification date, not by real original commit boundaries. Author/committer dates were set to match each date cluster so `git log --date=short` reads sensibly, but treat this range as a best-effort reconstruction, not ground truth: a file's presence in, say, the `2026-08-02` commit means its *last edit* happened to land on that date, not that it was necessarily written or reviewed as part of whatever else is in that same commit. Each of those commit messages says "retroactive commit" for exactly this reason — don't cite one as evidence of what shipped together on a given day without checking `prompts/README.md`'s own dated write-ups first, which are the real record where they exist. Commits from 2026-08-09 onward are real, contemporaneous commits again.

---

## Non-negotiable rules

Violating any of these is a bug regardless of whether the feature works.

1. **The browser never talks to the database.** All access goes through server routes or server actions. The service role key stays in server-only env. RLS is defence in depth, never the primary access control.
2. **Never accept a client-supplied primary key.** All IDs are UUIDs generated server-side. (The previous prototype allowed client IDs and got stored XSS through it.)
3. **Donor phone numbers pass through exactly one serialisation layer.** Never re-implement the check per endpoint. A number is released only to: an admin in that donor's region with an `accepted` prospect (A2); the bank that donor is scheduled at (B3/B4); or an admin/coordinator in that donor's region performing A3's donor-lookup reveal, tied to a specific open request in that same region with a required, non-empty reason, rate-limited per admin per hour, and logged like every other reveal (added Unit 41 — A3's own PRD text has no prospect relationship to gate on, so this is a genuine third channel, not a loophole; confirmed with the project owner before implementing). Never to a requester before acceptance. Search results themselves never contain a phone number, revealed or not — reveal is always a separate, individually logged action on one donor at a time.

   **"Scheduled at" (B3/B4), concretely (added 2026-08-06):** this used to just mean "`prospects.status` is `accepted`/`screening`" — which meant a bank saw a donor's contact the instant that donor accepted, with no admin action in between at all, despite this rule's own wording. The real mechanism now is `prospects.assigned_at` (migration `20260806090000_prospects_assigned_at.sql`), set by an admin's explicit "Assign to bank" action (A1/A2) after they've called and pre-screened the donor. `lib/serialise/donor-contact.ts`'s `bank` channel and `lib/db/bank-prospects.ts`'s own query both require `assigned_at is not null` *in addition to* the status check, not instead of it — an accepted-but-unassigned donor is invisible to the bank, full stop.

   **"In that donor's region" (A3), concretely (widened 2026-08-07):** this now means the donor's home region OR a region they've listed as a secondary "also available to donate in" pincode (`donor_availability_pincodes`, added 2026-08-05) — kept deliberately in lockstep with the matching engine's own identical definition (`findEligibleDonors`) and with A3's own search list (`searchAdminDonors`), so a donor visible in an admin's donor-lookup list is never one whose Reveal action then rejects them. Both `searchAdminDonors` and `revealDonorContactForLookup` (`lib/db/admin-donors.ts`) check home region first, then this secondary table, never a combined `.or()` filter — this codebase's established two-sequential-queries preference.
4. **Never fetch a whole table into the browser.** Every list endpoint is server-filtered and paginated.
5. **Only a blood bank confirms a donation.** No self-reporting anywhere. Donation confirmation is what resets a donor's eligibility clock, so it must be trustworthy.
6. **Search stays public.** Never put auth, a signup wall, or email capture in front of blood bank search. Only *raising a request* requires OTP.
7. **Never store diagnosis, hospital record numbers, or doctor names.** Blood group, units, contact phone, patient first name only.
8. **Every user-facing string exists in both English and Kannada.** No hardcoded text in components.
9. **No new infrastructure.** No Redis, no queue service, no search engine. Scheduled work uses `pg_cron`/`pg-boss`. This is maintained by volunteers — every moving part is a liability.
10. **Write the migration before the UI** for each milestone.

### Rule 1 clarification — Auth service vs data access

Supabase Auth (GoTrue) calls MAY run in the browser: `signInWithOtp`, `verifyOtp`, `signInWithPassword`, `updateUser`, `refreshSession`, `signOut`, `getSession`, `getClaims`, `onAuthStateChange`, `resetPasswordForEmail`. The publishable key is public by design and interactive OTP/password entry requires browser participation. (`getClaims` added to this list 2026-08-09 — same Auth-only class as `getSession`, just reads/verifies the current session's JWT, never touches PostgREST; used client-side by `PhoneOtpFlow.tsx` and was already the established pattern server-side in `checkRecoveryEligibility`/`getVerifiedRequester` before this.)

**`resetPasswordForEmail` (added 2026-08-07):** self-service "Forgot password?" for `bank_staff`/`admin`/`coordinator` accounts — `components/auth/ForgotPasswordRequestForm.tsx` + `ForgotPasswordConfirmForm.tsx`, alongside (not replacing) the existing admin-mediated reset. Deliberately excludes `platform_manager` — that account still has no self-service reset path at all, on purpose (see Conventions below); `lib/actions/forgot-password.ts`'s `checkRecoveryEligibility` enforces this server-side, checked before the new-password form ever renders, not just a hidden UI control.

**`checkRecoveryEligibility`'s `amr` check (added 2026-08-09, real bug found live testing, not a hypothetical hardening):** the role check alone let *any* already-authenticated `bank_staff`/`admin`/`coordinator` session — an ordinary login, no recovery link involved — reach the "set new password" form with zero re-verification, because this app has no other change-password screen once past first login. A hijacked/stolen session could permanently lock out the real owner. Fix reads the JWT's `amr` (Authentication Method References) claim and requires a `recovery` entry, not just an eligible role — confirmed live that this claim survives a token refresh unchanged (so it doesn't spuriously expire mid-form) and that a plain login session's `amr` is `password` instead, correctly rejected. Don't remove this thinking it's redundant with the role check; it isn't.

**Persistent phone-OTP sessions (added 2026-08-09):** `PhoneOtpFlow.tsx` (shared by `/donor/register` and the raise-a-request flow) now checks for an existing valid phone-verified session on mount and skips straight to `onVerified(phone, { resumed: true })` if one exists, instead of always starting at phone entry. Before this, every visit — including pressing back, or revisiting after already registering — forced a fresh OTP, which is both bad UX and an avoidable SMS-provider hit. The `resumed` flag matters: `app/donor/register/page.tsx` uses it to skip the push-notification opt-in on a resumed session specifically, because `lib/push/subscribe.ts` requires a genuine user gesture behind that prompt (most browsers silently ignore a permission request fired from a page-load effect) — don't wire push registration to fire on the resumed path. `components/search/SignOutButton.tsx` and `components/donor/SignOutButton.tsx` are the only way back to a fresh phone-entry screen now; the search one deliberately uses a hard `window.location.href` navigation, not `router.push`, because it redirects to the same route it's rendered on and a same-route client-side push doesn't remount/reset component state in the App Router (found live, not theoretical).

**Phone number format, worth knowing before touching any of the above:** Supabase's phone JWT claim (`claims.phone`, read via `getClaims()`) strips the leading `+` — it's `"919900000006"`, not `"+919900000006"`, unlike the `COUNTRY_CODE = "+91"` constant used elsewhere in `PhoneOtpFlow.tsx`. A `startsWith(COUNTRY_CODE)` check against `claims.phone` will silently never match. `profiles.phone` is stored the same bare way (`919900000001`, no `+`). Confirmed live 2026-08-09 after this exact assumption broke the persistent-session feature's country-code-stripping logic (fixed with `slice(-10)` instead of a prefix check) — don't re-derive this the hard way again.

Everything else stays server-only: `.from()`, `.rpc()`, `.storage`, and any query touching application data. The service role key never reaches the browser under any circumstance.

The line is the service, not the SDK. Auth API = allowed. PostgREST and Storage = server-only.

---

## Domain vocabulary

Use these terms exactly. Conflating them causes real bugs.

| Term | Meaning |
|---|---|
| **Region** | Named group of PIN codes. Must contain ≥1 blood bank. Unit of admin ownership. |
| **PIN code** | User input. Resolves to exactly one region. Never used for distance maths. |
| **Request** | One patient's need. Has a `stage` and an owner. Created only by an explicit action — **never as a side effect of searching**. |
| **Prospect** | One donor's involvement in one request. Has a `status`. This is where the real state lives. |
| **Donation** | Blood actually collected, confirmed by a bank. |
| **Donor** | A registered person. Becomes a *prospect* when they accept an invitation. Is not a "donor for this request" until blood is collected. |
| **Shortage** | A bank asking for donors of a group, independent of any request. |

A donor who taps "I can donate" is a **prospect**, not a donor. A meaningful share fail screening — low haemoglobin is very common. Never write code that treats acceptance as fulfilment.

---

## Data model invariants

- `request.stage` is **derived from its prospects**, not set independently. Never write both in one place.
- Stages: `finding_prospects | evaluating_prospects | scheduled | resolved | closed`
- Prospect statuses: `invited | accepted | screening | donated | rejected | no_show | stood_down`
- `closed` **always requires a reason**: `found_elsewhere | no_longer_needed | no_donor_found | expired | abusive`
- One open request per verified phone number.
- One active prospect per donor.
- A rejected prospect never penalises the donor. A `no_show` does.
- The blood group compatibility table in the codebase is **red cells only**. Plasma compatibility is inverted. If plasma is ever added, write a second table — do not extend the existing one.

## Timing parameters

All escalation, expiry and notification-cap values live in the `app_settings` table, not in code. They are tuned by non-developers. Never hardcode them.

---

## Conventions

```
app/(public)/        searcher — no auth
app/donor/           phone OTP
app/bank/            email + password, admin-created
app/admin/           email + password, super-admin-created
app/ops-control/     email + password, one fixed account, bootstrap-script-created — not linked from any nav; see below
lib/db/              server-only queries
lib/serialise/       output shaping — the phone number rule lives here
lib/i18n/            en + kn
supabase/migrations/ timestamped, never edited after merge
```

- Server code imports from `lib/db`. Client components never import it.
- One migration per milestone. Never edit a merged migration; add a new one.
- Tables and columns `snake_case`; TypeScript `camelCase`; map at the boundary.

### Platform manager (`app/ops-control/`)

A fifth account tier, `role = 'platform_manager'`, added to close the account-creation gap this file's own Conventions table used to leave undecided (see `prompts/README.md` "Open decisions #1"). Creates regions, PIN codes, and regional admin accounts (email + temp password, forced reset on first login — the same mechanism bank staff already use); resets an existing admin's password. Exactly one account, ever — created once via `npm run db:create-platform-manager` (`frontend/scripts/create-platform-manager.mjs`), never through any in-app flow. `/ops-control` is not linked from any nav or any other portal; the real protection is the same server-verified-JWT role gate every other portal uses (`lib/supabase/proxy.ts`), not the route name.

**Deliberate exception to Rule 8 (i18n):** `app/ops-control/*` and `components/platform/*`/`components/auth/PlatformManagerLoginFlow.tsx`/`PlatformManagerForcedPasswordResetForm.tsx` use hardcoded English strings, not `lib/i18n`. Approved by the project owner — this portal has exactly one operator, ever. Every other portal keeps full en/kn parity; do not extend this exception anywhere else without asking first.

Self-service "forgot password" shipped 2026-08-07 for `bank_staff`/`admin`/`coordinator` (see Rule 1 clarification above) — the platform manager's own credential recovery is still deliberately out-of-band, on purpose, not a gap. Region-adjacency management and blood-bank onboarding remain related, explicitly deferred gaps — see `FUTURE-WORK.md`.

---

## Out of scope

Do not build these. Each is a deliberate decision recorded in `SPEC.md`. If a task seems to require one, stop and ask.

Automatic widening to adjacent regions · `donor_on_the_way` tracking · GPS, maps, distance sorting · in-app chat · automated eligibility screening · e-RaktKosh integration · platelets and plasma · donor reliability ranking · masked calling · native apps · camps management · payments or incentives of any kind · offline mode

---

## Before finishing any task

- [ ] `npm run lint` passes
- [ ] No client component touches the DB or the service role key
- [ ] No new endpoint can return a donor phone number outside rule 3
- [ ] Any new user-facing string has both `en` and `kn`
- [ ] Any new list endpoint is paginated
- [ ] Migration written and applied, if the schema changed
- [ ] Nothing added to the out-of-scope list above