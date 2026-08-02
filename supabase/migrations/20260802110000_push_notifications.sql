-- Unit 18: Web push infrastructure (PRD.md §10.1, §4.6).
--
-- notifications matches PRD.md §4.6 verbatim - created here because Unit
-- 33 (M4) explicitly depends on Unit 18 and checks for this table before
-- creating it itself ("if Unit 18 didn't already create the latter").
-- donor_id has no explicit not-null marker in PRD's own text but a
-- notification is meaningless without one - same "obviously required FK"
-- treatment as bank_stock.bank_id (Unit 07) and requests/prospects
-- (Unit 16). request_id/shortage_id are explicitly nullable in PRD's own
-- text (a notification is either request-triggered or shortage-
-- triggered, or eventually neither).
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  donor_id      uuid not null references donors (id),
  request_id    uuid references requests (id),
  shortage_id   uuid references bank_shortages (id),
  channel       text not null check (channel in ('web_push', 'whatsapp', 'sms')),
  sent_at       timestamptz not null default now(),
  delivered_at  timestamptz,
  responded_at  timestamptz
);
create index notifications_donor_id_idx on notifications (donor_id);
create index notifications_request_id_idx on notifications (request_id);

-- push_subscriptions has no PRD.md schema at all - this unit's own
-- design, same spirit as Unit 07's search_logs (PRD requires the
-- feature, not this exact table). Deliberately references profiles, not
-- donors, unlike notifications above: a browser can hold a push
-- subscription the moment a phone is OTP-verified (Unit 04's
-- ensureProfile already creates that profiles row), before the fuller D1
-- form (Unit 19/20) creates an actual donors row. Since donors.id =
-- profiles.id (Unit 02's own established pattern), sendPush(donorId, ...)
-- still resolves correctly - a donor id and its profile id are the same
-- value. One donor can hold multiple subscriptions (phone + laptop, or a
-- browser reinstall) - sendPush fans out to all of them.
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles (id),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_profile_id_idx on push_subscriptions (profile_id);

-- RLS in the same migration as table creation (M1 review, Unit 06) -
-- service_role already has grants via Unit 04's default-privilege rule;
-- anon/authenticated get neither grants (Unit 06's default-privilege
-- fix) nor RLS policies.
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;
