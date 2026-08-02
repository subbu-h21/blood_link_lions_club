-- Unit 16: requests + prospects (PRD.md §4.5), M3's core tables.
--
-- requests.stage is a plain column here, no trigger - CLAUDE.md's "stage
-- is derived from its prospects, never set independently" is enforced
-- by application code in Units 22/28, not a DB trigger (this unit's own
-- scope limit: don't write two stage-setting code paths from one
-- migration).
--
-- NOT NULL beyond PRD.md §4.5's own literal markers, resolved by
-- cross-referencing PRD.md §6.1 S4's field list ("Fields: blood group,
-- component, units, destination bank ..., urgency, optional patient
-- first name" - patient_name is the *only* one called optional there),
-- and matching the same precedent Unit 07 already set for bank_stock.
-- bank_id (an FK the row is meaningless without, not null even though
-- PRD's SQL notation omitted the marker there too):
--   - blood_group, units_needed already `not null` in PRD's own text.
--   - component, destination_bank_id, urgency: not null, per §6.1 above.
--   - region_id: not null - CLAUDE.md's domain vocabulary calls a region
--     the "unit of admin ownership"; a request with no region could
--     never be owned by any admin. Not one of S4's own form fields
--     (presumably derived server-side from the destination bank's own
--     region, not typed by the requester), so this inference leans on
--     the domain-vocabulary section rather than the S4 field list.
--   - requester_profile_id: left nullable - unlike the above, this is a
--     convenience link, not the request's core identity (that's
--     requester_phone, already `not null`).
--   - prospects.request_id/donor_id: not null - same "FK the row is
--     meaningless without" reasoning, reinforced by `unique
--     (request_id, donor_id)` below: a null FK would let duplicate
--     (request, donor) pairs slip through, since SQL UNIQUE treats every
--     NULL as distinct from every other NULL.
-- created_at/updated_at/invited_at: `not null default now()`, matching
-- every previous table's own convention in this project even where
-- PRD.md's literal SQL omits the marker (same treatment Unit 02 gave
-- every earlier table).

create table requests (
  id                    uuid primary key default gen_random_uuid(),
  requester_phone       text not null,
  requester_profile_id  uuid references profiles (id),
  patient_name          text,
  blood_group           text not null check (blood_group in
                          ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component             text not null default 'whole_blood',
  units_needed          int not null check (units_needed between 1 and 10),
  destination_bank_id   uuid not null references blood_banks (id),
  region_id             uuid not null references regions (id),
  urgency               text not null check (urgency in ('normal', 'emergency')),
  stage                 text not null check (stage in
                          ('finding_prospects', 'evaluating_prospects',
                           'scheduled', 'resolved', 'closed')),
  close_reason          text check (close_reason in
                          ('found_elsewhere', 'no_longer_needed',
                           'no_donor_found', 'expired', 'abusive')),
  owner_admin_id        uuid references profiles (id),
  admin_notified_at     timestamptz,
  escalated_at          timestamptz,
  expires_at            timestamptz not null,
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index requests_region_id_idx on requests (region_id);
create index requests_requester_profile_id_idx on requests (requester_profile_id);
create index requests_owner_admin_id_idx on requests (owner_admin_id);
create index requests_destination_bank_id_idx on requests (destination_bank_id);

create table prospects (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references requests (id),
  donor_id      uuid not null references donors (id),
  status        text not null check (status in
                  ('invited', 'accepted', 'screening', 'donated',
                   'rejected', 'no_show', 'stood_down')),
  invited_at    timestamptz not null default now(),
  responded_at  timestamptz,
  screened_at   timestamptz,
  outcome_at    timestamptz,
  admin_notes   text,
  unique (request_id, donor_id)
);
create index prospects_request_id_idx on prospects (request_id);
create index prospects_donor_id_idx on prospects (donor_id);

-- Partial unique indexes verbatim from PRD.md §4.5 - the two critical
-- invariants (CLAUDE.md "Data model invariants").
create unique index one_open_request_per_phone
  on requests (requester_phone)
  where stage not in ('resolved', 'closed');

create unique index one_active_pledge_per_donor
  on prospects (donor_id)
  where status in ('accepted', 'screening');

-- RLS in the same migration as table creation (M1 review, Unit 06) -
-- service_role already has grants via Unit 04's default-privilege rule;
-- anon/authenticated get neither grants (Unit 06's default-privilege
-- fix) nor RLS policies.
alter table requests enable row level security;
alter table prospects enable row level security;
