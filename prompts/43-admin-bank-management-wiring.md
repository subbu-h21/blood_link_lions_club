# Unit 43 — Wire A4 to real data

**Milestone:** M4
**Depends on:** 12, 42

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §8.2 (verified-bank rule), §12 Epic 6.

## Task
Wire verify/suspend and policy-notes editing to the real `blood_banks` table,
scoped to the admin's region. Suspending (`is_verified = false` or
`is_active = false`) must immediately affect Unit 14's public search results
and Unit 12's bank-portal access — confirm both, do not assume one implies
the other.

## Read before writing
Unit 12's `is_verified` check on the bank-portal side. Unit 14's public
search query — both must respect this flag consistently.

## Constraints
1. **The browser never talks to the database.**
Scope limit: region-scoped; an admin cannot verify/suspend a bank outside
their own region.

## Reference
PRD.md §8.2 ("Bank must be verified").

## Verify when done
- [ ] Suspending a bank removes it from public search results and blocks its
      staff from the bank portal, both confirmed directly, not inferred
- [ ] existing features still work
- [ ] npm run lint passes
