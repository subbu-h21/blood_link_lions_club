# Unit 46 — Reports schema

**Milestone:** M5
**Depends on:** 02

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §4.6 (reports), §11.1 (compliance requirements).

## Task
Migration adding `reports` exactly as specified in PRD.md §4.6. Note in this
unit's implementation notes (not the schema itself) that no PRD screen
currently defines where a donor or requester actually files a report —
SPEC.md S2 mentions a "block-and-report button" but no screen ID exists.
This is tracked as an open item in prompts/README.md; Unit 47's admin-side
moderation UI can consume rows in this table regardless of how they arrive
(seed script / direct insert for testing, until the entry-point decision is
made).

## Read before writing
Unit 33's `audit_log` and `profiles` — `reports.reporter_id`/`subject_id`
foreign-key into `profiles`, matching its conventions.

## Constraints
2. **Never accept a client-supplied primary key.**
10. **Write the migration before the UI.**

## Reference
PRD.md §4.6 `reports` schema, verbatim.

## Verify when done
- [ ] Migration applies cleanly
- [ ] existing features still work
- [ ] npm run lint passes
