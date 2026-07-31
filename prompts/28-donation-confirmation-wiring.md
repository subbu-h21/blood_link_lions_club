# Unit 28 — Wire B3 + B4 to real data

**Milestone:** M3
**Depends on:** 09, 16, 27

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §8.2 (rules), §12 Epic 5 (donation-confirmation items),
CLAUDE.md non-negotiable rule 5.

## Task
B3 shows only prospects assigned to the acting bank_staff's own bank, never
the full regional donor list. Status actions write real `prospects.status`
transitions. B4's confirm sets `group_verified_at`, `last_donation_at`, and
`eligible_from` on the donor — this is the *only* code path in the entire
codebase permitted to write those three fields. A `rejected` outcome returns
the request to `finding_prospects` if no other prospect on it is currently
live; it never penalises the donor's ranking. A `no_show` affects only
internal reliability ordering (Unit 17's matching engine reads it later),
never shown to the donor.

## Read before writing
Unit 16's `prospects`/`requests` schema. Unit 17's matching engine —
`no_show` history feeds its ordering; confirm the field names line up. Unit
09's bank session, for own-bank scoping. `lib/serialise/`'s shapes from Unit
07 — B3 is the first unit anywhere in the codebase to expose a donor phone
number (to the bank that donor is scheduled at, per rule 3 below), so the
phone-disclosure function belongs there; Unit 39's admin-side reveal must
call this same function, not add a second one.

## Constraints
5. **Only a blood bank confirms a donation.** No self-reporting anywhere.
3. **Donor phone numbers pass through exactly one serialisation layer.** A
number is released only to an admin with an `accepted` prospect, or the bank
that donor is scheduled at — B3 is the latter case. Write the single
serialisation function here; never a second, ad-hoc formatting path.
1. **The browser never talks to the database.**
Scope limit: grep the codebase before finishing this unit and confirm no
other route/action writes `last_donation_at`, `eligible_from`, or
`group_verified_at`. If one exists, that is a bug to fix in this unit, not to
work around.

## Reference
PRD.md §12 Epic 5 (donation-confirmation items, all four), §8.2 rules table.

## Verify when done
- [ ] Donation confirmation sets all three fields; no other path in the
      codebase writes any of them
- [ ] Rejected prospect reopens the request only when no other prospect is
      live, and never penalises the donor
- [ ] Bank staff see only their own bank's assigned prospects
- [ ] existing features still work
- [ ] npm run lint passes
