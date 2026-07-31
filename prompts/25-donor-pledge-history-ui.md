# Unit 25 — D4 + D5 UI (hardcoded)

**Milestone:** M3
**Depends on:** 19

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §7.1 D4, D5.

## Task
D4 active pledge: destination bank name/address/phone, time window, admin
name and contact, cancel-pledge option. D5 history: past confirmed
donations, next eligible date. Hardcoded mock data, no network calls.

## Read before writing
Unit 23's D2/D3 screens — D4 is reached from D3's "I can donate" outcome,
keep the navigation flow consistent.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock data only.

## Reference
PRD.md §7.1 D4, D5 full field lists.

## Verify when done
- [ ] D4 and D5 render with mock data including a cancel-pledge control
- [ ] existing features still work
- [ ] npm run lint passes
