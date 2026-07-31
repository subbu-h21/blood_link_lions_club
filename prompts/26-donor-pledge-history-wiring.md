# Unit 26 — Wire D4 + D5 to real data

**Milestone:** M3
**Depends on:** 16, 24, 25

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §7.1 D4, D5, §7.3 (rules).

## Task
D4 reads the donor's live `prospects` row (`accepted`/`screening`) joined to
its `requests.destination_bank_id` and the request's owning admin — admin
contact only appears once one is assigned (admin ownership itself is wired in
M4; until then this may be empty, which is correct, not a bug). Cancel-pledge
sets the prospect to `stood_down` and notifies the admin path the same way
Unit 22 signals zero-match. D5 reads confirmed `donated` prospects for that
donor.

## Read before writing
Unit 24's prospect-status wiring — cancel-pledge is another status
transition on the same table, keep the transition logic in one place.

## Constraints
3. **Donor phone numbers pass through exactly one serialisation layer.**
This screen shows the *admin's* phone to the donor, never another donor's.
Scope limit: do not build a real admin-assignment mechanism here — that is
M4's job. Read whatever `owner_admin_id` M4 will eventually populate;
leave it null-safe until then.

## Reference
PRD.md §7.3 rules table.

## Verify when done
- [ ] D4 shows real pledge data and a working cancel action
- [ ] D5 shows only that donor's own confirmed donations
- [ ] Cancelling a pledge stands it down and leaves no dangling active-pledge
      index entry
- [ ] existing features still work
- [ ] npm run lint passes
