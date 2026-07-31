# Unit 17 — Matching engine

**Milestone:** M3
**Depends on:** 02, 16

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §4.7 (compatibility table), §7.2 (matching rules, all seven),
SPEC.md §7 I7 (plasma warning).

## Task
Pure server-side module, no UI: (1) the red-cell compatibility table from
PRD.md §4.7 as a lookup function — write it as its own function so a future
plasma table never extends it, per the explicit warning; (2) an
eligible-donor query implementing all seven rules in PRD.md §7.2 exactly, in
order; (3) ordering by "previously reliable donors first, then least
recently notified." Unit-test both the compatibility table and at least one
case per exclusion rule (blocked, in cooldown, notif-cap exhausted, has
active pledge, wrong region).

## Read before writing
Unit 02's `donors` schema (`is_available`, `paused_until`, `eligible_from`,
`notif_count_month`, `deleted_at`) and Unit 16's `requests`/`prospects` —
this module reads both, writes neither.

## Constraints
Scope limit: this unit does not send notifications or create `prospects`
rows — it only returns a ranked list of eligible donor IDs for a given
request. Wiring that calls this and acts on it is Unit 22.

## Reference
PRD.md §4.7, §7.2 (all seven rules verbatim), §12 Epic 4 (matching-adjacent
items). SPEC.md §7 I7.

## Verify when done
- [ ] Compatibility function matches PRD.md §4.7's table exactly for all
      eight groups, and is a separate function from where a future plasma
      table would live
- [ ] A donor failing any one of the seven §7.2 rules is excluded, with a
      passing test per rule
- [ ] existing features still work
- [ ] npm run lint passes
