# Unit 16 — Requests + prospects schema

**Milestone:** M3
**Depends on:** 02

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §4.5 (requests, prospects, partial unique indexes), CLAUDE.md
"Data model invariants".

## Task
Migration adding `requests` and `prospects`, including both partial unique
indexes verbatim from PRD.md §4.5: `one_open_request_per_phone` and
`one_active_pledge_per_donor`. `requests.stage` must be a plain column here
(no trigger yet) — Unit 22 and 28's wiring are responsible for deriving it
from prospects; do not write both request-stage-setting code paths from a
single migration.

## Read before writing
Unit 02's `profiles`, `donors`, `blood_banks` — `requests`/`prospects`
foreign-key into these; match column naming exactly.

## Constraints
2. **Never accept a client-supplied primary key.**
7. **Never store diagnosis, hospital record numbers, or doctor names.** Only
blood group, units, contact phone, patient first name on `requests`.
10. **Write the migration before the UI.**
Scope limit: no `admin_rota`, `notifications`, or `audit_log` yet — those are
Unit 33 in M4.

## Reference
PRD.md §4.5 full schema and both index definitions verbatim. CLAUDE.md
"Data model invariants" (stage-is-derived rule, close-reason rule).

## Verify when done
- [ ] Both partial unique indexes exist and reject a second open request per
      phone / a second active pledge per donor at the database level
- [ ] `requests` has no columns beyond what §4.5 and CLAUDE.md rule 7 allow
- [ ] existing features still work
- [ ] npm run lint passes
