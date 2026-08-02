-- Unit 20: Donor registration wiring (PRD.md §7.1 D1, §4.3; SPEC.md §11.1).
--
-- consent_at/consent_version aren't in PRD.md §4.3's literal column list,
-- but SPEC.md §11.1 requires a timestamped, versioned consent record.
-- donors has zero rows as of this migration (nothing has written to it
-- yet - D1 wiring is what first does), so both can be added `not null`
-- directly with no backfill needed, matching Unit 16's own precedent of
-- adding `not null` beyond PRD's literal text when the invariant is
-- genuinely required.
alter table donors add column consent_at timestamptz not null;
alter table donors add column consent_version text not null;
