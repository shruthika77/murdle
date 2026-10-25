-- =====================================================================
-- Upgrade 002: waiting room (ready flags) + get-ready countdown.
-- The puzzle text moves to its own table that players can only read
-- once the countdown has finished, so nobody can peek early.
-- =====================================================================

-- 1. Puzzle text in its own table, hidden from players until the round starts
create table public.round_content (
  round_id uuid primary key references public.rounds(id) on delete cascade,
  content  jsonb not null
);
alter table public.rounds add column title text;
insert into public.round_content (round_id, content) select id, content from public.rounds;
update public.rounds set title = coalesce(content->>'title', 'Puzzle');
alter table public.rounds alter column title set not null;
alter table public.rounds drop column content;

alter table public.round_content enable row level security;
create policy "content read" on public.round_content for select using (
  exists (
    select 1 from public.rounds r
    where r.id = round_id
      and (public.is_host(r.game_id) or (public.is_member(r.game_id) and now() >= r.started_at))
  )
);
revoke insert, update, delete on public.round_content from anon, authenticated;

-- 2. Ready flags for the waiting room
alter table public.team_members add column ready boolean not null default false;

create function public.set_ready(p_game uuid, p_ready boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.team_members set ready = p_ready where game_id = p_game and user_id = auth.uid();
end $$;
revoke all on function public.set_ready(uuid, boolean) from public, anon;
grant execute on function public.set_ready(uuid, boolean) to authenticated;

-- 3. Default settings now include the countdown
alter table public.games alter column settings set default
  '{"base":100,"bonus":50,"penalty":10,"max_attempts":3,"partial":10,"use_partial":true,"timer":300,"countdown":15}';

-- 4. start_round: countdown first, then the timer
create or replace function public.start_round(p_game uuid, p_puzzle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare g public.games; pz public.puzzles; rid uuid; n int; live record; cd int; tm int;
begin
  select * into g from public.games where id = p_game and host_id = auth.uid();
  if not found then raise exception 'Only the host can start a round.'; end if;
  if g.status = 'finished' then raise exception 'This game has finished.'; end if;
  select * into pz from public.puzzles where id = p_puzzle and owner_id = auth.uid();
  if not found then raise exception 'Puzzle not found.'; end if;
  if exists (select 1 from public.rounds where game_id = p_game and puzzle_id = p_puzzle) then
    raise exception 'This puzzle has already been played in this game.'; end if;

  for live in select id from public.rounds where game_id = p_game and status = 'live' loop
    perform public.finalize_round(live.id);
  end loop;

  cd := greatest(0, least(120, coalesce((g.settings->>'countdown')::int, 15)));
  tm := (g.settings->>'timer')::int;
  select coalesce(max(round_no), 0) + 1 into n from public.rounds where game_id = p_game;

  insert into public.rounds (game_id, puzzle_id, round_no, title, settings, started_at, ends_at)
  values (p_game, pz.id, n, pz.title, g.settings,
          now() + cd * interval '1 second',
          now() + (cd + tm) * interval '1 second')
  returning id into rid;
  insert into public.round_content (round_id, content) values (rid, pz.content);
  insert into public.round_secrets (round_id, solution, explanation) values (rid, pz.solution, pz.explanation);
  update public.team_members set ready = false where game_id = p_game;
  update public.games set status = 'active', current_round_id = rid where id = p_game;
  return rid;
end $$;

-- 5. submit_answer: refuse answers during the countdown
create or replace function public.submit_answer(p_round uuid, p_suspect text, p_weapon text, p_location text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  rd public.rounds; sec public.round_secrets; res public.results; uid uuid := auth.uid();
  tid uuid; ok int; s jsonb; max_att int; elapsed int; bonus int; sc int; is_done boolean; is_solved boolean;
begin
  select * into rd from public.rounds where id = p_round;
  if not found then raise exception 'Round not found.'; end if;
  select team_id into tid from public.team_members where game_id = rd.game_id and user_id = uid;
  if tid is null then raise exception 'You are not on a team in this game.'; end if;

  if rd.status <> 'live' or now() >= rd.ends_at then
    perform public.finalize_round(p_round);
    raise exception 'This round is over.';
  end if;
  if now() < rd.started_at then raise exception 'The round has not started yet.'; end if;

  insert into public.results (round_id, team_id, game_id) values (p_round, tid, rd.game_id)
  on conflict do nothing;
  select * into res from public.results where round_id = p_round and team_id = tid for update;
  if res.done then raise exception 'Your team has already finished this puzzle.'; end if;

  select * into sec from public.round_secrets where round_id = p_round;
  s := rd.settings;
  max_att := (s->>'max_attempts')::int;
  ok := (sec.solution->>'suspect' = p_suspect)::int
      + (sec.solution->>'weapon' = p_weapon)::int
      + (sec.solution->>'location' = p_location)::int;

  insert into public.attempts (round_id, team_id, game_id, user_id, answer, correct_count)
  values (p_round, tid, rd.game_id, uid,
          jsonb_build_object('suspect', p_suspect, 'weapon', p_weapon, 'location', p_location), ok);

  if ok = 3 then
    elapsed := floor(extract(epoch from (now() - rd.started_at)));
    bonus := round((s->>'bonus')::numeric * greatest(0, 1 - elapsed::numeric / greatest((s->>'timer')::numeric, 1)));
    sc := greatest(0, (s->>'base')::int + bonus - (s->>'penalty')::int * res.attempts);
    update public.results
       set attempts = attempts + 1, best_correct = 3, solved = true, done = true,
           score = sc, solve_seconds = elapsed
     where round_id = p_round and team_id = tid;
    is_solved := true; is_done := true;
  else
    is_solved := false;
    is_done := (res.attempts + 1) >= max_att;
    sc := case when is_done and coalesce((s->>'use_partial')::boolean, false)
               then (s->>'partial')::int * greatest(res.best_correct, ok) else 0 end;
    update public.results
       set attempts = attempts + 1,
           best_correct = greatest(best_correct, ok),
           done = is_done,
           score = case when is_done then sc else score end
     where round_id = p_round and team_id = tid;
  end if;

  return jsonb_build_object('solved', is_solved, 'correct_count', ok, 'done', is_done,
                            'attempts_left', greatest(0, max_att - (res.attempts + 1)), 'score', coalesce(sc, 0));
end $$;
