# Unit 18 — Web push infrastructure

**Milestone:** M3
**Depends on:** 01

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §10.1 (Web Push v1), §12 Epic 4 (notification-adjacent).

## Task
Service-worker registration on donor devices, VAPID key generation/storage
in server env, a subscription-storage table/column, and a `sendPush(donorId,
payload)` utility that writes a delivery outcome to `notifications` (schema
arrives with Unit 33 in M4 — for now, stub the write or add a minimal
notifications table here if Unit 33 hasn't landed; do not duplicate the table
if it already exists). Payload shape: blood group, destination bank,
urgency, deep link.

## Read before writing
None yet for this specific integration — this is the first push-notification
unit. Check Unit 33's plan before adding a `notifications` table so it isn't
created twice.

## Constraints
9. **No new infrastructure.** Web Push over VAPID only — no third-party push
service, no message queue.
Scope limit: this unit does not call `sendPush` from any real event yet —
that wiring happens in Unit 22 (request created) and later units. This unit
only proves the mechanism works.

## Reference
PRD.md §10.1, §10.3 (bot constraint — not directly relevant here but read
it). Paste current docs for the Web Push API and VAPID before implementing —
do not rely on training data.

## Verify when done
- [ ] A test push sent via `sendPush` is received by a subscribed browser
      and a delivery outcome is recorded
- [ ] Service worker registers on donor registration, not on every page load
- [ ] existing features still work
- [ ] npm run lint passes
