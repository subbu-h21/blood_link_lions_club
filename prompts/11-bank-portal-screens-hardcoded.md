# Unit 11 — Bank portal screens (hardcoded data)

**Milestone:** M2
**Depends on:** 10

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §8.1 B1 (stock dashboard), B2 (post shortage), B5 (profile).

## Task
Build B1, B2, and B5 against hardcoded mock data: B1 is an 8-groups ×
component grid with inline edit and one-tap increment/decrement, prominent
`updated_at` per row, a banner if any row is "stale". B2 is a select-group +
units-needed form plus a mock active-shortages list with a resolve action.
B5 edits opening hours (per weekday), address, phone, policy notes. No
network calls — all state is local mock data.

## Read before writing
Unit 07's shared types (stock row, bank card shapes) — use them for the mock
data shape so Unit 12's wiring is a drop-in swap, not a rewrite.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: B2's "notifies eligible donors" behavior does not exist yet —
show the form and list only; real notification wiring needs the matching
engine from M3.

## Reference
PRD.md §8.1 B1, B2, B5 full field lists.

## Verify when done
- [ ] All three screens render and are interactive against mock data
- [ ] Stale-stock banner and per-row age label both appear correctly
- [ ] Mock data shape matches Unit 07's shared types exactly
- [ ] existing features still work
- [ ] npm run lint passes
