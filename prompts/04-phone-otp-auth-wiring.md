# Unit 04 — Phone OTP auth wiring

**Milestone:** M1
**Depends on:** 02, 03

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §2 (auth row), §3, §4.2 (profiles).

## Task
Replace the mocked OTP check from Unit 03 with real Supabase phone-OTP auth.
On first successful verification, create a `profiles` row (role defaults to
`searcher`; donor registration in Unit 19/20 upgrades it to `donor`). Store
the session server-side; the browser only ever holds a session token, never
a service-role key.

## Read before writing
Unit 02's `profiles` schema (exact column names/types). Unit 03's UI
components — wire into the same screens, do not rebuild them.

## Constraints
1. **The browser never talks to the database.** All access goes through
server routes or server actions. The service role key stays in server-only
env.
2. **Never accept a client-supplied primary key.** All IDs are UUIDs
generated server-side.
Scope limit: this unit does not build donor registration fields (name, DOB,
blood group, PIN) — only the phone+OTP identity layer. That is Unit 19/20.

## Reference
PRD.md §2, §4.2. Paste current docs for Supabase phone-auth (OTP flow) before
implementing — do not rely on training data, this API changes.

## Verify when done
- [ ] Real OTP is sent and verified via Supabase; mocked path is gone
- [ ] First-time verification creates exactly one `profiles` row with a
      server-generated UUID
- [ ] No client component imports the service-role key or `lib/db` directly
- [ ] existing features still work
- [ ] npm run lint passes
