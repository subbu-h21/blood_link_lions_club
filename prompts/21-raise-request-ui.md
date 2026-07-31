# Unit 21 — S4 raise-request UI

**Milestone:** M3
**Depends on:** 03, 13

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §6.1 S4, §6.2 (rules).

## Task
Build `/request/new`: phone+OTP (reuse Unit 03's component) first, then
blood group, component, units, destination bank (dropdown of region banks),
urgency, optional patient first name. Show a clear blocking message if an
open request already exists for that phone — mocked for now (real
duplicate-check is Unit 22).

## Read before writing
Unit 03's OTP component. Unit 13's searcher shell — this screen is reached
from S2's persistent CTA, keep the navigation consistent with it.

## Constraints
7. **Never store diagnosis, hospital record numbers, or doctor names.** Only
the fields listed above belong on this form — no free-text medical field.
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: no real submission yet.

## Reference
PRD.md §6.1 S4 full field list.

## Verify when done
- [ ] Form contains exactly the fields listed in PRD.md §6.1 S4, no more
- [ ] Mocked duplicate-request message renders when triggered
- [ ] existing features still work
- [ ] npm run lint passes
