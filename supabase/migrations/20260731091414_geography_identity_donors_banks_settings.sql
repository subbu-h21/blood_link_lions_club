-- Unit 02: geography, identity, donors, base blood_banks, app_settings.
-- PRD.md §4.1-4.4. bank_stock/bank_shortages/opening_hours/policy_notes
-- arrive in Unit 07; requests/prospects arrive in Unit 16.

create table regions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  district    text not null,
  state       text not null,
  created_at  timestamptz not null default now()
);

create table pincodes (
  code         text primary key,
  region_id    uuid not null references regions (id),
  office_name  text,
  taluk        text,
  district     text
);
create index pincodes_region_id_idx on pincodes (region_id);

create table region_adjacency (
  region_id            uuid not null references regions (id),
  neighbour_region_id  uuid not null references regions (id),
  primary key (region_id, neighbour_region_id),
  constraint region_adjacency_no_self_reference
    check (region_id <> neighbour_region_id)
);

-- Base fields only — stock, opening_hours, policy_notes arrive in Unit 07.
create table blood_banks (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  region_id     uuid not null references regions (id),
  pincode       text references pincodes (code),
  address       text not null,
  phone         text not null,
  licence_no    text,
  is_verified   boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index blood_banks_region_id_idx on blood_banks (region_id);

create table profiles (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  full_name   text not null,
  role        text not null check (role in
                ('searcher', 'donor', 'bank_staff', 'admin', 'coordinator')),
  region_id   uuid references regions (id),
  bank_id     uuid references blood_banks (id),
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index profiles_region_id_idx on profiles (region_id);

-- donors.id = profiles.id (PRD.md §4.3). No auth.users FK yet — that
-- linkage is Unit 04's concern, not this migration's.
create table donors (
  id                 uuid primary key references profiles (id),
  blood_group        text not null check (blood_group in
                       ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  group_verified_at  timestamptz,
  dob                date not null,
  sex                text,
  pincode            text references pincodes (code),
  region_id          uuid references regions (id),
  is_available       boolean not null default true,
  paused_until       timestamptz,
  last_donation_at   timestamptz,
  eligible_from      timestamptz,
  notif_count_month  int not null default 0,
  notif_month        date,
  last_confirmed_at  timestamptz,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now()
);
create index donors_region_id_idx on donors (region_id);
create index donors_pincode_idx on donors (pincode);

-- Key/value timing-parameter store (CLAUDE.md "Timing parameters" —
-- values are tuned by non-developers, never hardcoded in application
-- code). Not defined as SQL anywhere in PRD.md/SPEC.md; this shape is
-- this migration's own design.
create table app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- SPEC.md §5 suggested starting values — all owned by the Lions Club
-- per PRD.md §15 item 1; change the row, not the code that reads it.
insert into app_settings (key, value, description) values
  ('escalation.no_prospect_normal_minutes', '20',
    'Minutes with zero prospects before the primary admin is notified (normal urgency)'),
  ('escalation.no_prospect_emergency_minutes', '0',
    'Same trigger, emergency urgency — notify immediately'),
  ('escalation.admin_inaction_minutes', '15',
    'Minutes after primary-admin notification before escalating to the secondary admin'),
  ('escalation.secondary_inaction_minutes', '15',
    'Minutes after secondary-admin notification before escalating to the district coordinator'),
  ('request.idle_prompt_hours', '12',
    '"Still needed?" prompt sent to the requester after this many idle hours'),
  ('request.expiry_hours', '48',
    'Auto-close an idle request with reason expired after this many hours'),
  ('donor.notif_cap_per_month', '6',
    'Donors are excluded from matching once notified this many times in a month'),
  ('bank.stock_freshness_hours', '6',
    'Stock figures older than this are shown greyed out with an explicit age'),
  ('donor.cooldown_months', '3',
    'Months of ineligibility after a confirmed donation')
on conflict (key) do nothing;
