-- Unit 44 - Escalation engine: PRD.md §9.2 rows 1-5 (rows 6/7, "still
-- needed?" and auto-expiry, already scheduled in Unit 31). Same
-- pg_cron/pg_net -> protected-route pattern as Unit 31 - reuses that
-- unit's own `cron_site_url`/`cron_secret` Vault entries directly, no new
-- secrets needed (nothing about calling five more routes on the same
-- app, with the same shared secret, requires new storage).
--
-- All five run every minute, unlike Unit 31's 15-minute polling - that
-- unit's own thresholds were hours (12h/48h), where 15-minute granularity
-- is plenty; these thresholds are minutes (20/15/15, and 0 for the
-- emergency no-prospect case, which needs to fire as close to
-- immediately as a polling-only architecture allows), so the polling
-- interval needs to be meaningfully smaller than the threshold itself.

select cron.schedule(
  'escalate-no-prospect',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/escalate-no-prospect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'escalate-prospect-accepted',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/escalate-prospect-accepted',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'escalate-zero-match',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/escalate-zero-match',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'escalate-admin-inaction',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/escalate-admin-inaction',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'escalate-secondary-inaction',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_site_url') || '/api/cron/escalate-secondary-inaction',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
