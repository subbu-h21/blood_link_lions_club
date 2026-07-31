# Unit 22 — Wire S4 to real data

**Milestone:** M3
**Depends on:** 04, 16, 17, 18, 21

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §6.2, §7.2, §9.2 (zero-donor-matched row), §12 Epic 3.

## Task
On submit: verify OTP (Unit 04), create the `requests` row at
`finding_prospects`, rejecting a second open request from the same phone
with the partial unique index from Unit 16 surfaced as a clear message. Run
Unit 17's matching engine; create `prospects` rows (`invited`) for every
eligible donor and send Unit 18's push notification to each. If zero donors
match, write whatever minimal signal M4's admin-notify path will read later
(a flag/timestamp on the request is enough — the full admin UI doesn't exist
until M4) rather than silently doing nothing.

## Read before writing
Unit 16's schema and both partial unique indexes. Unit 17's matching engine —
call it, do not reimplement eligibility logic here. Unit 18's `sendPush`.

## Constraints
1. **The browser never talks to the database.**
2. **Never accept a client-supplied primary key.**
6. **Search stays public. Only raising a request requires OTP.**
Scope limit: `requests.stage` is set here only at creation
(`finding_prospects`) — every later transition is derived from `prospects`
by other units, never set independently alongside this one.

## Reference
PRD.md §12 Epic 3 (all six items) — use as the literal test list.

## Verify when done
- [ ] Raising a request requires a verified OTP
- [ ] A second open request from the same phone is rejected with a clear
      message, enforced by the database index, not just app logic
- [ ] Zero eligible donors at creation leaves a detectable signal for M4's
      admin-notify path
- [ ] existing features still work
- [ ] npm run lint passes
