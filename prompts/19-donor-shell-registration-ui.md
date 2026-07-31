# Unit 19 — Donor portal shell + D1 registration UI

**Milestone:** M3
**Depends on:** 03, 05

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §3 (`app/donor/` tree), §7.1 D1, §11.2 (consent wording).

## Task
Build the `/donor` route shell (nav to D1–D6) and D1 registration: phone+OTP
(reuse Unit 03's component), full name, date of birth, blood group, PIN code,
and an explicit consent checkbox using the accurate wording from PRD.md
§11.2 — data is stored on a server, name/blood group become visible to
regional admins and banks, phone shared only after acceptance. Reject DOB
outside 18–65 client-side with a clear message; hardcoded/mock submit for
now.

## Read before writing
Unit 03's OTP component — reuse it directly, do not rebuild. Unit 05's
middleware — this route group sits behind the `donor` role gate once a
session exists, but registration itself must be reachable pre-role-assignment.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: the old "stored only in your browser" wording must never appear
anywhere in this consent text (CLAUDE.md/PRD.md §11.2 explicit prohibition).

## Reference
PRD.md §7.1 D1, §11.2 (consent wording, verbatim requirements).

## Verify when done
- [ ] D1 renders all listed fields and rejects out-of-range DOB with a clear
      message, client-side, before any submit
- [ ] Consent text matches §11.2's required content; old wording is absent
- [ ] existing features still work
- [ ] npm run lint passes
