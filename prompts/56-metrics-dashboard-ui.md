# Unit 56 — Metrics dashboard UI (hardcoded)

**Milestone:** M6
**Depends on:** 36

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §14, §13 (M6 = "Operational visibility").

## Task
Build `/admin/metrics`: one tile or chart per metric in PRD.md §14, against
hardcoded mock numbers. Role-gate it to `admin`/`coordinator`, consistent
with the rest of the admin shell.

## Read before writing
Unit 36's admin shell — this is a new nav item in it, not a separate portal.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock data only.

## Reference
PRD.md §14 (all eight metrics, for the tile/chart list).

## Verify when done
- [ ] One tile/chart per §14 metric renders against mock data
- [ ] existing features still work
- [ ] npm run lint passes
