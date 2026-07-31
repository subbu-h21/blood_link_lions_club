# Unit 24 — Wire D2 + D3 to real data

**Milestone:** M3
**Depends on:** 16, 17, 20, 23

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §7.2, §7.3, §12 Epic 4.

## Task
D2 reads real eligibility (`is_available`, `paused_until`, `eligible_from`)
from Unit 20's donor record. D3's actions write real `prospects` status
changes: "I can donate" → `accepted`, enforced against the
`one_active_pledge_per_donor` index with a graceful failure message if the
donor already has one; "Not now" leaves the prospect available for others
without penalising the donor; "Not for a while" sets `paused_until`. Late
acceptance on a request that has already left `finding_prospects`/
`evaluating_prospects` shows "already handled" and never creates a live
prospect.

## Read before writing
Unit 16's `prospects` schema and partial unique index. Unit 17's matching
engine (for understanding what "eligible" means, not to re-run it here).

## Constraints
1. **The browser never talks to the database.**
Scope limit: accepting must never bypass the active-pledge index — treat a
unique-constraint violation as the expected "already pledged" case, not an
error to swallow silently.

## Reference
PRD.md §12 Epic 4 (all eight items) — use as the literal test list.

## Verify when done
- [ ] Donor in cooldown receives the correct D2 state and would be excluded
      from Unit 17's matching (cross-check, don't just trust the UI)
- [ ] Donor cannot accept a second request while a pledge is active
- [ ] Late acceptance shows "already handled" and dispatches nothing
- [ ] existing features still work
- [ ] npm run lint passes
