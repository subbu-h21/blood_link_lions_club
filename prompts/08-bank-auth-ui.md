# Unit 08 — Bank auth UI (email + password)

**Milestone:** M2
**Depends on:** 01

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: CLAUDE.md "Conventions" (`app/bank/` = email + password,
admin-created). Note: PRD.md §3 says phone OTP for bank staff — this is
stale; CLAUDE.md's convention table is the corrected source. See
prompts/README.md "PRD corrections needed."

## Task
Build the bank-staff login screen: email + password fields, and a
forced-password-reset screen shown on first login (accounts are
admin-created with a temporary password, never self-registered). Mock the
submit action — real Supabase auth arrives in Unit 09.

## Read before writing
Unit 03's OTP-UI component exists but is NOT reused here — this is a
deliberately separate auth mechanism for bank staff.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: no self-service "forgot password" link — password resets for
bank staff go through an admin, not self-service (per CLAUDE.md correction).

## Reference
CLAUDE.md "Conventions" section. PRD.md §3 (portal auth row, stale — do not
follow it for this unit).

## Verify when done
- [ ] Login screen and forced-reset screen render with mocked submit
- [ ] No "forgot password" self-service control exists anywhere on this screen
- [ ] Every string has `en` and `kn` versions
- [ ] existing features still work
- [ ] npm run lint passes
