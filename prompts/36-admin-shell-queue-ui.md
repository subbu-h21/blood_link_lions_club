# Unit 36 — Admin portal shell + A1 queue UI (hardcoded)

**Milestone:** M4
**Depends on:** 05, 35

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §3 (`app/admin/` tree), §9.1 A1.

## Task
Build the `/admin` route shell (nav to A1–A6, though A5/A6 are stubs until
M5) and A1: all open requests in the admin's region, columns for age,
urgency, stage, blood group, prospects count, owner; sort by urgency then
age; filter by stage; visual flag for requests past the escalation
threshold. Hardcoded mock data.

## Read before writing
Unit 10's bank-shell pattern — same shell approach, different role gate and
nav items.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock data only; no real region-scoping yet.

## Reference
PRD.md §9.1 A1 full column/sort/filter spec.

## Verify when done
- [ ] A1 renders with sort, filter, and an escalation-flag visual on mock
      rows past threshold
- [ ] existing features still work
- [ ] npm run lint passes
