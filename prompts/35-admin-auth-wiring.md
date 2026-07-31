# Unit 35 — Admin auth wiring

**Milestone:** M4
**Depends on:** 02, 34

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: CLAUDE.md "Conventions" (admin = email+password,
super-admin-created).

## Task
Wire Unit 34's screens to real Supabase email+password auth. Seed one or two
`admin`/`coordinator` test accounts via the seed script, each with a
temporary password and forced reset on first login — same pattern as Unit
09's bank accounts. A real "super-admin creates an admin account" UI is out
of scope (no PRD screen defines one); note this alongside Unit 09's gap in
prompts/README.md rather than inventing a screen here.

## Read before writing
Unit 09's bank-auth wiring — same pattern, different role and account tier.
Unit 05's role middleware — confirm `admin`/`coordinator` roles resolve.

## Constraints
1. **The browser never talks to the database.**
2. **Never accept a client-supplied primary key.**
Scope limit: do not build account-creation UI here — flagged as an open gap.

## Reference
Paste current docs for Supabase email+password auth before implementing.

## Verify when done
- [ ] Seeded admin/coordinator accounts log in and are forced through
      password reset before reaching any admin page
- [ ] `coordinator` and `admin` roles are distinguishable in the session for
      later use by Unit 49/50's coordinator-only gate
- [ ] existing features still work
- [ ] npm run lint passes
