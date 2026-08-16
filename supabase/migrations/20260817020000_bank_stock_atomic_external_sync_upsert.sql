-- eraktkosh-sync (a standalone tool, sibling to frontend/ - see its own
-- README.md) needs to upsert bank_stock rows only when its own reading is
-- actually newer than whatever is already there, per the same
-- "bank_stock always timestamped, no exceptions" rule the bank portal
-- itself follows (lib/db/bank-stock.ts's saveBankStockRow). Doing that
-- comparison client-side (read current updated_at, decide, then write) has
-- a real TOCTOU gap: a bank-staff save landing in the window between the
-- read and the write would be silently overwritten by older external
-- data, defeating the "most recent wins" rule it was supposed to honour.
-- This function makes the comparison atomic by pushing it into the
-- UPDATE's own WHERE clause, which Postgres evaluates against the row's
-- true current state at the instant of the write - no snapshot, no gap.
--
-- Not security definer, unlike custom_access_token_hook: that function
-- needs it because its caller (supabase_auth_admin) has no RLS-bypass and
-- profiles has zero permissive policies. This function's only caller is
-- eraktkosh-sync, authenticating with the service role key, which already
-- bypasses RLS on every table - no privilege elevation to grant here.
--
-- The whole batch runs as one implicit transaction (a single PL/pgSQL
-- function body) - if one row's input is malformed, the entire call fails
-- and nothing in the batch is written, rather than silently applying the
-- good rows and dropping the bad one. Deliberate: matches this codebase's
-- existing "fail loud rather than write partial/wrong data" pattern.
-- Output columns are prefixed out_* deliberately, not bank_id/blood_group -
-- RETURNS TABLE columns become implicitly-declared PL/pgSQL variables in
-- the function body, and a bare `bank_id`/`blood_group` inside the SQL
-- statement below would then be genuinely ambiguous between "the table
-- column" and "the output variable of the same name". Caught by actually
-- running this against a real Postgres before trusting it (a disposable
-- Docker container, not this project's own database) - it fails with
-- "column reference is ambiguous" otherwise, every single call.
create or replace function public.upsert_bank_stock_if_newer(rows jsonb)
returns table(out_bank_id uuid, out_blood_group text, applied boolean)
language plpgsql
set search_path = public
as $$
declare
  r jsonb;
  affected int;
begin
  for r in select * from jsonb_array_elements(rows)
  loop
    insert into bank_stock (bank_id, blood_group, component, units, updated_at, updated_by)
    values (
      (r->>'bank_id')::uuid,
      r->>'blood_group',
      coalesce(r->>'component', 'whole_blood'),
      (r->>'units')::int,
      (r->>'updated_at')::timestamptz,
      null -- externally sourced, same convention as the 2026-08-10 manual entry
    )
    on conflict (bank_id, blood_group, component)
    do update set
      units = excluded.units,
      updated_at = excluded.updated_at,
      updated_by = null
    where excluded.updated_at > bank_stock.updated_at;

    get diagnostics affected = row_count;

    out_bank_id := (r->>'bank_id')::uuid;
    out_blood_group := r->>'blood_group';
    applied := affected > 0;
    return next;
  end loop;
end;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default (unlike
-- tables) - same gap custom_access_token_hook's own migration already had
-- to close. Without this, anon/authenticated could call this via
-- PostgREST's /rpc/ endpoint and silently overwrite public blood-bank
-- stock figures with arbitrary data.
grant execute on function public.upsert_bank_stock_if_newer to service_role;
revoke execute on function public.upsert_bank_stock_if_newer from authenticated, anon, public;
