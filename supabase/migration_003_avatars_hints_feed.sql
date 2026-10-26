-- =====================================================================
-- Upgrade 003: cartoon avatars, detective hints, live activity feed.
-- =====================================================================

-- ---------- 1. Avatars ----------------------------------------------
alter table public.team_members add column avatar jsonb;

-- Keep only known keys, each a single digit, so nothing odd can be stored.
create function public.clean_avatar(a jsonb) returns jsonb
language plpgsql immutable set search_path = pg_catalog as $$
declare k text; r jsonb := '{}'::jsonb;
begin
  if a is null or jsonb_typeof(a) <> 'object' then return null; end if;
  foreach k in array array['b','s','h','e','m','a'] loop
    r := r || jsonb_build_object(k, case when (a->>k) ~ '^[0-9]$' then (a->>k)::int else 0 end);
  end loop;
  return r;
end $$;

create function public.set_avatar(p_game uuid, p_avatar jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.team_members set avatar = public.clean_avatar(p_avatar)
   where game_id = p_game and user_id = auth.uid();
end $$;

-- ---------- 2. Live activity feed ------------------------------------
create table public.activity (
  id         bigint generated always as identity primary key,
  game_id    uuid not null references public.games(id) on delete cascade,
  round_id   uuid references public.rounds(id) on delete cascade,
  kind       text not null,
  team_name  text,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.activity (game_id, id desc);
alter table public.activity enable row level security;
create policy "activity read" on public.activity for select using (public.is_host(game_id) or public.is_member(game_id));
revoke insert, update, delete on public.activity from anon, authenticated;

create function public.log_activity(p_game uuid, p_round uuid, p_kind text, p_team text, p_detail jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.activity (game_id, round_id, kind, team_name, detail) values (p_game, p_round, p_kind, p_team, coalesce(p_detail, '{}'));
$$;
revoke all on function public.log_activity(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------- 3. Detective hints ---------------------------------------
create table public.hints (
  id         bigint generated always as identity primary key,
  round_id   uuid not null references public.rounds(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,
  game_id    uuid not null references public.games(id) on delete cascade,
  kind       text not null check (kind in ('suspect','weapon','location')),
  value      text not null,
  created_at timestamptz not null default now(),
  unique (round_id, team_id, kind, value)
);
alter table public.hints enable row level security;
create policy "hints read" on public.hints for select using (public.is_team_member(team_id) or public.is_host(game_id));
revoke insert, update, delete on public.hints from anon, authenticated;

alter table public.games alter column settings set default
  '{"base":100,"bonus":50,"penalty":10,"max_attempts":3,"partial":10,"use_partial":true,"timer":300,"countdown":15,"max_hints":2,"hint_cost":15}';

-- A hint truthfully rules out one wrong suspect, weapon or location. It costs points.
create function public.use_hint(p_round uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rd public.rounds; sec public.round_secrets; res public.results; tid uuid; tname text; ct jsonb;
  s jsonb; max_h int; cost int; used int; pick record;
begin
  select * into rd from public.rounds where id = p_round;
  if not found then raise exception 'Round not found.'; end if;
  select tm.team_id, t.name into tid, tname from public.team_members tm join public.teams t on t.id = tm.team_id
   where tm.game_id = rd.game_id and tm.user_id = auth.uid();
  if tid is null then raise exception 'You are not on a team in this game.'; end if;
  if rd.status <> 'live' or now() >= rd.ends_at then raise exception 'This round is over.'; end if;
  if now() < rd.started_at then raise exception 'The round has not started yet.'; end if;

  s := rd.settings;
  max_h := coalesce((s->>'max_hints')::int, 2);
  cost  := coalesce((s->>'hint_cost')::int, 15);

  insert into public.results (round_id, team_id, game_id) values (p_round, tid, rd.game_id) on conflict do nothing;
  select * into res from public.results where round_id = p_round and team_id = tid for update;
  if res.done then raise exception 'Your team has already finished this puzzle.'; end if;
  select count(*) into used from public.hints where round_id = p_round and team_id = tid;
  if used >= max_h then raise exception 'Your team has no hints left in this round.'; end if;

  select * into sec from public.round_secrets where round_id = p_round;
  select content into ct from public.round_content where round_id = p_round;

  select c.kind, c.name into pick from (
      select 'suspect'::text as kind, e->>'name' as name from jsonb_array_elements(ct->'suspects') e
      union all select 'weapon', e->>'name' from jsonb_array_elements(ct->'weapons') e
      union all select 'location', e->>'name' from jsonb_array_elements(ct->'locations') e
    ) c
   where c.name <> (sec.solution->>c.kind)
     and not exists (select 1 from public.hints h where h.round_id = p_round and h.team_id = tid and h.kind = c.kind and h.value = c.name)
   order by random() limit 1;
  if pick.kind is null then raise exception 'No more hints are available.'; end if;

  insert into public.hints (round_id, team_id, game_id, kind, value) values (p_round, tid, rd.game_id, pick.kind, pick.name);
  perform public.log_activity(rd.game_id, p_round, 'hint', tname, '{}');
  return jsonb_build_object('kind', pick.kind, 'value', pick.name, 'used', used + 1, 'left', max_h - used - 1, 'cost', cost);
end $$;

-- ---------- 4. Join functions now take an avatar ----------------------
drop function public.join_game(text, text, text);
drop function public.join_team(text, text, text);

create function public.join_game(p_code text, p_team_name text, p_player text, p_avatar jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; t uuid; uid uuid := auth.uid(); existing uuid; n int;
begin
  if uid is null then raise exception 'Please reload the page and try again.'; end if;
  select * into g from public.games where join_code = lower(btrim(p_code));
  if not found then raise exception 'This join link is not valid.'; end if;
  if g.status = 'finished' then raise exception 'This game has already finished.'; end if;

  select team_id into existing from public.team_members where game_id = g.id and user_id = uid;
  if existing is not null then return jsonb_build_object('game_id', g.id, 'team_id', existing); end if;

  if char_length(btrim(p_team_name)) not between 2 and 40 then raise exception 'Team name must be 2–40 characters.'; end if;
  if char_length(btrim(p_player)) not between 1 and 30 then raise exception 'Your name must be 1–30 characters.'; end if;
  select count(*) into n from public.teams where game_id = g.id;
  if n >= 100 then raise exception 'This game is full.'; end if;

  insert into public.teams (game_id, name, created_by) values (g.id, btrim(p_team_name), uid) returning id into t;
  insert into public.team_secrets (team_id) values (t);
  insert into public.team_members (team_id, game_id, user_id, player_name, avatar)
  values (t, g.id, uid, btrim(p_player), public.clean_avatar(p_avatar));
  perform public.log_activity(g.id, null, 'joined', btrim(p_team_name), jsonb_build_object('player', btrim(p_player)));
  return jsonb_build_object('game_id', g.id, 'team_id', t);
exception when unique_violation then
  raise exception 'That team name is already taken in this game.';
end $$;

create function public.join_team(p_code text, p_team_code text, p_player text, p_avatar jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; t uuid; tname text; uid uuid := auth.uid(); existing uuid; n int;
begin
  if uid is null then raise exception 'Please reload the page and try again.'; end if;
  select * into g from public.games where join_code = lower(btrim(p_code));
  if not found then raise exception 'This join link is not valid.'; end if;
  if g.status = 'finished' then raise exception 'This game has already finished.'; end if;

  select team_id into existing from public.team_members where game_id = g.id and user_id = uid;
  if existing is not null then return jsonb_build_object('game_id', g.id, 'team_id', existing); end if;
  if char_length(btrim(p_player)) not between 1 and 30 then raise exception 'Your name must be 1–30 characters.'; end if;

  select s.team_id, tm.name into t, tname from public.team_secrets s join public.teams tm on tm.id = s.team_id
   where tm.game_id = g.id and s.code = upper(btrim(p_team_code));
  if t is null then raise exception 'No team in this game has that code.'; end if;
  select count(*) into n from public.team_members where team_id = t;
  if n >= 6 then raise exception 'That team already has 6 players.'; end if;

  insert into public.team_members (team_id, game_id, user_id, player_name, avatar)
  values (t, g.id, uid, btrim(p_player), public.clean_avatar(p_avatar));
  perform public.log_activity(g.id, null, 'joined', tname, jsonb_build_object('player', btrim(p_player)));
  return jsonb_build_object('game_id', g.id, 'team_id', t);
end $$;

-- ---------- 5. Round logic: hint costs + feed events -------------------
create or replace function public.finalize_round(p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
declare rd public.rounds; hc int;
begin
  update public.rounds set status = 'closed' where id = p_round and status = 'live' returning * into rd;
  if rd.id is null then select * into rd from public.rounds where id = p_round; end if;
  hc := coalesce((rd.settings->>'hint_cost')::int, 15);
  update public.results r
     set done = true,
         score = case when coalesce((rd.settings->>'use_partial')::boolean, false)
                      then greatest(0, (rd.settings->>'partial')::int * r.best_correct
                                       - hc * (select count(*) from public.hints h where h.round_id = r.round_id and h.team_id = r.team_id))
                      else 0 end
   where r.round_id = p_round and not r.done;
end $$;
revoke all on function public.finalize_round(uuid) from public, anon, authenticated;

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
  values (p_game, pz.id, n, pz.title, g.settings, now() + cd * interval '1 second', now() + (cd + tm) * interval '1 second')
  returning id into rid;
  insert into public.round_content (round_id, content) values (rid, pz.content);
  insert into public.round_secrets (round_id, solution, explanation) values (rid, pz.solution, pz.explanation);
  update public.team_members set ready = false where game_id = p_game;
  update public.games set status = 'active', current_round_id = rid where id = p_game;
  perform public.log_activity(p_game, rid, 'round_start', null, jsonb_build_object('round_no', n, 'title', pz.title));
  return rid;
end $$;

create or replace function public.submit_answer(p_round uuid, p_suspect text, p_weapon text, p_location text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  rd public.rounds; sec public.round_secrets; res public.results; uid uuid := auth.uid();
  tid uuid; tname text; ok int; s jsonb; max_att int; elapsed int; bonus int; sc int; hc int; hcost int;
  is_done boolean; is_solved boolean;
begin
  select * into rd from public.rounds where id = p_round;
  if not found then raise exception 'Round not found.'; end if;
  select tm.team_id, t.name into tid, tname from public.team_members tm join public.teams t on t.id = tm.team_id
   where tm.game_id = rd.game_id and tm.user_id = uid;
  if tid is null then raise exception 'You are not on a team in this game.'; end if;

  if rd.status <> 'live' or now() >= rd.ends_at then
    perform public.finalize_round(p_round);
    raise exception 'This round is over.';
  end if;
  if now() < rd.started_at then raise exception 'The round has not started yet.'; end if;

  insert into public.results (round_id, team_id, game_id) values (p_round, tid, rd.game_id) on conflict do nothing;
  select * into res from public.results where round_id = p_round and team_id = tid for update;
  if res.done then raise exception 'Your team has already finished this puzzle.'; end if;

  select * into sec from public.round_secrets where round_id = p_round;
  s := rd.settings;
  max_att := (s->>'max_attempts')::int;
  hcost := coalesce((s->>'hint_cost')::int, 15);
  select count(*) into hc from public.hints where round_id = p_round and team_id = tid;
  ok := (sec.solution->>'suspect' = p_suspect)::int
      + (sec.solution->>'weapon' = p_weapon)::int
      + (sec.solution->>'location' = p_location)::int;

  insert into public.attempts (round_id, team_id, game_id, user_id, answer, correct_count)
  values (p_round, tid, rd.game_id, uid,
          jsonb_build_object('suspect', p_suspect, 'weapon', p_weapon, 'location', p_location), ok);

  if ok = 3 then
    elapsed := floor(extract(epoch from (now() - rd.started_at)));
    bonus := round((s->>'bonus')::numeric * greatest(0, 1 - elapsed::numeric / greatest((s->>'timer')::numeric, 1)));
    sc := greatest(0, (s->>'base')::int + bonus - (s->>'penalty')::int * res.attempts - hcost * hc);
    update public.results
       set attempts = attempts + 1, best_correct = 3, solved = true, done = true, score = sc, solve_seconds = elapsed
     where round_id = p_round and team_id = tid;
    is_solved := true; is_done := true;
    perform public.log_activity(rd.game_id, p_round, 'solved', tname,
      jsonb_build_object('seconds', elapsed, 'score', sc, 'attempts', res.attempts + 1));
  else
    is_solved := false;
    is_done := (res.attempts + 1) >= max_att;
    sc := case when is_done and coalesce((s->>'use_partial')::boolean, false)
               then greatest(0, (s->>'partial')::int * greatest(res.best_correct, ok) - hcost * hc) else 0 end;
    update public.results
       set attempts = attempts + 1, best_correct = greatest(best_correct, ok), done = is_done,
           score = case when is_done then sc else score end
     where round_id = p_round and team_id = tid;
    perform public.log_activity(rd.game_id, p_round, case when is_done then 'out' else 'attempt' end, tname,
      jsonb_build_object('correct', ok));
  end if;

  return jsonb_build_object('solved', is_solved, 'correct_count', ok, 'done', is_done,
                            'attempts_left', greatest(0, max_att - (res.attempts + 1)), 'score', coalesce(sc, 0));
end $$;

revoke all on function public.clean_avatar(jsonb) from public, anon, authenticated;

-- ---------- 6. Permissions & realtime ---------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'set_avatar(uuid,jsonb)', 'join_game(text,text,text,jsonb)', 'join_team(text,text,text,jsonb)', 'use_hint(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

alter publication supabase_realtime add table public.activity, public.hints;
