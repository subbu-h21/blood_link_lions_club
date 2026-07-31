# Unit 39 — Wire A2 to real data

**Milestone:** M4
**Depends on:** 24, 28, 30, 33, 38

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.2, §9.3, §12 Epic 6, CLAUDE.md rule 3.

## Task
Wire all six A2 actions to real writes. Take-ownership sets
`owner_admin_id`/`admin_notified_at` — this is what Units 26/30 have been
reading as null-safe until now. Donor phone is revealed here only for a
prospect currently `accepted` in this admin's own region, through the one
serialisation layer CLAUDE.md rule 3 requires; every reveal writes an
`audit_log` row with no exceptions. Transfer sets the receiving region's
primary admin (from `admin_rota`) as the new owner and logs it. Close
requires a reason and reuses Unit 30's close path exactly.

## Read before writing
Unit 30's close-request function — call it, do not duplicate. Unit 33's
`admin_rota`/`audit_log`. Unit 24/28's prospect-status transitions — stand
down and schedule reuse those, not new logic.

## Constraints
3. **Donor phone numbers pass through exactly one serialisation layer.** This
is the first unit that actually returns one to an admin — go through the
single serialisation function, do not add a second formatting path here.
1. **The browser never talks to the database.**
Scope limit: "call donor" is a UI affordance around the phone number
already revealed by this unit's own rule — it does not add a new
disclosure path.

## Reference
PRD.md §12 Epic 6 (all six items).

## Verify when done
- [ ] Every contact reveal writes exactly one `audit_log` row
- [ ] Transfer reassigns ownership to the receiving region's primary admin
      and logs it
- [ ] Close without a reason is rejected server-side
- [ ] Donor phone is never returned for a prospect outside `accepted` status
      or outside the admin's own region
- [ ] existing features still work
- [ ] npm run lint passes
