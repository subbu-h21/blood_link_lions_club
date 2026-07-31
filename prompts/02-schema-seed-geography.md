# Unit 02 — Schema + seed geography

**Milestone:** M1
**Depends on:** 01

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §4.1 (Geography), §4.2 (Identity), §4.3 (Donors), §4.4 (Blood
banks, base fields only), §9 app_settings note under "Timing parameters".

## Task
Write the first migration: `regions`, `pincodes`, `region_adjacency`,
`profiles`, `donors`, a base `blood_banks` table (id, name, region_id,
pincode, address, phone, licence_no, is_verified, is_active — no stock or
opening_hours yet, those arrive in Unit 07), and `app_settings` (key/value
store for timing parameters, seeded with SPEC.md §5 suggested defaults). Write
a seed script using the real Sirsi PIN code / region / blood bank data
supplied separately, plus a validation check: every PIN resolves to exactly
one region, every region has ≥1 verified blood bank, adjacency is symmetric.

## Read before writing
Unit 01's folder skeleton (`supabase/migrations/`, `lib/db/`) — put the
migration and seed script there, matching its naming convention.

## Constraints
2. **Never accept a client-supplied primary key.** All IDs are UUIDs
generated server-side.
10. **Write the migration before the UI** for each milestone.
Scope limit: no `bank_stock`, `bank_shortages`, `requests`, or `prospects`
tables yet — those belong to later units.

## Reference
PRD.md §4.1–§4.4, §4.7 (compatibility table, schema only — no code yet).
CLAUDE.md "Data model invariants" and "Timing parameters" sections.

## Verify when done
- [ ] `npm run db:migrate` applies cleanly on an empty database
- [ ] `npm run db:seed` populates Sirsi data; validation script passes all
      three checks (PIN→region uniqueness, ≥1 verified bank per region,
      symmetric adjacency)
- [ ] existing features still work
- [ ] npm run lint passes
