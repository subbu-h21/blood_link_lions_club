-- PLACEHOLDER geography — dev/test only, never runs against production.
-- Real Sirsi PIN codes, blood banks, and adjacency have not been collected
-- yet (SPEC.md §10 item 3; prompts/README.md "Blocking on real data").
-- Swapping in the real dataset later means replacing this file's contents,
-- not touching the migration or the app code that reads it.

insert into regions (id, name, district, state) values
  ('00000000-0000-0000-0000-000000000001',
   'PLACEHOLDER — Sirsi', 'PLACEHOLDER district', 'Karnataka')
on conflict (id) do nothing;

insert into pincodes (code, region_id, office_name, taluk, district) values
  ('000001', '00000000-0000-0000-0000-000000000001',
    'PLACEHOLDER office 1', 'PLACEHOLDER taluk', 'PLACEHOLDER district'),
  ('000002', '00000000-0000-0000-0000-000000000001',
    'PLACEHOLDER office 2', 'PLACEHOLDER taluk', 'PLACEHOLDER district'),
  ('000003', '00000000-0000-0000-0000-000000000001',
    'PLACEHOLDER office 3', 'PLACEHOLDER taluk', 'PLACEHOLDER district')
on conflict (code) do nothing;

-- No second region exists yet, so there is no adjacency pair to seed.
-- The "adjacency is symmetric" validation check passes vacuously on zero
-- rows — that is expected, not a bug, until a real neighbouring region
-- is collected.

insert into blood_banks
  (id, name, region_id, pincode, address, phone, is_verified, is_active) values
  ('00000000-0000-0000-0000-000000000002',
    'PLACEHOLDER Blood Bank', '00000000-0000-0000-0000-000000000001',
    '000001', 'PLACEHOLDER address, Sirsi', '0000000000', true, true)
on conflict (id) do nothing;
