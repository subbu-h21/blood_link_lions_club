# Unit 23 — D2 + D3 UI (hardcoded)

**Milestone:** M3
**Depends on:** 19

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §7.1 D2, D3.

## Task
D2 donor home: eligibility state (available / cooldown with return date),
availability toggle, pause control, active-pledge card placeholder. D3
request detail: blood group needed, destination bank, urgency, region, three
buttons — **I can donate** / **Not now** / **Not for a while** (with a
days-picker for the pause). Show an "already handled, thank you" state
variant. All against hardcoded mock data.

## Read before writing
Unit 19's donor shell and D1 output shape — D2's eligibility state should
read the same donor-shape fields Unit 20 will eventually populate for real.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: buttons update local mock state only, no server call yet.

## Reference
PRD.md §7.1 D2, D3 full field/element lists.

## Verify when done
- [ ] D2 renders both eligibility states (available and cooldown-with-date)
- [ ] D3's three buttons each produce a distinct visible mock outcome,
      including the "already handled" variant
- [ ] existing features still work
- [ ] npm run lint passes
