# Unit 07 — Bank stock/search schema + shared types

**Milestone:** M2
**Depends on:** 02

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §4.4 (bank_stock, bank_shortages), §6.2 ("Every search
logged"), §12 Epic 2.

## Task
Migration adding `bank_stock`, `bank_shortages` to the existing `blood_banks`
table, plus `opening_hours` and `policy_notes` columns on `blood_banks` if not
already present from Unit 02. Add a `search_logs` table (region_id,
blood_group, pincode_or_town_input, searched_at) — PRD.md requires "every
search logged" but does not define its schema; this unit defines the minimal
shape. Define shared TypeScript types/serialisation shapes for a bank card,
a stock row (with computed age), and a search result, under `lib/serialise/`.

## Read before writing
Unit 02's migration and `blood_banks` base table — extend it, do not
recreate it. Match its snake_case/camelCase mapping convention.

## Constraints
2. **Never accept a client-supplied primary key.**
10. **Write the migration before the UI** for each milestone.
Scope limit: no UI in this unit. `search_logs` retention/PII policy is not
decided — store only the fields listed above, nothing more.

## Reference
PRD.md §4.4, §6.1 S2 (what a stock row must render), §6.2.

## Verify when done
- [ ] Migration applies cleanly on top of Unit 02's schema
- [ ] Shared types compile and are imported (not duplicated) by later units
- [ ] existing features still work
- [ ] npm run lint passes
