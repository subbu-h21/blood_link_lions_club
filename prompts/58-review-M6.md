# Unit 58 — Review gate: M6

**Milestone:** M6
**Depends on:** 55, 56, 57

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §14, §13 (M6 = "Operational visibility"), §12 (full
re-check — this is the last milestone in the current build order).

## Task
Review milestone M6 before treating the build as feature-complete against
this PRD. Invoke the `security-review` skill against the current diff. Check
that all eight §14 metrics are present and none of them is registered-donor
count presented as success. Re-check CLAUDE.md rules 1, 3, and 6 by name.
Since this closes out the full build order, also confirm every item in
prompts/README.md's "PRD corrections needed" and "[DECIDE]" sections has
either been resolved or is still explicitly open — do not let one quietly
disappear unaddressed.

## Read before writing
All of Units 55–57. Also re-read prompts/README.md in full before signing
off this review.

## Constraints
1. **The browser never talks to the database.**
3. **Donor phone numbers pass through exactly one serialisation layer.**
6. **Search stays public.**
This unit produces findings, not new features.

## Reference
PRD.md §14, §12 (as a final full-scope sanity check), prompts/README.md.

## Verify when done
- [ ] All eight §14 metrics are live and correctly computed
- [ ] Every open item in prompts/README.md is still tracked, none silently
      dropped
- [ ] security-review skill run with zero unresolved BLOCKERs
- [ ] existing features still work
- [ ] npm run lint passes
