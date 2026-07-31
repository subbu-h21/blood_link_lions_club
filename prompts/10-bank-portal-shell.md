# Unit 10 — Bank portal shell

**Milestone:** M2
**Depends on:** 05, 09

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §3 (`app/bank/` tree), §8.1 (screen list B1–B5).

## Task
Build the `/bank` route group: layout, navigation shell (links to B1 stock
dashboard, B2 shortage, B5 settings — B3/B4 arrive in M3 once prospects
exist), and the logged-in bank-staff header showing which bank they belong
to. No page content yet beyond placeholders.

## Read before writing
Unit 05's middleware (this route group must sit behind the `bank_staff` role
gate). Unit 09's session — read the bank_id from it for the header.

## Constraints
1. **The browser never talks to the database.** The shell reads session data
server-side only.
Scope limit: placeholders only, no real screens yet.

## Reference
PRD.md §8.1 (screen list, for nav structure only).

## Verify when done
- [ ] `/bank` renders the shell for a logged-in bank_staff session only
- [ ] Non-bank_staff sessions are redirected by Unit 05's middleware, not by
      this unit's own logic
- [ ] existing features still work
- [ ] npm run lint passes
