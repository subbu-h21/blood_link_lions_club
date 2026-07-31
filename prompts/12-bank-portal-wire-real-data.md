# Unit 12 — Wire bank portal to real data

**Milestone:** M2
**Depends on:** 07, 11

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §8.2 (bank rules), §12 Epic 5 (partial — stock items only).

## Task
Replace Unit 11's mock data with real server actions against `bank_stock`,
`bank_shortages`, and `blood_banks`. Every stock save writes `updated_at`,
with no exceptions. Only staff of that bank can edit its stock or shortages
— enforce server-side, not just by hiding UI. Posting a shortage creates the
`bank_shortages` row only; it does not yet notify anyone (matching engine
doesn't exist until M3).

## Read before writing
Unit 07's schema and types. Unit 09's session (for the acting staff's
`bank_id`). Unit 11's screens — wire into them, do not rebuild.

## Constraints
1. **The browser never talks to the database.** All writes go through
server actions.
4. **Never fetch a whole table into the browser.** Stock/shortage reads are
scoped to the acting bank only, not all banks.
Scope limit: `is_verified = false` banks cannot post stock publicly — check
this flag exists and is respected, even though the verify-UI (A4) doesn't
exist until M4.

## Reference
PRD.md §8.2 rules table (all five rows).

## Verify when done
- [ ] Stock save always writes `updated_at`; verified in the database, not
      just the UI
- [ ] A bank-staff account cannot edit another bank's stock even via a
      crafted request
- [ ] An unverified bank's stock does not appear in any public response
- [ ] existing features still work
- [ ] npm run lint passes
