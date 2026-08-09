-- Real Uttara Kannada district geography and blood banks (SPEC.md §10 item
-- 3; prompts/README.md "Blocking on real data"). Sourced 2026-08-08 from
-- e-RaktKosh's public Blood Bank Directory (Karnataka > Uttara Kannada —
-- confirmed the complete list via its own pagination, 5 banks total) for
-- bank name/address/phone, and India Post's PIN code directory for
-- pincodes (cross-checked against multiple independent sources).
--
-- is_verified = true here mirrors this file's existing dev-data
-- convention (makes these usable for local testing, matching how Kumta's
-- bank was already set up) — it is NOT a substitute for the phone-call
-- verification pass CLAUDE.md/SPEC.md still call for before this goes
-- anywhere near production; is_verified gates real things (public search
-- visibility, request routing — lib/db/search.ts, lib/db/blood-banks.ts).
--
-- region_adjacency is still empty on purpose — which regions border which
-- needs real local geographic knowledge (a map, or someone who knows the
-- district), not something to fabricate from a directory lookup. Actually
-- attempted this (2026-08-09): pulled a real Uttara Kannada taluk map and
-- looked at it directly. Karwar and Dandeli have Joida/Ambikanagara
-- visibly between them; Yellapur sits between Dandeli and Sirsi. Only
-- Kumta-Sirsi looked plausible (similar latitude, direct road, nothing
-- obviously between) and even that was only "moderate confidence" - not
-- solid enough to route a real emergency search on. Needs an actual GIS
-- boundary source or someone who knows the ground truth, not more
-- map-squinting.

insert into regions (id, name, district, state) values
  ('1b72f71a-bb81-4f1b-bb73-df09afe5fcf5', 'Kumta', 'Uttara Kannada', 'Karnataka'),
  ('00000000-0000-0000-0000-000000000001', 'Sirsi', 'Uttara Kannada', 'Karnataka'),
  ('00000000-0000-0000-0000-000000000003', 'Dandeli', 'Uttara Kannada', 'Karnataka'),
  ('00000000-0000-0000-0000-000000000004', 'Karwar', 'Uttara Kannada', 'Karnataka')
on conflict (id) do update set
  name = excluded.name, district = excluded.district, state = excluded.state;

-- The old 000001/000002/000003 PLACEHOLDER pincodes are gone — real Sirsi
-- pincodes replace them below. Nothing referenced them (checked live DB
-- before deleting: no blood_banks/donors/donor_availability_pincodes row
-- pointed at any of the three).
delete from pincodes where code in ('000001', '000002', '000003');

insert into pincodes (code, region_id, office_name, taluk, district) values
  ('581343', '1b72f71a-bb81-4f1b-bb73-df09afe5fcf5', null, null, null),
  ('581401', '00000000-0000-0000-0000-000000000001', null, 'sirsi', 'uttara kannada'),
  ('581402', '00000000-0000-0000-0000-000000000001', null, 'Sirsi', 'Uttara Kannada'),
  ('581325', '00000000-0000-0000-0000-000000000003', 'Dandeli S.O', null, 'Uttara Kannada'),
  ('581301', '00000000-0000-0000-0000-000000000004', 'Karwar H.O', 'Karwar', 'Uttara Kannada')
on conflict (code) do update set
  region_id = excluded.region_id, office_name = excluded.office_name,
  taluk = excluded.taluk, district = excluded.district;

-- All 5: Kumta (pre-existing, unchanged), Sirsi x2 (one is a phone-number
-- fix — was the fake 0000000000 PLACEHOLDER, now the real e-RaktKosh
-- number), Dandeli, Karwar.
insert into blood_banks
  (id, name, region_id, pincode, address, phone, is_verified, is_active) values
  ('37f9a63a-d079-4b55-85d7-a73b8f5872c3', 'The Uttara Kannada Blood Centre And Health Services Society',
    '1b72f71a-bb81-4f1b-bb73-df09afe5fcf5', '581343',
    'Baggon road, Kumta, Uttara Kannada, Karnataka, email:uk.uttarakannada.bb@gmail.com',
    '9901369298', true, true),
  -- Sirsi has two real pincodes; which bank gets which was originally a
  -- guess (e-RaktKosh's directory has no pincode field). Confirmed
  -- 2026-08-09: a real listing for M.E.S. P.U. College itself
  -- ("College Road, Near Marikamba District Stadium, Sirsi - 581402")
  -- directly matches 581402 for this MES College Road address - no longer
  -- a guess. 581401 (Church Road) is Sirsi's main/H.O. pincode covering
  -- the town centre - well-supported, though less sharply pinpointed than
  -- the 581402 match.
  ('00000000-0000-0000-0000-000000000002', 'Shripad Hegde Kadave Institute Of Medical Sciences, T.S.S. Hospital',
    '00000000-0000-0000-0000-000000000001', '581402',
    'MES College Road, Sirsi, Uttara Kannada, Karnataka, email:bloodbank@tsshspsirsi.com',
    '8088037458', true, true),
  ('00000000-0000-0000-0000-000000000005', 'Pandit General Hospital Blood Centre',
    '00000000-0000-0000-0000-000000000001', '581401',
    'Church Road, Sirsi, Uttara Kannada, Karnataka, email:uk.panditgeneralhospital.bb@gmail.com',
    '8762528366', true, true),
  ('00000000-0000-0000-0000-000000000006', 'Blood Centre General Hospital Dandeli',
    '00000000-0000-0000-0000-000000000003', '581325',
    'Govt. Maternity and Child Hospital, 1st Floor, Somani Circle, Dandeli, Uttara Kannada, Karnataka, email:bloodcentredandeli@gmail.com',
    '9535220903', true, true),
  ('00000000-0000-0000-0000-000000000007', 'M S District Hospital Blood Bank Karwar',
    '00000000-0000-0000-0000-000000000004', '581301',
    'Mahatma Gandhi Road, Karwar, Uttara Kannada, Karnataka, email:districthospital.bb@gmail.com',
    '8382226318', true, true)
on conflict (id) do update set
  name = excluded.name, region_id = excluded.region_id, pincode = excluded.pincode,
  address = excluded.address, phone = excluded.phone,
  is_verified = excluded.is_verified, is_active = excluded.is_active;

-- No adjacency pairs yet — see header comment.
