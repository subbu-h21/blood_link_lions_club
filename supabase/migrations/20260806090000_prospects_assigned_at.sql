-- Admin-assigns-donor-to-bank feature (2026-08-06, user-requested).
--
-- Closes a real gap between CLAUDE.md rule 3's own text ("the bank that
-- donor is scheduled at (B3/B4)") and what the code actually did: a
-- donor's phone/name was released to the bank the instant
-- prospects.status became 'accepted' or 'screening', with no admin
-- action in between at all - "Take ownership" / "Call donor" /
-- "Schedule" on A2 had zero effect on bank visibility. Confirmed by
-- reading lib/db/bank-prospects.ts's getIncomingProspects and
-- lib/serialise/donor-contact.ts's "bank" channel directly before this
-- migration was written - neither checked anything beyond status.
--
-- assigned_at is deliberately a new column, not a new value in the
-- existing 7-value prospects.status check constraint. That enum is read
-- in several independent places (ACTIVE_PLEDGE_STATUSES,
-- STANDDOWNABLE_STATUSES, ACCEPTED_LIKE_STATUSES, the matching engine's
-- own eligibility check) - a new status value would require touching and
-- re-verifying every one of them. This column is orthogonal: `status`
-- keeps meaning exactly what it already means; `assigned_at` is a purely
-- additive fact ("has an admin told this specific donor to go to the
-- bank yet"), read only by the bank-visibility gate this migration's
-- companion code change adds.
--
-- Nullable, set once (an admin's "Assign to bank" action), clearable
-- back to null (an admin's "Unassign" action, for correcting a mistake
-- before the donor has actually gone) - not a partial unique index or a
-- check constraint, since multiple donors may legitimately be assigned
-- on the same request at once (SPEC.md's own "several donors accept for
-- one unit is desirable" already establishes multiple live prospects per
-- request as normal, and this feature explicitly extends that to
-- multiple *assigned* donors per request too, per the project owner's
-- explicit confirmation).
alter table prospects
  add column assigned_at timestamptz null;

comment on column prospects.assigned_at is
  'Set once by an admin (lib/db/admin-requests.ts assignProspectToBank) when that specific donor is told to go to the destination bank; cleared by unassignProspectFromBank. Independent of status - gates the bank''s own Incoming Prospects visibility and phone reveal (CLAUDE.md rule 3, "bank" channel in lib/serialise/donor-contact.ts) on top of the existing accepted/screening status check, not instead of it.';
