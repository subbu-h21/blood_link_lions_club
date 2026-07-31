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

- `search_logs` table (Unit 07): PRD.md §6.2 requires "every search logged"
  but §4 never defines its schema. Minimal shape used: region, blood group,
  raw PIN/town input, timestamp. Revisit if retention or PII handling needs
  a real policy.
- `donors.consent_at` / `consent_version` (Unit 20): SPEC.md §11.1 requires
  a timestamped, versioned consent record; PRD.md §4.3 doesn't list these
  columns. Added as a small addition to the Unit 20 migration.

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
