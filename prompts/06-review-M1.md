# Unit 06 — Review gate: M1

**Milestone:** M1
**Depends on:** 01, 02, 03, 04, 05

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §12 Epic 1 (Geography and seed), §13 (M1 = "Foundations").

## Task
Review milestone M1 before starting M2. Invoke the `security-review` skill
against the current diff. Check every Epic 1 item in PRD.md §12 explicitly.
Re-check CLAUDE.md rules 1, 3, and 6 by name even though rule 3 (phone number
serialisation) has little surface yet — confirm nothing in the OTP flow leaks
a phone number where it shouldn't.

## Read before writing
All of Units 01–05 — review the full diff against the milestone's base
branch, not just the latest unit.

## Constraints
1. **The browser never talks to the database.**
3. **Donor phone numbers pass through exactly one serialisation layer.**
6. **Search stays public.** Never put auth in front of blood bank search.
This unit produces findings, not new features — do not add scope while
reviewing.

## Reference
PRD.md §12 Epic 1 acceptance criteria (all four items). CLAUDE.md
"Before finishing any task" checklist.

## Verify when done
- [ ] All four Epic 1 acceptance criteria pass
- [ ] security-review skill run with zero unresolved BLOCKERs
- [ ] Rules 1, 3, 6 explicitly re-checked and noted as pass/fail
- [ ] existing features still work
- [ ] npm run lint passes
