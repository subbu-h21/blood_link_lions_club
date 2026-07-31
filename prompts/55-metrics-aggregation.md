# Unit 55 — Metrics aggregation queries

**Milestone:** M6
**Depends on:** 16, 22, 28, 30

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §14 (all eight metrics), SPEC.md §9.

## Task
Pure server-side query module computing each metric in PRD.md §14 from
existing tables: prospects-per-donation, %resolved, median request→first-
acceptance, median acceptance→donation, %closed `found_elsewhere`, tier-1
hit rate (from `search_logs`, Unit 07), decline/ignore rate over time, admin
response-time distribution. No new schema. Explicitly do not compute
registered-donor count as a headline number — PRD.md §14 states it is "not a
success metric."

## Read before writing
Unit 16's `requests`/`prospects`, Unit 07's `search_logs`, Unit 33's
`notifications`/`audit_log` — this module only reads, across all of them.

## Constraints
Scope limit: read-only aggregation, no UI, no new tables.

## Reference
PRD.md §14 (all eight rows, verbatim definitions). SPEC.md §9.

## Verify when done
- [ ] Each of the eight metrics has a passing test against seeded fixture
      data with a known expected value
- [ ] Registered-donor count is not exposed as a headline metric anywhere in
      this module's output
- [ ] existing features still work
- [ ] npm run lint passes
