-- Unit 07: bank_stock, bank_shortages, search_logs, plus the two
-- blood_banks columns Unit 02 deferred (opening_hours, policy_notes).
-- PRD.md §4.4. policy_notes is admin-visible only (PRD.md's own inline
-- comment on that column) - lib/serialise/bank.ts's public BankCard
-- shape must never include it.

alter table blood_banks
  add column opening_hours jsonb,
  add column policy_notes text;

create table bank_stock (
  id          uuid primary key default gen_random_uuid(),
  bank_id     uuid not null references blood_banks (id),
  blood_group text not null check (blood_group in
                ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  component   text not null default 'whole_blood',
  units       int not null check (units >= 0),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles (id),
  unique (bank_id, blood_group, component)
);
create index bank_stock_bank_id_idx on bank_stock (bank_id);

create table bank_shortages (
  id           uuid primary key default gen_random_uuid(),
  bank_id      uuid not null references blood_banks (id),
  blood_group  text not null check (blood_group in
                 ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_needed int not null check (units_needed > 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index bank_shortages_bank_id_idx on bank_shortages (bank_id);

-- Minimal shape for PRD.md §6.2 "Every search logged" - schema not
-- defined anywhere in PRD.md/SPEC.md (prompts/README.md implementation
-- notes). No retention/PII policy decided; store only these fields.
create table search_logs (
  id                    uuid primary key default gen_random_uuid(),
  region_id             uuid references regions (id),
  blood_group           text check (blood_group in
                          ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  pincode_or_town_input text,
  searched_at           timestamptz not null default now()
);

-- RLS in the same migration as table creation, every time from here on
-- (M1 review, Unit 06) - service_role already has grants via Unit 02's
-- default-privilege rule; anon/authenticated get neither grants (Unit
-- 06's default-privilege fix) nor RLS policies.
alter table bank_stock enable row level security;
alter table bank_shortages enable row level security;
alter table search_logs enable row level security;
