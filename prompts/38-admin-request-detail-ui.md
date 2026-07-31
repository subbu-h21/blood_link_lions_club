# Unit 38 — A2 request detail UI (hardcoded)

**Milestone:** M4
**Depends on:** 36

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.1 A2.

## Task
Build `/admin/request/[id]`: requester contact, patient details, destination
bank, prospect list with status/timestamps, actions (**take ownership**,
**call donor**, **schedule**, **stand down prospect**, **transfer region**,
**close** with required reason), and a full event timeline. Hardcoded mock
data, including a mock donor phone field for now — Unit 39 will apply the
real disclosure rule.

## Read before writing
Unit 29's S5 screen (requester-facing status) — this is the admin-facing
mirror of the same request; keep stage vocabulary identical between them.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock data only; this unit does not implement the phone
disclosure rule — that arrives with real data in Unit 39.

## Reference
PRD.md §9.1 A2 full field/action list.

## Verify when done
- [ ] All six actions are present and produce a distinct mock outcome
- [ ] Event timeline renders a plausible sequence of mock events
- [ ] existing features still work
- [ ] npm run lint passes
