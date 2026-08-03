-- Unit 44: the escalation engine needs to notify admins/coordinators, not
-- just donors, but `notifications.donor_id` had a real FK constraint to
-- `donors` specifically (PRD.md §4.6's own literal schema) - admin/
-- coordinator profiles have no `donors` row, so calling Unit 18's
-- sendPush as-is for an admin would throw a foreign-key violation, not
-- just silently fail to deliver. Confirmed with the project owner before
-- writing any code (see prompts/README.md's Unit 44 entry): widen this
-- table into one shared, unified notification log for every recipient
-- type, rather than a second, parallel notification path that could
-- drift out of sync with this one (retry/rate-limit logic living in only
-- one of two places, say).
--
-- `donor_id` -> `recipient_id`: a column called `donor_id` holding an
-- admin's own profile id would be a naming lie waiting to produce a
-- wrong query later - renamed, not just re-typed underneath the same
-- name. The FK now points at `profiles` (not `donors`) - safe for every
-- existing donor notification, since `donors.id = profiles.id` always
-- (Unit 02's own 1:1 pattern) - and the index is renamed to match.
alter table notifications rename column donor_id to recipient_id;
alter table notifications drop constraint notifications_donor_id_fkey;
alter table notifications
  add constraint notifications_recipient_id_fkey
    foreign key (recipient_id) references profiles (id);
alter index notifications_donor_id_idx rename to notifications_recipient_id_idx;

-- `recipient_role`: denormalised, not re-derived via a join to `profiles`
-- on every read - the project owner's own stated reason: Unit 55's
-- metrics need to separate donor response rates from admin response
-- times, and a join for that on every metrics query is real, avoidable
-- cost. Defaulted then dropped rather than left permanently defaulted -
-- this table has zero rows today (confirmed), but every future insert
-- must state its recipient's role explicitly, not fall back silently.
alter table notifications
  add column recipient_role text not null default 'donor'
    check (recipient_role in ('donor', 'admin', 'coordinator'));
alter table notifications alter column recipient_role drop default;

-- requests.admin_notified_at/escalated_at are unchanged and unaffected -
-- the project owner's own explicit instruction: those record the state
-- transition (who owns notifying this request right now, and since
-- when), `notifications` records each individual delivery attempt. Both
-- are kept; neither replaces the other.
