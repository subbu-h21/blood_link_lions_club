# Unit 40 — A3 donor lookup UI (hardcoded)

**Milestone:** M4
**Depends on:** 36

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.1 A3.

## Task
Build `/admin/donors`: search regional donors by blood group and
availability, results list with mock data including a mock phone field
guarded behind a visible "reveal contact" action (not shown by default) —
this makes the audit-on-reveal requirement visible in the UI itself, not
just implicit.

## Read before writing
Unit 38's A2 screen — same "reveal" interaction pattern should look and
behave consistently across both screens.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock data; real audit-logging is Unit 41.

## Reference
PRD.md §9.1 A3.

## Verify when done
- [ ] Search filters mock donors by group and availability
- [ ] Phone is hidden behind an explicit reveal action, not shown by default
- [ ] existing features still work
- [ ] npm run lint passes
