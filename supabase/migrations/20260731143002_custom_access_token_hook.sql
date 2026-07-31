-- Unit 05: getClaims() reads the Supabase Auth JWT, which does not
-- contain profiles.role by default - that's application data, not an
-- auth claim. Without this hook, lib/supabase/proxy.ts would need a
-- database round-trip on every request (or the gate would silently not
-- work). Injects profiles.role into app_metadata.profile_role at token
-- issuance/refresh, so the proxy reads it for free from getClaims().
--
-- Existing sessions issued before this migration keep their old JWT
-- until they refresh or re-authenticate - expected, not a bug.
--
-- security definer is required, not optional: profiles has RLS enabled
-- with zero policies (Unit 04's deliberate deny-by-default backstop), so
-- supabase_auth_admin's own SELECT grant is still blocked at the row
-- level. Without security definer this silently returns no row (not an
-- error) and every claim falls back to 'searcher' - caught by manually
-- decoding a real issued JWT and comparing it against the database, not
-- by calling the function directly as postgres, which bypasses RLS
-- either way and would have hidden this.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  claims jsonb;
  profile_role text;
begin
  select role into profile_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  if jsonb_typeof(claims->'app_metadata') is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  end if;
  claims := jsonb_set(
    claims,
    '{app_metadata, profile_role}',
    to_jsonb(coalesce(profile_role, 'searcher'))
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant select on public.profiles to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
