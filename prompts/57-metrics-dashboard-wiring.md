# Unit 57 — Wire metrics dashboard to real data

**Milestone:** M6
**Depends on:** 55, 56

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §14.

## Task
Replace Unit 56's mock numbers with real calls into Unit 55's aggregation
module. Add a date-range control if the underlying queries support one;
otherwise show the full-history figure and say so explicitly rather than
implying a range that isn't actually applied.

## Read before writing
Unit 55's aggregation module — call it directly, do not reimplement any
metric calculation in the UI layer.

## Constraints
1. **The browser never talks to the database.** The dashboard calls Unit
55's module through a server route/action, never a direct query from a
client component.
Scope limit: no new metrics beyond PRD.md §14's eight.

## Reference
PRD.md §14.

## Verify when done
- [ ] Dashboard renders real numbers from Unit 55's module, matching a
      manual spot-check against the database
- [ ] existing features still work
- [ ] npm run lint passes
