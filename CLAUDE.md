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
npm run db:migrate     # apply migrations
npm run db:seed        # regions, pincodes, adjacency
```

---

## Non-negotiable rules

Violating any of these is a bug regardless of whether the feature works.

1. **The browser never talks to the database.** All access goes through server routes or server actions. The service role key stays in server-only env. RLS is defence in depth, never the primary access control.
2. **Never accept a client-supplied primary key.** All IDs are UUIDs generated server-side. (The previous prototype allowed client IDs and got stored XSS through it.)
3. **Donor phone numbers pass through exactly one serialisation layer.** Never re-implement the check per endpoint. A number is released only to: an admin in that donor's region with an `accepted` prospect, or the bank that donor is scheduled at. Never to a requester before acceptance, never in any search response.
4. **Never fetch a whole table into the browser.** Every list endpoint is server-filtered and paginated.
5. **Only a blood bank confirms a donation.** No self-reporting anywhere. Donation confirmation is what resets a donor's eligibility clock, so it must be trustworthy.
6. **Search stays public.** Never put auth, a signup wall, or email capture in front of blood bank search. Only *raising a request* requires OTP.
7. **Never store diagnosis, hospital record numbers, or doctor names.** Blood group, units, contact phone, patient first name only.
8. **Every user-facing string exists in both English and Kannada.** No hardcoded text in components.
9. **No new infrastructure.** No Redis, no queue service, no search engine. Scheduled work uses `pg_cron`/`pg-boss`. This is maintained by volunteers — every moving part is a liability.
10. **Write the migration before the UI** for each milestone.

### Rule 1 clarification — Auth service vs data access

Supabase Auth (GoTrue) calls MAY run in the browser: `signInWithOtp`, `verifyOtp`, `signOut`, `getSession`, `onAuthStateChange`. The publishable key is public by design and interactive OTP entry requires browser participation.

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
lib/db/              server-only queries
lib/serialise/       output shaping — the phone number rule lives here
lib/i18n/            en + kn
supabase/migrations/ timestamped, never edited after merge
```

- Server code imports from `lib/db`. Client components never import it.
- One migration per milestone. Never edit a merged migration; add a new one.
- Tables and columns `snake_case`; TypeScript `camelCase`; map at the boundary.

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