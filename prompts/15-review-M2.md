# Unit 15 — Review gate: M2

**Milestone:** M2
**Depends on:** 07, 08, 09, 10, 11, 12, 13, 14

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §12 Epic 2 (Search) and the stock-only rows of Epic 5, §13
(M2 = "Stock lookup works end to end").

## Task
Review milestone M2 before starting M3. Invoke the `security-review` skill
against the current diff. Check Epic 2's full acceptance list and the
stock-related rows of Epic 5 (stock timestamping, own-bank-only edits,
verified-bank gating). Re-check CLAUDE.md rules 1, 3, and 6 by name. This is
the first genuinely shippable point in the build — note explicitly whether
the end-to-end "search → find blood bank stock" loop actually works, not just
whether each screen renders.

## Read before writing
All of Units 07–14 — review the full diff against the milestone's base
branch.

## Constraints
1. **The browser never talks to the database.**
3. **Donor phone numbers pass through exactly one serialisation layer.**
6. **Search stays public.**
This unit produces findings, not new features.

## Reference
PRD.md §12 Epic 2 (all six items) and Epic 5's stock rows.

## Verify when done
- [ ] Epic 2's six acceptance criteria all pass
- [ ] Stock-related Epic 5 rows pass (timestamping, own-bank-only, verified
      gating)
- [ ] security-review skill run with zero unresolved BLOCKERs
- [ ] existing features still work
- [ ] npm run lint passes
