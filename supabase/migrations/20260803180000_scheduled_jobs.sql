-- Unit 31 - Scheduled jobs: notification budget reset, idle prompt, expiry.
-- PRD.md §9.2/§7.3, SPEC.md §5. CLAUDE.md rule 9: "No new infrastructure...
-- Scheduled work uses pg_cron/pg-boss" - pg_cron (already bundled with the
-- Supabase Postgres image, just needs enabling) plus pg_net to call back
-- into a protected Next.js route, matching PRD.md §2's own "cron → protected
-- route" mechanism and this project's established rule that business logic
-- lives in lib/db/*.ts, never in a plpgsql function (a SQL-only version of
-- this job would have to reimplement Unit 30's cancelRequest/
-- standDownProspect logic a second time, in a different language).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- requests.idle_prompted_at (new column, additive migration - Unit 16's
-- migration is already merged and is never edited in place). Marks that
-- the 12h "still needed?" prompt has fired for this request so the cron
-- job doesn't re-fire it every run, and so S5 knows to render the banner.
-- Cleared (set back to null) by confirmStillNeeded when the requester
-- replies - this also resets updated_at, which is what both this job's
-- own re-fire check and the expiry job's "no activity" check key off of,
-- so a real reply genuinely restarts the 12h/48h clock rather than only
-- silencing the banner once.
alter table requests add column if not exists idle_prompted_at timestamptz null;

-- Local-dev-only placeholder values, stored in Supabase Vault rather than
-- a plain GUC - `alter database ... set app.settings.*` is blocked here
-- with "permission denied" even as the postgres role (confirmed live,
-- not assumed - this Postgres image locks that down, unlike a plain
-- self-hosted install). Vault is the Supabase-native, already-available
-- mechanism for exactly this (secret storage readable from SQL). Same
-- spirit as Unit 04's test-OTP numbers and Unit 09's TempPass123! - fine
-- to commit for local use, must be replaced with real values at any real
-- deployment. `cron_site_url` is what pg_net (running inside the
-- Postgres container) uses to reach the app - `host.docker.internal` is
-- Docker Desktop's standing name for the host machine, since `localhost`
-- from inside the container would resolve to the container itself, not
-- the Next.js dev server. Deliberately a separate value from the app's
-- own NEXT_PUBLIC_SITE_URL (frontend/.env.local, what a *browser* uses) -
-- the two are not interchangeable.
select vault.create_secret(
  'http://host.docker.internal:3000',
  'cron_site_url',
  'Base URL pg_net calls to reach the app''s /api/cron/* routes. Local-dev placeholder - replace at any real deployment.'
);
select vault.create_secret(
  'local-dev-cron-secret-change-in-production',
  'cron_secret',
  'Shared secret cron jobs present to /api/cron/* routes (checked against process.env.CRON_SECRET). Local-dev placeholder - replace at any real deployment.'
);

-- (1) Monthly reset of donors.notif_count_month (PRD.md §7.3). Not
-- strictly required for matching correctness - lib/matching/eligibility.ts's
-- isDonorEligible already treats a stale notif_month as "count doesn't
-- apply" (Unit 17), and lib/db/requests.ts's incrementNotifCounts already
-- lazily resets on the next write (Unit 22) - but a physical reset keeps
-- the stored value honest for any future direct reader that doesn't
-- replicate that same staleness check (A3 donor lookup, Unit 41; metrics,
-- Unit 55). Runs once, at midnight UTC on the 1st of the month.
select cron.schedule(
  'reset-notif-counts',
  '0 0 1 * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/reset-notif-counts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- (2) Idle-request "still needed?" prompt at request.idle_prompt_hours
-- (12h suggested, SPEC.md §5). Runs every 15 minutes - the threshold is
-- measured in hours, so per-minute precision isn't needed, and a
-- volunteer-run system at district scale doesn't need tighter polling.
select cron.schedule(
  'idle-request-prompt',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/idle-prompt',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- (3) Auto-close at request.expiry_hours (48h suggested) with
-- close_reason = 'expired', via Unit 30's cancelRequest - never a second
-- implementation of "what closing a request means."
select cron.schedule(
  'expire-idle-requests',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/expire-requests',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
