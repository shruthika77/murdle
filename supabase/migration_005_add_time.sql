-- =====================================================================
-- Migration 005: host can add time to a live round ("+15 seconds").
-- Run once in the Supabase SQL editor. Safe to run more than once.
-- Only the host of the game can call it; teams get "Only the host can add time."
-- =====================================================================
create or replace function public.extend_round(p_round uuid, p_seconds int default 15) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare rd public.rounds; secs int := greatest(1, least(coalesce(p_seconds, 15), 600)); new_end timestamptz;
begin
  select * into rd from public.rounds where id = p_round for update;
  if not found or not public.is_host(rd.game_id) then raise exception 'Only the host can add time.'; end if;
  if rd.status <> 'live' then raise exception 'This round has already finished.'; end if;
  if now() < rd.started_at then raise exception 'The round has not started yet.'; end if;
  if now() >= rd.ends_at then raise exception 'Time is already up for this round.'; end if;
  update public.rounds set ends_at = ends_at + secs * interval '1 second' where id = p_round returning ends_at into new_end;
  perform public.log_activity(rd.game_id, p_round, 'time_added', null, jsonb_build_object('seconds', secs));
  return new_end;
end $$;
revoke all on function public.extend_round(uuid, int) from public, anon;
grant execute on function public.extend_round(uuid, int) to authenticated;
