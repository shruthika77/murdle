-- =====================================================================
-- Migration 004: avatar outfits
-- Avatars gain an "o" (outfit) value and more gear options (0–9).
-- clean_avatar now keeps the "o" key. Run once in the SQL editor.
-- Safe to run on a project that already has migrations 002 and 003.
-- (Host avatars are stored in games.settings.host_avatar, so no table change is needed.)
-- =====================================================================
create or replace function public.clean_avatar(a jsonb) returns jsonb
language plpgsql immutable set search_path = pg_catalog as $$
declare k text; r jsonb := '{}'::jsonb;
begin
  if a is null or jsonb_typeof(a) <> 'object' then return null; end if;
  foreach k in array array['b','s','h','e','m','a','o'] loop
    r := r || jsonb_build_object(k, case when (a->>k) ~ '^[0-9]$' then (a->>k)::int else 0 end);
  end loop;
  return r;
end $$;
revoke all on function public.clean_avatar(jsonb) from public, anon, authenticated;
