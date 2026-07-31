# Unit 29 — S5 request status UI (hardcoded)

**Milestone:** M3
**Depends on:** 21

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §6.1 S5.

## Task
Build `/request/[id]`: current stage in plain language (never raw enum
names), counts of donors notified/accepted, admin name and phone once
assigned, buttons for "Contact admin" and "Cancel request" (reason
required, using a select of the close-reason list). Never render a donor
phone number anywhere on this screen — mock this explicitly by never even
including donor-phone fields in this screen's mock data shape. Hardcoded
data only.

## Read before writing
Unit 21's S4 form — this is where a submitted request lands.

## Constraints
3. **Donor phone numbers pass through exactly one serialisation layer.**
Never to a requester before acceptance, never in any search response — this
screen's mock data must not contain a donor phone field at all, not just
hide it in the render.
8. **Every user-facing string exists in both English and Kannada.**

## Reference
PRD.md §6.1 S5 full field/action list.

## Verify when done
- [ ] Stage renders as plain language, never an enum string like
      `finding_prospects`
- [ ] Cancel flow requires a reason before it can be confirmed
- [ ] No donor phone field exists anywhere in this unit's mock data
- [ ] existing features still work
- [ ] npm run lint passes
