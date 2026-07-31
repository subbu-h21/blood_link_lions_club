# Unit 44 — Escalation engine

**Milestone:** M4
**Depends on:** 33, 37, 39

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §9.2 (full table), §9.3, SPEC.md §4.4, §5.

## Task
`pg_cron`/`pg-boss` jobs implementing every row of PRD.md §9.2: no-prospect
timeout notifies the primary admin (0 min if emergency); any prospect
reaching `accepted` notifies the primary admin immediately; zero donors
matched at creation notifies immediately (this is the real consumer of Unit
22's zero-match signal); admin inaction escalates to the secondary admin,
then to the district coordinator; every threshold read from `app_settings`
seeded in Unit 33.

## Read before writing
Unit 22's zero-match signal — this unit is what finally acts on it. Unit
33's `admin_rota` and timing values. Unit 18's `sendPush`, reused for admin
notifications.

## Constraints
9. **No new infrastructure.** `pg_cron`/`pg-boss` only.
Scope limit: this unit notifies; it does not take ownership on the admin's
behalf — that remains a human action via Unit 39's take-ownership.

## Reference
PRD.md §9.2 (all seven rows), §12 Epic 6 ("Escalation fires at configured
thresholds", "Unowned request with prospects raises an alert").

## Verify when done
- [ ] Each of the seven §9.2 triggers fires at its configured
      `app_settings` threshold, verified by adjusting the setting and
      re-testing, not by trusting a hardcoded assumption
- [ ] An unowned request with live prospects is visibly flagged as an alert
      condition
- [ ] existing features still work
- [ ] npm run lint passes
