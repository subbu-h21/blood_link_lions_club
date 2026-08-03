-- Unit 41: A3 donor lookup's reveal action is a new, third phone-
-- disclosure channel (region-scoped admin/coordinator lookup, tied to a
-- specific open request + a required reason, not an accepted-prospect
-- relationship) - confirmed with the project owner before writing any
-- code (see prompts/README.md's Unit 41 entry and CLAUDE.md rule 3's own
-- updated wording). Rate-limiting reveals per admin per hour is the
-- project owner's own explicit requirement ("enumerating a region's
-- donors one reveal at a time should be visibly abnormal in the audit
-- log, and the log only helps if someone can spot the pattern") - a
-- timing/threshold parameter, so it lives in app_settings like every
-- other one (CLAUDE.md "Timing parameters"), never hardcoded.
insert into app_settings (key, value, description) values
  ('admin.donor_reveal_rate_limit_per_hour', '20',
    'Max A3 donor-lookup contact reveals one admin/coordinator may perform per rolling hour, counted from their own audit_log view_contact rows - a safeguard against silently enumerating a whole region''s donor phone numbers one reveal at a time')
on conflict (key) do nothing;
