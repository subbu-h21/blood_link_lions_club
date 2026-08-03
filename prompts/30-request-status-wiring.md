# Unit 30 — Wire S5 to real data + cancel action

**Milestone:** M3
**Depends on:** 16, 22, 29

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §6.2, §12 Epic 3.

## Task
S5 reads the real `requests` row plus a derived plain-language stage label,
notified/accepted counts from `prospects`, and admin contact once
`owner_admin_id` is set (null-safe until M4 populates it, same caveat as
Unit 26). Cancel writes `close_reason` (required, one of the five allowed
values), sets `stage = 'closed'`, and stands down every live prospect on the
request with the same warm-thank-you semantics D3/Unit 24 relies on for
other stand-downs.

## Read before writing
Unit 22's request-creation wiring and Unit 24's prospect-status transitions —
reuse the stand-down logic from there, do not write a second implementation
of it here.
**Note (checked during the M3 consistency audit, 2026-08-03):** what Unit 26
actually built (`lib/db/prospects.ts`'s `cancelPledge`) is narrower than
"stand-down logic" in general - it's scoped to `donor_id` and looks up
*one* prospect (the caller's own active accepted/screening pledge), because
that unit's only job was a donor cancelling their own pledge. This unit
needs to stand down potentially *several* prospects in mixed statuses, all
tied to one `request_id`, when the requester cancels the whole request -
there is no existing function shaped for that yet. Read `cancelPledge`
first, then extract a shared lower-level helper (e.g. a
`standDownProspect(prospectId)` that both `cancelPledge` and this unit's
request-level loop call) rather than either duplicating the status-setting
logic inline or trying to force-fit the existing donor-scoped function to a
request-scoped case it wasn't built for. Once refactored, update
`cancelPledge` to call the shared helper too, so there is genuinely one
implementation, not two independent ones that happen to set the same status
string.

## Constraints
3. **Donor phone numbers pass through exactly one serialisation layer.**
Confirm the real query never selects a donor phone column into this
response.
1. **The browser never talks to the database.**
Scope limit: this is the only place `close_reason` gets set from the
requester side; admin-initiated close (M4) must call the same underlying
function, not duplicate it.

## Reference
PRD.md §12 Epic 3 ("Requester never sees a donor phone number", "Cancelling
requires a reason and stands down all prospects").

## Verify when done
- [ ] Requester never sees a donor phone number at any stage, verified by
      inspecting the actual server response, not just the UI
- [ ] Cancelling without a reason is rejected by the server, not just the
      client form
- [ ] Cancelling stands down every live prospect on the request
- [ ] existing features still work
- [ ] npm run lint passes
