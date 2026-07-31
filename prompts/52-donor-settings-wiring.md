# Unit 52 — Wire D6 to real data (incl. account deletion)

**Milestone:** M5
**Depends on:** 20, 24, 51

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §7.1 D6, §7.3 (D10 edge case), §11.1, §12 Epic 4.

## Task
Wire edits to real `donors`/`profiles` fields. Account deletion must, in one
transaction: mark the donor deleted (`deleted_at`), stand down any active
prospect via Unit 24's stand-down path, and notify the owning admin the same
way other stand-downs do (per SPEC.md D10). Confirm a deleted donor is
immediately excluded from Unit 17's matching.

## Read before writing
Unit 20's donor schema. Unit 24's stand-down function — reuse it, do not
write a second deletion-specific stand-down path.

## Constraints
1. **The browser never talks to the database.**
Scope limit: deletion is a real, working action — not a soft "hide from UI"
that leaves the donor matchable.

## Reference
PRD.md §12 Epic 4 ("Account deletion removes the donor and stands down any
pledge"). SPEC.md §6 D10.

## Verify when done
- [ ] Deleting an account with an active pledge stands it down and notifies
      the admin, in the same transaction
- [ ] A deleted donor is excluded from Unit 17's matching immediately,
      verified directly, not assumed
- [ ] existing features still work
- [ ] npm run lint passes
