-- Unit 46: reports schema (PRD.md §4.6, §11.1). Schema only, per this
-- unit's own task text and CLAUDE.md rule 10 ("write the migration before
-- the UI") - Unit 47 builds A5's hardcoded UI, Unit 48 wires it to this
-- table.
--
-- reporter_id/subject_id have no explicit not-null marker in PRD's own
-- text, but a report naming neither who reported nor who was reported is
-- meaningless - the same "obviously required FK" treatment already given
-- to every other bare FK in this schema (bank_stock.bank_id, Unit 07;
-- admin_rota/audit_log's own FKs, Unit 33). reason is not null, matching
-- PRD's own literal marker; details stays nullable - optional supporting
-- text, same treatment as audit_log.metadata. status stays plain text
-- with no check constraint, matching PRD's own literal text (only a
-- default 'open' is given anywhere in PRD/SPEC - no exhaustive value list
-- the way stage/status/close_reason/role/blood_group have elsewhere in
-- this schema), not invented here.
--
-- No PRD screen (D1-D6, S1-S5) currently has a report-submission entry
-- point - SPEC.md S2 mentions a "block-and-report button" but no screen ID
-- exists for it. Tracked as an open item in prompts/README.md's "Open
-- decisions" section (not this unit's job to invent one); Unit 48's admin
-- side can read/act on rows in this table regardless of how they arrive.
create table reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles (id),
  subject_id   uuid not null references profiles (id),
  reason       text not null,
  details      text,
  status       text not null default 'open',
  created_at   timestamptz not null default now()
);
create index reports_reporter_id_idx on reports (reporter_id);
create index reports_subject_id_idx on reports (subject_id);
create index reports_status_idx on reports (status);

-- RLS in the same migration as table creation (M1 review, Unit 06
-- precedent) - service_role already has grants via Unit 04's
-- default-privilege rule; anon/authenticated get neither grants nor RLS
-- policies.
alter table reports enable row level security;
