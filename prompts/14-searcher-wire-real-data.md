# Unit 14 — Wire searcher (S1+S2) to real data

**Milestone:** M2
**Depends on:** 07, 12, 13

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §6.2 (rules), §12 Epic 2 (all six items).

## Task
Replace Unit 13's mock data with a real server route: PIN/town input resolves
to a region via `pincodes`, returns that region's banks + stock (with
computed age) + adjacent-region names, from Unit 07/12's tables. Every search
writes a `search_logs` row, including searches that never lead to a request.
Searching must create zero rows in any notification-related table.

## Read before writing
Unit 07's `search_logs` schema and shared types. Unit 12's real bank/stock
data — this is the first unit that reads it from the searcher side.

## Constraints
6. **Search stays public.** No auth anywhere in this path.
4. **Never fetch a whole table into the browser.** Response is scoped to one
region's banks, not all banks.
Scope limit: no request-raising logic here — that is Unit 21/22 in M3.

## Reference
PRD.md §12 Epic 2 acceptance criteria (all six items) — use as the literal
test list.

## Verify when done
- [ ] Search with a valid PIN returns only that region's banks
- [ ] Every stock figure has a real age label; stale ones are visibly greyed
- [ ] Searching creates a `search_logs` row and zero notification rows
- [ ] Adjacent-region chips fetch that region's real banks without broadcasting
- [ ] existing features still work
- [ ] npm run lint passes
