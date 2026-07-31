# Unit 53 — Privacy notice + consent pages, consent capture hardening

**Milestone:** M5
**Depends on:** 20

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §11.1, §11.2, §11.3.

## Task
Static, i18n privacy-notice and terms pages reachable from every portal
(link in each shell's footer/nav), containing: the accurate consent wording
from §11.2, a named grievance contact, and the explicit prohibition on
selling/buying blood from §11.3. Then confirm Unit 20's `consent_at`/
`consent_version` capture actually references the version of *this* text —
bump the version if the wording here differs from what Unit 20 shipped with.

## Read before writing
Unit 20's `consent_version` field — this unit is the source of truth for
what that version number/string refers to; keep them in sync explicitly.

## Constraints
8. **Every user-facing string exists in both English and Kannada.**
Scope limit: content pages only, no new schema.

## Reference
PRD.md §11.1 ("Privacy notice reachable from every portal", "Named
grievance contact published"), §11.2, §11.3.

## Verify when done
- [ ] Privacy/terms pages are reachable from all four portal shells
- [ ] `consent_version` recorded at registration matches the version of the
      text actually shown
- [ ] existing features still work
- [ ] npm run lint passes
