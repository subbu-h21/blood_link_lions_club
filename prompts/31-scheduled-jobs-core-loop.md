# Unit 31 — Scheduled jobs: notification budget, idle prompt, expiry

**Milestone:** M3
**Depends on:** 02, 16, 18, 22

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §6.2 (idle/expiry rows), §7.3 (notification budget), §9.2
(cron mechanism), SPEC.md §5 (suggested defaults).

## Task
Three `pg_cron`/`pg-boss` jobs against protected routes, all thresholds read
from `app_settings` (Unit 02), never hardcoded: (1) monthly reset of
`donors.notif_count_month`; (2) idle-request "still needed?" push at the
`app_settings`-configured idle threshold; (3) auto-close at the
expiry threshold with `close_reason = 'expired'`, using the same close path
Unit 30 built, not a second implementation.

## Read before writing
Unit 30's cancel/close logic — auto-expiry must call the same function.
Unit 18's `sendPush` — reuse for the idle prompt.

## Constraints
9. **No new infrastructure.** `pg_cron`/`pg-boss` only.
Timing parameters live in `app_settings`, not code — never hardcode a
threshold in this unit.
Scope limit: escalation-to-admin timers (no-prospect, admin-inaction) are
Unit 44 in M4, not this unit — this unit is requester/donor-facing timers
only.

## Reference
SPEC.md §5 (suggested starting values — seed these into `app_settings` if
Unit 02 didn't already). PRD.md §12 Epic 3 (idle/expiry items).

## Verify when done
- [ ] Idle request gets a "still needed?" prompt at the configured threshold
- [ ] Idle request with no reply auto-closes with reason `expired` at the
      configured threshold, via Unit 30's close path
- [ ] Notification counter resets monthly and a donor at cap is excluded from
      Unit 17's matching until reset
- [ ] existing features still work
- [ ] npm run lint passes
