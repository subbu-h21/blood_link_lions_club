# Unit 27 — B3 + B4 UI (hardcoded)

**Milestone:** M3
**Depends on:** 11

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §8.1 B3, B4. This unit exists specifically so donation
confirmation is not skipped between M2's bank-portal work and the rest of
M3 — it is the one path that resets a donor's eligibility clock and must not
fall through the cracks.

## Task
B3 incoming prospects: donors scheduled to attend this bank — name, phone,
blood group, request reference — with actions **Arrived (screening)** →
**Donated** / **Rejected** / **No show**. B4 confirm-donation: confirms or
corrects the donor's blood group, hardcoded form only. Mock data throughout.

## Read before writing
Unit 11's bank-portal screens and nav shell — B3/B4 slot into the same
shell, do not duplicate it.

## Constraints
3. **Donor phone numbers pass through exactly one serialisation layer.** Even
in this mocked unit, do not invent a second ad-hoc way of formatting/showing
the phone number — reuse whatever shape Unit 07 defined.
8. **Every user-facing string exists in both English and Kannada.**

## Reference
PRD.md §8.1 B3, B4 full field/action lists.

## Verify when done
- [ ] B3 lists mock prospects with all four status actions available
- [ ] B4's confirm-donation form is reachable from B3 and shows a
      group-correction control
- [ ] existing features still work
- [ ] npm run lint passes
