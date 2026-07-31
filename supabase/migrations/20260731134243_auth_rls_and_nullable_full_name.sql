-- Unit 04: real auth needs two corrections to Unit 02's schema.
--
-- 1. profiles.full_name was NOT NULL, but a bare phone-verified searcher
--    (raising a request) never provides a name anywhere in PRD.md's flow -
--    only donor registration (Unit 19/20) collects one. Never edit a
--    merged migration (CLAUDE.md); correct it here instead.
alter table profiles alter column full_name drop not null;

-- 2. CLAUDE.md rule 1: "RLS is defence in depth, never the primary access
--    control." The primary control is that only server actions/routes
--    touch these tables (lib/db/, using the secret key) - RLS enabled
--    with no policies is the backstop, so a browser client accidentally
--    pointed at these tables (using the publishable key) gets nothing.
alter table regions enable row level security;
alter table pincodes enable row level security;
alter table region_adjacency enable row level security;
alter table blood_banks enable row level security;
alter table profiles enable row level security;
alter table donors enable row level security;
alter table app_settings enable row level security;

-- 3. Enabling RLS alone isn't enough - service_role (lib/db/client.ts's
--    secret key) still needs the ordinary Postgres table grants that
--    BYPASSRLS doesn't substitute for. Discovered when Unit 04's
--    ensureProfile() hit "permission denied for table profiles" against
--    a from-scratch local db (Supabase's hosted platform sets this up
--    automatically; the local CLI stack does not). Grant existing tables
--    explicitly, then default-privilege every table any later unit's
--    migration creates, so this doesn't recur in Units 07, 16, 33, 46.
grant select, insert, update, delete on
  regions, pincodes, region_adjacency, blood_banks, profiles, donors, app_settings
to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
