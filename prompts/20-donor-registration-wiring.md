# Unit 20 — Donor registration wiring

**Milestone:** M3
**Depends on:** 04, 16, 19

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §7.1 D1, §4.3 (donors table), §12 Epic 4 (DOB gate item).

## Task
Wire D1 to real data: create a `donors` row linked to the `profiles` row from
Unit 04's OTP flow, upgrade `profiles.role` to `donor`, enforce the 18–65 DOB
gate server-side (not just client-side), resolve PIN to region via
`pincodes`, and record consent with a timestamp and the version of the
consent text shown (add `consent_at`/`consent_version` columns to `donors` as
part of this unit's migration — PRD.md §4.3 doesn't list them explicitly;
SPEC.md §11.1 requires them).

## Read before writing
Unit 04's profile-creation flow — this extends it, does not duplicate OTP
logic. Unit 16's schema conventions for the small migration this unit adds.

## Constraints
1. **The browser never talks to the database.**
2. **Never accept a client-supplied primary key.**
Scope limit: server-side DOB validation must reject the same range the UI
does — never trust the client-side check alone.

## Reference
PRD.md §12 Epic 4 ("DOB outside 18–65 is rejected at registration").
SPEC.md §11.1.

## Verify when done
- [ ] A crafted request with DOB outside 18–65 is rejected server-side even
      if the client check is bypassed
- [ ] `donors.consent_at` and `consent_version` are set on every registration
- [ ] existing features still work
- [ ] npm run lint passes
