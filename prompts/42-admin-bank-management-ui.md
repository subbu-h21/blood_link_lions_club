# Unit 42 — A4 bank management UI (hardcoded)

**Milestone:** M4
**Depends on:** 36

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.1 A4.

## Task
Build `/admin/banks`: verify/suspend a bank, edit its policy notes.
Hardcoded mock list of banks in the admin's region.

## Read before writing
Unit 11's B5 bank-settings screen — A4 edits fields the bank itself also
edits (policy notes); keep the field shape identical between both.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock data only.

## Reference
PRD.md §9.1 A4.

## Verify when done
- [ ] Verify/suspend toggle and policy-notes edit both render against mock
      data
- [ ] existing features still work
- [ ] npm run lint passes
