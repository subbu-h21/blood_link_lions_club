-- M1 review (Unit 06): the local Postgres role our migrations run as
-- (`postgres`) has a schema-level default ACL that auto-grants anon and
-- authenticated REFERENCES, TRIGGER and TRUNCATE on every new table in
-- public. None of these expose row data, but TRUNCATE bypasses RLS
-- entirely (RLS only governs SELECT/INSERT/UPDATE/DELETE) - RLS-with-
-- no-policies (Unit 04) does not close this gap. Confirmed via
-- pg_default_acl (defaclrole = postgres, defaclobjtype = 'r').
--
-- Revoking on the 7 existing tables only would recur at every future
-- migration (M2's bank_stock/shortages, M3's requests/prospects, etc.)
-- unless the default itself is fixed too - both statements are needed.
revoke references, trigger, truncate on all tables in schema public
from anon, authenticated;

alter default privileges for role postgres in schema public
revoke references, trigger, truncate on tables from anon, authenticated;
