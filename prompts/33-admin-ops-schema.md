# Unit 33 — Admin operations schema

**Milestone:** M4
**Depends on:** 02, 16, 18

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §4.6 (admin_rota, notifications, audit_log), §9.2
(escalation timings), SPEC.md §5.

## Task
Migration adding `admin_rota`, `audit_log`, and `notifications` if Unit 18
didn't already create the latter (check first — do not create it twice).
Seed the seven escalation/expiry timing values from SPEC.md §5 into
`app_settings`, using the suggested defaults, clearly commented as
Lions-Club-adjustable per PRD.md §15 item 1.

## Read before writing
Unit 18's `notifications` table, if it exists — extend, don't duplicate.
Unit 02's `app_settings` — add rows, not a new table.

## Constraints
2. **Never accept a client-supplied primary key.**
10. **Write the migration before the UI.**
Scope limit: no `reports` table yet — that's Unit 46 in M5.

## Reference
PRD.md §4.6 full schema, §9.2 (all seven trigger/threshold rows), §15 item 1.

## Verify when done
- [ ] Migration applies cleanly; `notifications` exists exactly once across
      the whole schema
- [ ] All seven timing values exist in `app_settings` with the SPEC.md §5
      suggested defaults
- [ ] existing features still work
- [ ] npm run lint passes
