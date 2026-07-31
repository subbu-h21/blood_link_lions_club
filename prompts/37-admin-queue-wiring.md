# Unit 37 — Wire A1 to real data

**Milestone:** M4
**Depends on:** 16, 33, 36

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.3 (rules), §12 Epic 6.

## Task
A1 reads real `requests` scoped strictly to the acting admin's `region_id` —
never another region's, except via the transfer flow built in Unit 39. The
escalation-threshold flag reads its value from `app_settings` (Unit 33), not
a hardcoded number.

## Read before writing
Unit 16's `requests` schema. Unit 33's `app_settings` timing rows.

## Constraints
1. **The browser never talks to the database.**
4. **Never fetch a whole table into the browser.** Paginate if the region's
open-request count can plausibly exceed one page.
Scope limit: admins are region-scoped — do not add a way to view another
region's queue in this unit.

## Reference
PRD.md §12 Epic 6 ("Queue shows only that admin's region").

## Verify when done
- [ ] Queue shows only the acting admin's region, verified with two admin
      accounts in different regions
- [ ] Escalation flag threshold matches the live `app_settings` value, not a
      hardcoded one
- [ ] existing features still work
- [ ] npm run lint passes
