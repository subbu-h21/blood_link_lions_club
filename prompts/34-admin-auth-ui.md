# Unit 34 — Admin auth UI (email + password)

**Milestone:** M4
**Depends on:** 01

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: CLAUDE.md "Conventions" (`app/admin/` = email + password,
super-admin-created). Same PRD.md §3 staleness note as Unit 08 applies here.

## Task
Build the admin/coordinator login screen: email + password, plus a
forced-password-reset screen on first login (accounts are super-admin-
created, never self-registered). Mock the submit action — real wiring is
Unit 35. This is a separate component from Unit 08's bank auth UI even
though they look similar — different account-creation authority
(super-admin vs admin) and different role set.

## Read before writing
Unit 08's bank auth UI — read it for the pattern, but do not import or reuse
its component directly; keep the two auth surfaces independently editable.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: no self-service "forgot password" — resets are admin-mediated,
same as Unit 08.

## Reference
CLAUDE.md "Conventions" section.

## Verify when done
- [ ] Login and forced-reset screens render with mocked submit
- [ ] No self-service password-reset control exists on this screen
- [ ] existing features still work
- [ ] npm run lint passes
