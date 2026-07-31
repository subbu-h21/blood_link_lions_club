# Unit 49 — A6 audit log UI (hardcoded)

**Milestone:** M5
**Depends on:** 36

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.1 A6 ("coordinator role only").

## Task
Build `/admin/audit`: a read-only, filterable list of `audit_log` entries
(actor, action, entity, timestamp). Hardcoded mock data. Render a visible
"coordinator access only" indicator so the role restriction is obvious even
before Unit 50 enforces it for real.

## Read before writing
Unit 39's and Unit 41's audit-log writes — this screen's mock row shape
should match exactly what those units actually write, so Unit 50's wiring
is a straight read, not a reshape.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: mock data only.

## Reference
PRD.md §9.1 A6.

## Verify when done
- [ ] Audit list renders and filters against mock data matching the real
      `audit_log` row shape
- [ ] existing features still work
- [ ] npm run lint passes
