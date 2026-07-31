# Unit 41 — Wire A3 to real data + audit on reveal

**Milestone:** M4
**Depends on:** 33, 39, 40

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.3, §12 Epic 6, CLAUDE.md rule 3 and rule 4.

## Task
A3 searches real donors scoped to the admin's region, paginated. The reveal
action calls the same phone-serialisation path Unit 39 established — do not
write a second one — and writes an `audit_log` row on every reveal, no
exceptions, matching Unit 39's action string convention.

## Read before writing
Unit 39's phone-reveal and audit-log logic — reuse the same function calls.

## Constraints
3. **Donor phone numbers pass through exactly one serialisation layer.**
4. **Never fetch a whole table into the browser.** This is explicitly the
regional donor list — paginate it.
Scope limit: results are region-scoped, never a cross-region donor list.

## Reference
PRD.md §12 Epic 6 ("Every contact reveal writes an audit row").

## Verify when done
- [ ] Every reveal on this screen writes an `audit_log` row via the same
      function Unit 39 uses, verified by checking there's one reveal
      implementation, not two
- [ ] Search results are paginated and region-scoped
- [ ] existing features still work
- [ ] npm run lint passes
