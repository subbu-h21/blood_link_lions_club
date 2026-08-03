-- Unit 33: admin operations schema (PRD.md §4.6, §9.2, §9.3).
--
-- notifications already exists (Unit 18's push_notifications migration -
-- its own comment explicitly anticipates this unit checking first, per
-- this unit's own task text: "if Unit 18 didn't already create the
-- latter"). Confirmed via schema grep before writing this migration - not
-- created a second time here.
--
-- The seven SPEC.md §5 timing values this unit's own task text also asks
-- to seed were likewise already inserted into app_settings by Unit 02
-- (verbatim match: same nine keys covering all seven rows, same
-- suggested defaults, already commented "owned by the Lions Club per
-- PRD.md §15 item 1" in that migration's own text). Nothing to add here
-- either - see prompts/README.md's Unit 33 entry for the full
-- explanation. This migration's only real scope is admin_rota and
-- audit_log.
--
-- admin_rota (PRD.md §4.6): region_id/admin_id have no explicit not-null
-- marker in PRD's own text, but a rota row naming neither a region nor an
-- admin is meaningless - same "obviously required FK" treatment already
-- given to bank_stock.bank_id (Unit 07), requests/prospects' several FKs
-- (Unit 16), and notifications.donor_id (Unit 18). priority's own PRD
-- comment ("1 = primary, 2 = secondary") names exactly two meaningful
-- values - added as a check constraint, matching this codebase's existing
-- style for every other finite-value column (stage, status, close_reason,
-- role, blood_group). A partial unique index enforces exactly one active
-- admin per (region, priority) - Units 39/44 both read "the" primary
-- admin for a region as a singular, deterministic value (transfer of
-- ownership, no-prospect escalation), so the schema should not allow two
-- simultaneously-active primaries to exist. District-coordinator
-- escalation (§9.2's third tier) is not represented here - PRD's own
-- admin_rota schema only names two priority levels, and SPEC.md §3 item 1
-- describes the coordinator as a role-wide fallback ("District
-- coordinator as fallback"), resolved by profiles.role = 'coordinator'
-- directly, not a rota row.
create table admin_rota (
  id          uuid primary key default gen_random_uuid(),
  region_id   uuid not null references regions (id),
  admin_id    uuid not null references profiles (id),
  priority    int not null check (priority in (1, 2)),
  is_active   boolean not null default true
);
create index admin_rota_region_id_idx on admin_rota (region_id);
create index admin_rota_admin_id_idx on admin_rota (admin_id);

create unique index one_active_admin_per_region_priority
  on admin_rota (region_id, priority)
  where is_active = true;

-- audit_log (PRD.md §4.6): action/entity_type are already `not null` in
-- PRD's own text. actor_id and entity_id are bare there, but every
-- planned use across prompts/*.md (view_contact, close_request,
-- transfer, block_user) always names both who did it and what it was
-- done to - same "obviously required" reasoning as admin_rota above.
-- metadata stays nullable - genuinely optional extra context, not every
-- action needs it. action is plain text, not a check-constrained enum:
-- PRD's own comment ("'view_contact', 'close_request', ...") is an
-- open-ended example list, not an exhaustive one, unlike stage/status/
-- close_reason elsewhere in this schema.
create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid not null references profiles (id),
  action       text not null,
  entity_type  text not null,
  entity_id    uuid not null,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index audit_log_actor_id_idx on audit_log (actor_id);
create index audit_log_entity_idx on audit_log (entity_type, entity_id);

-- RLS in the same migration as table creation (M1 review, Unit 06
-- precedent) - service_role already has grants via Unit 04's
-- default-privilege rule; anon/authenticated get neither grants (Unit
-- 06's default-privilege fix) nor RLS policies.
alter table admin_rota enable row level security;
alter table audit_log enable row level security;
