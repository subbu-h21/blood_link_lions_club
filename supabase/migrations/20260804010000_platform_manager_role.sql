-- Platform manager portal: the fifth account tier. Closes
-- prompts/README.md "Open decisions #1" — before this migration, nothing
-- in the app could create a region, a pincode, or an admin account; a
-- developer had to run scripts/seed.mjs / scripts/seed-bank-accounts.mjs
-- by hand. This migration only adds what the new role needs that doesn't
-- already exist: `regions`, `pincodes`, `admin_rota` (Units 02/33) already
-- have the right shape, RLS enabled, and zero anon/authenticated grants —
-- the service-role client (lib/db/client.ts createDbClient()) is the only
-- thing that will ever write through this feature, same trust model as
-- every other admin action in this codebase.

-- profiles.role's check constraint is a column-level constraint declared
-- inline in Unit 02's CREATE TABLE, so Postgres auto-named it
-- profiles_role_check (its standard "<table>_<column>_check" convention
-- for an unnamed single-column check) — confirmed no later migration
-- renamed or redefined it (grepped every migration for "role_check" and
-- "alter table profiles" before writing this).
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('searcher', 'donor', 'bank_staff', 'admin', 'coordinator', 'platform_manager'));

-- custom_access_token_hook (Unit 05, extended Unit 09) already reads
-- profiles.role and profiles.must_reset_password generically — no
-- hardcoded role list there — so platform_manager needs no hook change
-- to reach the JWT's app_metadata.profile_role claim that
-- lib/supabase/proxy.ts's route gate reads.

-- No new table and no new Postgres function. Assigning an admin as
-- primary/backup for a region (admin_rota) needs to replace any existing
-- active row for that (region_id, priority) pair, not add a second one —
-- the table's own one_active_admin_per_region_priority unique index
-- (Unit 33) would otherwise reject the insert. This is done as a plain
-- sequential-write TS function (lib/db/platform-admins.ts
-- assignAdminRota()), matching this codebase's own established
-- convention for multi-step app-level writes (e.g. lib/db/requests.ts's
-- syncRequestStageAfterProspectChange) rather than introducing a new
-- security-definer-function pattern — the only security definer function
-- anywhere in this codebase is custom_access_token_hook, and only
-- because it must bypass RLS as a different role (supabase_auth_admin);
-- that requirement doesn't apply here since createDbClient() already
-- bypasses RLS directly.
