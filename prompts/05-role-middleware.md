# Unit 05 — Role-based route middleware

**Milestone:** M1
**Depends on:** 04

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §3 (middleware note), §5 (Permissions matrix header note:
"Enforce every row server-side").

## Task
Write Next.js middleware that reads `profiles.role` from the session and
rejects cross-portal access before any page renders: a `donor` role hitting
`/bank/*` or `/admin/*` gets redirected, not just hidden nav links. Build this
generically for all four roles (`searcher`, `donor`, `bank_staff`, `admin`,
`coordinator`) now, even though bank/admin accounts don't exist until Units
09 and 35 — the gate must already be correct when they arrive.

## Read before writing
Unit 02's `profiles.role` check constraint (exact allowed values). Unit 04's
session mechanism.

## Constraints
1. **The browser never talks to the database.** Middleware reads the role
from the server-side session, never from a client-supplied value.
Scope limit: this is authorization only — it does not render any portal UI.

## Reference
PRD.md §3, §5. CLAUDE.md "Non-negotiable rules" #1.

## Verify when done
- [ ] A `donor`-role session hitting `/bank` or `/admin` is redirected
      server-side, not client-side
- [ ] Each of the five roles maps to exactly the portal(s) PRD.md §5 grants it
- [ ] existing features still work
- [ ] npm run lint passes
