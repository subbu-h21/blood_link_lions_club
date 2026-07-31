-- Unit 09: real bank-staff email+password auth needs two things Unit 02's
-- schema didn't anticipate.
--
-- 1. profiles.phone was `not null unique` for every role (PRD.md §4.2
--    literally), written with phone-OTP roles (searcher/donor) in mind.
--    bank_staff/admin/coordinator accounts (email+password, per
--    CLAUDE.md Conventions) have no phone at all. Same category of fix as
--    Unit 04's full_name correction - PRD.md §4.2 needs updating to match
--    (see prompts/README.md "PRD corrections needed"). Postgres UNIQUE
--    already treats every NULL as distinct, so multiple phone-less
--    profiles coexist fine with no partial index needed.
alter table profiles alter column phone drop not null;

-- 2. Forced password-reset-on-first-login (Unit 08's UI, mocked; this
--    unit wires it for real) needs a durable, server-only-writable flag.
--    Kept role-agnostic and on `profiles` - the same table role/bank_id/
--    is_blocked already live on - rather than a bank_staff-specific
--    column, since Unit 35 needs the identical mechanism for admin/
--    coordinator accounts and should add a role to a check, not invent a
--    second flag.
alter table profiles
  add column must_reset_password boolean not null default false;

-- 3. Extend Unit 05's custom_access_token_hook (create or replace, never
--    edit a merged migration) to also carry must_reset_password into the
--    JWT, the same way it already carries profile_role - so
--    lib/supabase/proxy.ts's gate can force a reset without a
--    per-request DB round trip.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  claims jsonb;
  profile_role text;
  reset_required boolean;
begin
  select role, must_reset_password into profile_role, reset_required
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  if jsonb_typeof(claims->'app_metadata') is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  end if;
  claims := jsonb_set(
    claims,
    '{app_metadata, profile_role}',
    to_jsonb(coalesce(profile_role, 'searcher'))
  );
  claims := jsonb_set(
    claims,
    '{app_metadata, must_reset_password}',
    to_jsonb(coalesce(reset_required, false))
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;
