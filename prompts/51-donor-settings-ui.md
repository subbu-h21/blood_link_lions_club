# Unit 51 — D6 donor settings UI (hardcoded)

**Milestone:** M5
**Depends on:** 19

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §7.1 D6 ("Delete account — hard requirement, not optional").

## Task
Build `/donor/settings`: edit blood group/PIN/name, pause notifications, and
a delete-account control with a clear, honest confirmation step (state
plainly what deletion does — remove the donor and stand down any active
pledge). Hardcoded mock data and mock delete flow.

## Read before writing
Unit 23's D2 screen — settings is reached from the donor home nav, keep it
consistent.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock delete only; real wiring is Unit 52.

## Reference
PRD.md §7.1 D6.

## Verify when done
- [ ] All listed edit fields, pause control, and delete-account flow render
      against mock data
- [ ] Delete confirmation text accurately describes the consequence
- [ ] existing features still work
- [ ] npm run lint passes
