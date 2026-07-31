# Unit 32 — Review gate: M3

**Milestone:** M3
**Depends on:** 16 through 31

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §12 Epic 3 and Epic 4 (all items), the donation-confirmation
rows of Epic 5, §13 (M3 = "the milestone that proves the product").

## Task
Review milestone M3 before starting M4. Invoke the `security-review` skill
against the current diff. Check every item in Epic 3 and Epic 4, plus the
donation-confirmation rows of Epic 5. Re-check CLAUDE.md rules 1, 3, and 6 by
name — rule 3 has real surface now (donor phone in D4, admin contact in S5,
bank-side B3 prospect list) and deserves careful attention. Confirm the full
loop actually works end to end: raise request → donor notified → donor
accepts → bank confirms donation → donor's cooldown resets. If that loop
doesn't work, say so plainly — per PRD.md §13, nothing after this milestone
matters if it doesn't.

## Read before writing
All of Units 16–31 — review the full diff against the milestone's base
branch.

## Constraints
1. **The browser never talks to the database.**
3. **Donor phone numbers pass through exactly one serialisation layer.**
6. **Search stays public.**
5. **Only a blood bank confirms a donation.**
This unit produces findings, not new features.

## Reference
PRD.md §12 Epic 3, Epic 4, and Epic 5's donation-confirmation rows.

## Verify when done
- [ ] Epic 3 and Epic 4 acceptance criteria all pass
- [ ] Donation-confirmation rows of Epic 5 pass, including "no other code
      path writes those three fields"
- [ ] End-to-end loop (request → notify → accept → confirm → cooldown reset)
      manually verified, not just unit-tested
- [ ] security-review skill run with zero unresolved BLOCKERs
- [ ] existing features still work
- [ ] npm run lint passes
