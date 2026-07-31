# Unit 48 — Wire A5 to real data

**Milestone:** M5
**Depends on:** 39, 46, 47

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.3, §11.3 (prohibited — must be an available report
reason), §12 Epic 7 (abusive close-reason overlap).

## Task
Wire the reports list to the real `reports` table. Block-user sets
`profiles.is_blocked = true`, which must immediately exclude that user from
Unit 17's matching engine (if a donor) and Unit 05's middleware access
(session invalidated or rejected on next request). The reason list must
include selling/buying blood, per PRD.md §11.3.

## Read before writing
Unit 39's audit-logging pattern — block actions should be audited the same
way contact reveals are. Unit 17's matching engine — confirm blocked donors
are actually excluded, don't just trust the flag exists.

## Constraints
1. **The browser never talks to the database.**
Scope limit: this unit does not build the report *submission* entry point —
that remains an open item per Unit 46.

## Reference
PRD.md §11.3 ("Terms of service must prohibit it explicitly, and the report
mechanism must accept it as a reason").

## Verify when done
- [ ] Blocking a donor immediately excludes them from Unit 17's matching
- [ ] Report reasons include the selling/buying-blood option from §11.3
- [ ] existing features still work
- [ ] npm run lint passes
