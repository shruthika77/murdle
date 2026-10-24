-- =====================================================================
-- Case Closed — Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- Prerequisite: Authentication → Providers → enable "Anonymous sign-ins"
-- =====================================================================

-- ---------- 1. Tables -------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','team','pending')),
  email      text,
  created_at timestamptz not null default now()
);

-- Emails listed here become admins on sign-up. The very first email
-- account is always made admin (bootstrap); everyone after is "pending"
-- unless allow-listed.
create table public.admin_allowlist (email text primary key);

create table public.games (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null check (char_length(btrim(title)) between 1 and 80),
  join_code        text not null unique default substr(replace(gen_random_uuid()::text,'-',''),1,8),
  status           text not null default 'lobby' check (status in ('lobby','active','finished')),
  settings         jsonb not null default
    '{"base":100,"bonus":50,"penalty":10,"max_attempts":3,"partial":10,"use_partial":true,"timer":300}',
  current_round_id uuid,
  created_at       timestamptz not null default now()
);
create index on public.games(host_id);

create table public.puzzles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  slug        text not null,
  title       text not null,
  content     jsonb not null,   -- story, suspects, weapons, locations, clues (NO answer)
  solution    jsonb not null,   -- {suspect, weapon, location}
  explanation text,
  created_at  timestamptz not null default now(),
  unique (owner_id, slug)
);

create table public.rounds (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  puzzle_id  uuid references public.puzzles(id) on delete set null,
  round_no   int  not null,
  content    jsonb not null,           -- snapshot of puzzle content, no answer
  settings   jsonb not null,           -- snapshot of scoring rules
  status     text not null default 'live' check (status in ('live','closed')),
  started_at timestamptz not null default now(),
  ends_at    timestamptz not null,
  revealed   boolean not null default false,
  reveal     jsonb,                    -- {solution, explanation}, filled on reveal
  unique (game_id, round_no)
);
create index on public.rounds(game_id);

-- Answers live here, readable by the host only.
create table public.round_secrets (
  round_id    uuid primary key references public.rounds(id) on delete cascade,
  solution    jsonb not null,
  explanation text
);

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 2 and 40),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index teams_game_name_uniq on public.teams (game_id, lower(btrim(name)));

-- Private team invite code (so strangers in the same game can't join your team)
create table public.team_secrets (
  team_id uuid primary key references public.teams(id) on delete cascade,
  code    text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,5))
);

create table public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  game_id     uuid not null references public.games(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  player_name text not null check (char_length(btrim(player_name)) between 1 and 30),
  joined_at   timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (game_id, user_id)            -- one team per person per game
);

create table public.results (
  round_id      uuid not null references public.rounds(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  game_id       uuid not null references public.games(id) on delete cascade,
  attempts      int  not null default 0,
  best_correct  int  not null default 0,
  solved        boolean not null default false,
  done          boolean not null default false,
  score         int  not null default 0,
  solve_seconds int,
  primary key (round_id, team_id)
);
create index on public.results(game_id);

create table public.attempts (
  id            bigint generated always as identity primary key,
  round_id      uuid not null references public.rounds(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  game_id       uuid not null references public.games(id) on delete cascade,
  user_id       uuid not null,
  answer        jsonb not null,
  correct_count int  not null,
  created_at    timestamptz not null default now()
);
create index on public.attempts(round_id, team_id);

-- ---------- 2. Sign-up trigger (role assignment) ----------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if new.is_anonymous then
    r := 'team';
  elsif not exists (select 1 from public.profiles where role = 'admin')
     or exists (select 1 from public.admin_allowlist where lower(email) = lower(new.email)) then
    r := 'admin';
  else
    r := 'pending';
  end if;
  insert into public.profiles (id, role, email) values (new.id, r, new.email);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- 3. Helper functions used by RLS ---------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create function public.is_host(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.games where id = g and host_id = auth.uid())
$$;

create function public.is_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where game_id = g and user_id = auth.uid())
$$;

create function public.is_team_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = t and user_id = auth.uid())
$$;

-- ---------- 4. Row Level Security -------------------------------------

alter table public.profiles       enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.games          enable row level security;
alter table public.puzzles        enable row level security;
alter table public.rounds         enable row level security;
alter table public.round_secrets  enable row level security;
alter table public.teams          enable row level security;
alter table public.team_secrets   enable row level security;
alter table public.team_members   enable row level security;
alter table public.results        enable row level security;
alter table public.attempts       enable row level security;

create policy "own profile"       on public.profiles for select using (id = auth.uid());

create policy "games read"        on public.games for select using (host_id = auth.uid() or public.is_member(id));
create policy "games insert"      on public.games for insert with check (host_id = auth.uid() and public.is_admin());
create policy "games update"      on public.games for update using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "games delete"      on public.games for delete using (host_id = auth.uid());

create policy "puzzles owner"     on public.puzzles for all
  using (owner_id = auth.uid() and public.is_admin())
  with check (owner_id = auth.uid() and public.is_admin());

create policy "rounds read"       on public.rounds for select using (public.is_host(game_id) or public.is_member(game_id));
create policy "secrets host"      on public.round_secrets for select
  using (exists (select 1 from public.rounds r where r.id = round_id and public.is_host(r.game_id)));

create policy "teams read"        on public.teams for select using (public.is_host(game_id) or public.is_member(game_id));
create policy "teams delete"      on public.teams for delete using (public.is_host(game_id));
create policy "team code read"    on public.team_secrets for select using (public.is_team_member(team_id));

create policy "members read"      on public.team_members for select using (public.is_host(game_id) or public.is_member(game_id));
create policy "results read"      on public.results for select using (public.is_host(game_id) or public.is_member(game_id));
create policy "attempts read"     on public.attempts for select using (public.is_host(game_id) or public.is_team_member(team_id));

-- All game-state writes go through the RPCs below.
revoke insert, update, delete on public.rounds, public.round_secrets,
  public.team_secrets, public.team_members, public.results, public.attempts,
  public.profiles from anon, authenticated;
revoke insert, update on public.teams from anon, authenticated;   -- hosts may still delete (remove) a team
revoke all on public.admin_allowlist from anon, authenticated;

-- ---------- 5. Game logic (server-side, tamper-proof) -----------------

create function public.server_time() returns timestamptz
language sql stable as $$ select clock_timestamp() $$;

-- Look up a game from a join link, before the player has joined.
create function public.get_game_by_code(p_code text)
returns table (id uuid, title text, status text)
language sql stable security definer set search_path = public as $$
  select g.id, g.title, g.status from public.games g where g.join_code = lower(btrim(p_code))
$$;

-- Create a team (first joinee on the link).
create function public.join_game(p_code text, p_team_name text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; t uuid; uid uuid := auth.uid(); existing uuid; n int;
begin
  if uid is null then raise exception 'Please reload the page and try again.'; end if;
  select * into g from public.games where join_code = lower(btrim(p_code));
  if not found then raise exception 'This join link is not valid.'; end if;
  if g.status = 'finished' then raise exception 'This game has already finished.'; end if;

  select team_id into existing from public.team_members where game_id = g.id and user_id = uid;
  if existing is not null then return jsonb_build_object('game_id', g.id, 'team_id', existing); end if;

  if char_length(btrim(p_team_name)) not between 2 and 40 then
    raise exception 'Team name must be 2–40 characters.'; end if;
  if char_length(btrim(p_player)) not between 1 and 30 then
    raise exception 'Your name must be 1–30 characters.'; end if;
  select count(*) into n from public.teams where game_id = g.id;
  if n >= 100 then raise exception 'This game is full.'; end if;

  insert into public.teams (game_id, name, created_by) values (g.id, btrim(p_team_name), uid) returning id into t;
  insert into public.team_secrets (team_id) values (t);
  insert into public.team_members (team_id, game_id, user_id, player_name) values (t, g.id, uid, btrim(p_player));
  return jsonb_build_object('game_id', g.id, 'team_id', t);
exception when unique_violation then
  raise exception 'That team name is already taken in this game.';
end $$;

-- Join an existing team using its private team code.
create function public.join_team(p_code text, p_team_code text, p_player text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.games; t uuid; uid uuid := auth.uid(); existing uuid; n int;
begin
  if uid is null then raise exception 'Please reload the page and try again.'; end if;
  select * into g from public.games where join_code = lower(btrim(p_code));
  if not found then raise exception 'This join link is not valid.'; end if;
  if g.status = 'finished' then raise exception 'This game has already finished.'; end if;

  select team_id into existing from public.team_members where game_id = g.id and user_id = uid;
  if existing is not null then return jsonb_build_object('game_id', g.id, 'team_id', existing); end if;

  if char_length(btrim(p_player)) not between 1 and 30 then
    raise exception 'Your name must be 1–30 characters.'; end if;

  select s.team_id into t from public.team_secrets s join public.teams tm on tm.id = s.team_id
   where tm.game_id = g.id and s.code = upper(btrim(p_team_code));
  if t is null then raise exception 'No team in this game has that code.'; end if;
  select count(*) into n from public.team_members where team_id = t;
  if n >= 6 then raise exception 'That team already has 6 players.'; end if;

  insert into public.team_members (team_id, game_id, user_id, player_name) values (t, g.id, uid, btrim(p_player));
  return jsonb_build_object('game_id', g.id, 'team_id', t);
end $$;

-- Close a round and give partial credit to unsolved teams. Internal only.
create function public.finalize_round(p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
declare rd public.rounds;
begin
  update public.rounds set status = 'closed' where id = p_round and status = 'live' returning * into rd;
  if rd.id is null then select * into rd from public.rounds where id = p_round; end if;
  update public.results r
     set done = true,
         score = case when coalesce((rd.settings->>'use_partial')::boolean, false)
                      then (rd.settings->>'partial')::int * r.best_correct else 0 end
   where r.round_id = p_round and not r.done;
end $$;
revoke all on function public.finalize_round(uuid) from public, anon, authenticated;

create function public.start_round(p_game uuid, p_puzzle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare g public.games; pz public.puzzles; rid uuid; n int; live record;
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

  select coalesce(max(round_no), 0) + 1 into n from public.rounds where game_id = p_game;
  insert into public.rounds (game_id, puzzle_id, round_no, content, settings, ends_at)
  values (p_game, pz.id, n,
          pz.content || jsonb_build_object('title', pz.title),
          g.settings,
          now() + ((g.settings->>'timer')::int * interval '1 second'))
  returning id into rid;
  insert into public.round_secrets (round_id, solution, explanation) values (rid, pz.solution, pz.explanation);
  update public.games set status = 'active', current_round_id = rid where id = p_game;
  return rid;
end $$;

create function public.stop_round(p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
declare rd public.rounds;
begin
  select * into rd from public.rounds where id = p_round;
  if not found or not public.is_host(rd.game_id) then raise exception 'Only the host can stop a round.'; end if;
  perform public.finalize_round(p_round);
end $$;

create function public.reveal_round(p_round uuid) returns void
language plpgsql security definer set search_path = public as $$
declare rd public.rounds; sec public.round_secrets;
begin
  select * into rd from public.rounds where id = p_round;
  if not found or not public.is_host(rd.game_id) then raise exception 'Only the host can reveal the answer.'; end if;
  perform public.finalize_round(p_round);
  select * into sec from public.round_secrets where round_id = p_round;
  update public.rounds
     set revealed = true,
         reveal = jsonb_build_object('solution', sec.solution, 'explanation', sec.explanation)
   where id = p_round;
end $$;

create function public.finish_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare live record;
begin
  if not public.is_host(p_game) then raise exception 'Only the host can finish the game.'; end if;
  for live in select id from public.rounds where game_id = p_game and status = 'live' loop
    perform public.finalize_round(live.id);
  end loop;
  update public.games set status = 'finished' where id = p_game;
end $$;

-- Anyone in the game may call this when the clock hits zero (server verifies).
create function public.close_expired(p_round uuid) returns text
language plpgsql security definer set search_path = public as $$
declare rd public.rounds;
begin
  select * into rd from public.rounds where id = p_round;
  if not found then raise exception 'Round not found.'; end if;
  if not (public.is_host(rd.game_id) or public.is_member(rd.game_id)) then raise exception 'Not allowed.'; end if;
  if rd.status = 'live' and now() >= rd.ends_at then perform public.finalize_round(p_round); end if;
  return (select status from public.rounds where id = p_round);
end $$;

-- Check an answer. The solution never leaves the database.
create function public.submit_answer(p_round uuid, p_suspect text, p_weapon text, p_location text)
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

-- Only signed-in users may call the RPCs (anonymous players count as signed-in).
do $$
declare f text;
begin
  foreach f in array array[
    'server_time()', 'get_game_by_code(text)', 'join_game(text,text,text)',
    'join_team(text,text,text)', 'start_round(uuid,uuid)', 'stop_round(uuid)',
    'reveal_round(uuid)', 'finish_game(uuid)', 'close_expired(uuid)',
    'submit_answer(uuid,text,text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- 6. Realtime -----------------------------------------------

alter publication supabase_realtime add table
  public.games, public.rounds, public.teams, public.team_members, public.results;
