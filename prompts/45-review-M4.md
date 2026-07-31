# Unit 45 — Review gate: M4

**Milestone:** M4
**Depends on:** 33 through 44

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §12 Epic 6 (all items), §13 (M4 = "Coordination layer").

## Task
Review milestone M4 before starting M5. Invoke the `security-review` skill
against the current diff. Check every Epic 6 acceptance item. Re-check
CLAUDE.md rules 1, 3, and 6 by name — rule 3 is now load-bearing across A2
and A3, both of which reveal donor phone numbers; confirm there is exactly
one serialisation path across both.

## Read before writing
All of Units 33–44 — review the full diff against the milestone's base
branch.

## Constraints
1. **The browser never talks to the database.**
3. **Donor phone numbers pass through exactly one serialisation layer.**
6. **Search stays public.**
This unit produces findings, not new features.

## Reference
PRD.md §12 Epic 6 (all six items).

## Verify when done
- [ ] Epic 6's six acceptance criteria all pass
- [ ] Confirmed exactly one phone-serialisation code path is used by both
      A2 and A3
- [ ] security-review skill run with zero unresolved BLOCKERs
- [ ] existing features still work
- [ ] npm run lint passes
