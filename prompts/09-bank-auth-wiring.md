# Unit 09 — Bank auth wiring

**Milestone:** M2
**Depends on:** 02, 08

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: CLAUDE.md "Conventions" (bank = email+password, admin-created).

## Task
Wire Unit 08's screens to real Supabase email+password auth. Since the admin
portal (which would normally create bank-staff accounts) doesn't exist until
M4, seed one or two test `bank_staff` accounts via the seed script from Unit
02, each with a temporary password and a flag forcing reset on first login.
Implement the forced-reset flow for real. Do not build a self-service
password-reset endpoint — that path is admin-mediated (deferred to M4/M5,
noted as a gap in prompts/README.md).

## Read before writing
Unit 02's seed script and `profiles`/`donors` schema. Unit 08's UI. Unit 05's
role middleware — confirm a `bank_staff` role now actually resolves somewhere.

## Constraints
1. **The browser never talks to the database.** Auth goes through server
routes/actions; service-role key stays server-only.
2. **Never accept a client-supplied primary key.**
Scope limit: real admin-driven account creation UI is out of scope here —
flagged as an open gap in prompts/README.md, not solved by this unit.

## Reference
Paste current docs for Supabase email+password auth (including forced
password change on first login) before implementing — do not rely on
training data.

## Verify when done
- [ ] Seeded bank-staff account can log in and is forced through password
      reset before reaching any bank-portal page
- [ ] No client component holds the service-role key
- [ ] existing features still work
- [ ] npm run lint passes
