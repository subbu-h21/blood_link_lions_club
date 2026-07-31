# Unit 13 — Searcher shell + S1/S2 screens (hardcoded)

**Milestone:** M2
**Depends on:** 01

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §6.1 S1 (search), S2 (results), §6.2 (rules).

## Task
Build the public `app/(public)/` shell (no auth) plus S1 (PIN or town-name
input with autocomplete, blood group + component select, region confirmation)
and S2 (blood bank cards, per-group stock table with age labels, greyed stale
stock, open/closed badge, adjacent-region chips, persistent "raise a request"
CTA). Use hardcoded mock data for banks/stock/regions — no network calls.

## Read before writing
Unit 07's shared types (stock row, bank card) — shape the mock data to match
exactly.

## Constraints
6. **Search stays public.** No auth, no signup wall, no email capture on
these screens.
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: no real region resolution or stock lookup yet — Unit 14 wires
that in.

## Reference
PRD.md §6.1 S1, S2 full field/element lists.

## Verify when done
- [ ] S1 and S2 render and are navigable with zero auth prompts anywhere
- [ ] Stale stock is greyed with an explicit age, never hidden
- [ ] Adjacent-region chips navigate without any network call (mock only)
- [ ] existing features still work
- [ ] npm run lint passes
