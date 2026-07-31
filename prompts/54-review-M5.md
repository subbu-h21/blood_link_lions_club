# Unit 54 — Review gate: M5

**Milestone:** M5
**Depends on:** 46 through 53

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §12 Epic 7 (Security), §11 (Compliance), §13 (M5 =
"Compliance").

## Task
Review milestone M5 before starting M6. Invoke the `security-review` skill
against the current diff. Check every Epic 7 item and every §11 compliance
requirement. Re-check CLAUDE.md rules 1, 3, and 6 by name, plus rule 2 (no
client-supplied IDs) given this milestone touches account deletion and
blocking. Confirm account deletion and blocking both work end to end, not
just that their screens render.

## Read before writing
All of Units 46–53 — review the full diff against the milestone's base
branch.

## Constraints
1. **The browser never talks to the database.**
2. **Never accept a client-supplied primary key.**
3. **Donor phone numbers pass through exactly one serialisation layer.**
6. **Search stays public.**
This unit produces findings, not new features.

## Reference
PRD.md §12 Epic 7 (all six items), §11.1–§11.3.

## Verify when done
- [ ] Epic 7's six acceptance criteria all pass
- [ ] Every §11 compliance requirement is met (consent record, privacy
      notice, working deletion, grievance contact, audit of PII access, data
      minimisation)
- [ ] security-review skill run with zero unresolved BLOCKERs
- [ ] existing features still work
- [ ] npm run lint passes
