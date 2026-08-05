-- Donor multi-pincode availability (2026-08-05, user-requested): a donor
-- keeps their existing single "home" pincode/region on `donors` exactly
-- as before (zero behavior change for a donor with none of these rows),
-- and can additionally list PIN codes they're willing to travel to
-- donate at. lib/db/matching.ts's findEligibleDonors and
-- lib/matching/eligibility.ts's isDonorEligible both read this
-- alongside the donor's home region - see those files for how a
-- donor's full eligible-region set is assembled.
--
-- Primary key (donor_id, pincode) is both the natural key and the
-- authoritative duplicate guard - lib/db/donors.ts's
-- addAvailabilityPincode() does a friendly pre-check but this constraint
-- is what actually can't be beaten, same "DB constraint is the real
-- rule" pattern as every other uniqueness requirement in this codebase.
create table donor_availability_pincodes (
  donor_id    uuid not null references donors (id),
  pincode     text not null references pincodes (code),
  region_id   uuid not null references regions (id),
  created_at  timestamptz not null default now(),
  primary key (donor_id, pincode)
);
create index donor_availability_pincodes_donor_id_idx on donor_availability_pincodes (donor_id);
create index donor_availability_pincodes_region_id_idx on donor_availability_pincodes (region_id);

-- RLS enabled with no policies, service-role-only access via
-- lib/db/client.ts's createDbClient() - same deny-by-default backstop
-- every other table in this codebase uses. No explicit `grant ... to
-- service_role` needed here - Unit 04's own
-- `alter default privileges in schema public grant select, insert,
-- update, delete on tables to service_role` already covers every table
-- created by any later migration, confirmed by grep: no migration since
-- Unit 04 has repeated that grant for its own new tables either.
alter table donor_availability_pincodes enable row level security;
