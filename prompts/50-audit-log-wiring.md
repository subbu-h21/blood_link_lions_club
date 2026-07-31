# Unit 50 — Wire A6 to real data (coordinator-only)

**Milestone:** M5
**Depends on:** 05, 39, 49

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.1 A6, §9.3, §12 Epic 6/7 overlap.

## Task
Wire A6 to real `audit_log` rows, paginated. Gate the entire route at
Unit 05's middleware level for `coordinator` only — an `admin` session must
be rejected server-side, not just have the nav link hidden.

## Read before writing
Unit 05's middleware — extend its role check, do not add a second ad-hoc
check inside the page component.

## Constraints
1. **The browser never talks to the database.**
4. **Never fetch a whole table into the browser.** Paginate.
Scope limit: `coordinator` only, enforced at the same layer as every other
cross-portal rule.

## Reference
PRD.md §9.1 ("A6 · Audit log `/admin/audit` — coordinator role only").

## Verify when done
- [ ] An `admin`-role session (non-coordinator) is rejected server-side from
      this route
- [ ] Audit list is real, paginated, and matches every write from Units 39
      and 41
- [ ] existing features still work
- [ ] npm run lint passes
