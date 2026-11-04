-- =====================================================================
-- Migration: create Playwright Pixel Quest schema
--
-- Creates every table, column, index, policy, trigger and function used by
-- the API routes in src/app/api/rooms/**. Safe to run on an empty project
-- or on a partially created schema; re-running it is a no-op.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
--     or: supabase db push   (Supabase CLI)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- Public game state. Read by browsers (Realtime); written only by the server.
-- Used by: POST /api/rooms, GET /api/rooms/[code], host actions, join, vote.
create table if not exists public.rooms (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  status           text not null default 'lobby'
                   check (status in ('lobby', 'quest', 'voting', 'revealed', 'finished')),
  quest_index      integer not null default 0 check (quest_index >= 0),
  quest_count      integer not null default 5 check (quest_count > 0),
  timer_seconds    integer not null default 30 check (timer_seconds between 5 and 600),
  timer_started_at timestamptz,
  timer_ends_at    timestamptz,
  player_count     integer not null default 0 check (player_count >= 0),
  submitted_count  integer not null default 0 check (submitted_count >= 0),
  results          jsonb,
  history          jsonb not null default '[]'::jsonb,
  version          bigint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Host secret (SHA-256 hash only). Used by: POST /api/rooms, host actions.
create table if not exists public.room_hosts (
  room_id    uuid primary key references public.rooms (id) on delete cascade,
  token_hash text not null
);

-- Anonymous participants (token hash only, no names).
-- Used by: join, vote, me.
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

-- One vote per participant per quest. Used by: vote, me, reveal.
create table if not exists public.votes (
  id          bigint generated always as identity primary key,
  room_id     uuid not null references public.rooms (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  quest_index integer not null check (quest_index >= 0),
  answer      text not null check (answer in ('myth', 'fact')),
  created_at  timestamptz not null default now(),
  unique (player_id, quest_index)
);

-- ---------------------------------------------------------------------
-- 2. Columns (fills gaps if a table already existed in an older shape)
-- ---------------------------------------------------------------------

alter table public.rooms
  add column if not exists code             text,
  add column if not exists status           text not null default 'lobby',
  add column if not exists quest_index      integer not null default 0,
  add column if not exists quest_count      integer not null default 5,
  add column if not exists timer_seconds    integer not null default 30,
  add column if not exists timer_started_at timestamptz,
  add column if not exists timer_ends_at    timestamptz,
  add column if not exists player_count     integer not null default 0,
  add column if not exists submitted_count  integer not null default 0,
  add column if not exists results          jsonb,
  add column if not exists history          jsonb not null default '[]'::jsonb,
  add column if not exists version          bigint not null default 0,
  add column if not exists created_at       timestamptz not null default now(),
  add column if not exists updated_at       timestamptz not null default now();

alter table public.room_hosts
  add column if not exists token_hash text;

alter table public.players
  add column if not exists room_id    uuid references public.rooms (id) on delete cascade,
  add column if not exists token_hash text,
  add column if not exists created_at timestamptz not null default now();

alter table public.votes
  add column if not exists room_id     uuid references public.rooms (id) on delete cascade,
  add column if not exists player_id   uuid references public.players (id) on delete cascade,
  add column if not exists quest_index integer,
  add column if not exists answer      text,
  add column if not exists created_at  timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------

-- Room lookup by code (findRoomByCode) and code-collision retry (23505).
create unique index if not exists rooms_code_key on public.rooms (code);
-- Required by `on conflict (player_id, quest_index)` in pq_submit_vote.
create unique index if not exists votes_player_id_quest_index_key on public.votes (player_id, quest_index);
create index if not exists players_room_id_idx on public.players (room_id);
create index if not exists votes_room_quest_idx on public.votes (room_id, quest_index);

-- ---------------------------------------------------------------------
-- 4. Row Level Security & privileges
-- ---------------------------------------------------------------------

alter table public.rooms      enable row level security;
alter table public.room_hosts enable row level security;
alter table public.players    enable row level security;
alter table public.votes      enable row level security;

-- Browsers may only READ public room state (needed for Realtime).
drop policy if exists "Public can read room state" on public.rooms;
create policy "Public can read room state"
  on public.rooms for select
  to anon, authenticated
  using (true);

-- No policies on room_hosts / players / votes => invisible to the anon key.
revoke all on public.room_hosts, public.players, public.votes from anon, authenticated;
revoke insert, update, delete, truncate on public.rooms from anon, authenticated;
grant select on public.rooms to anon, authenticated;

-- The Next.js server uses the service-role key for every write.
grant usage on schema public to service_role;
grant select, insert, update, delete
  on public.rooms, public.room_hosts, public.players, public.votes
  to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------

-- Bumps rooms.version on every update so clients discard stale snapshots.
create or replace function public.pq_touch_room()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rooms_touch on public.rooms;
create trigger rooms_touch
  before update on public.rooms
  for each row execute function public.pq_touch_room();

-- Keeps rooms.player_count in sync when POST /api/rooms/[code]/join inserts a player.
create or replace function public.pq_on_player_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.rooms set player_count = player_count + 1 where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists players_count on public.players;
create trigger players_count
  after insert on public.players
  for each row execute function public.pq_on_player_insert();

-- ---------------------------------------------------------------------
-- 6. RPC functions called by the API
-- ---------------------------------------------------------------------

-- supabase.rpc("pq_submit_vote", { p_room_id, p_player_id, p_quest_index, p_answer })
-- Returns: 'ok' | 'already_voted' | 'voting_closed' | 'time_up' | 'invalid_answer' | 'room_not_found'
create or replace function public.pq_submit_vote(
  p_room_id     uuid,
  p_player_id   uuid,
  p_quest_index integer,
  p_answer      text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  inserted integer;
begin
  if p_answer not in ('myth', 'fact') then
    return 'invalid_answer';
  end if;

  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    return 'room_not_found';
  end if;

  if r.status <> 'voting' or r.quest_index <> p_quest_index then
    return 'voting_closed';
  end if;

  if r.timer_ends_at is not null
     and now() > r.timer_ends_at + interval '1500 milliseconds' then
    return 'time_up';
  end if;

  insert into public.votes (room_id, player_id, quest_index, answer)
  values (p_room_id, p_player_id, p_quest_index, p_answer)
  on conflict (player_id, quest_index) do nothing;

  get diagnostics inserted = row_count;
  if inserted = 0 then
    return 'already_voted';
  end if;

  update public.rooms
     set submitted_count = submitted_count + 1
   where id = p_room_id;

  return 'ok';
end;
$$;

-- supabase.rpc("pq_reveal_quest", { p_room_id, p_quest_index, p_correct, p_explanation })
-- Returns: { ok: true, result } | { error: 'not_ready' | 'not_voting' | 'room_not_found' | 'invalid_answer' }
create or replace function public.pq_reveal_quest(
  p_room_id     uuid,
  p_quest_index integer,
  p_correct     text,
  p_explanation text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  r          public.rooms%rowtype;
  v_myth     integer;
  v_fact     integer;
  v_total    integer;
  v_myth_pct integer;
  v_fact_pct integer;
  v_majority text;
  v_result   jsonb;
begin
  if p_correct not in ('myth', 'fact') then
    return jsonb_build_object('error', 'invalid_answer');
  end if;

  select * into r from public.rooms where id = p_room_id for update;
  if not found then
    return jsonb_build_object('error', 'room_not_found');
  end if;

  if r.status <> 'voting' or r.quest_index <> p_quest_index then
    return jsonb_build_object('error', 'not_voting');
  end if;

  if not (
    (r.player_count > 0 and r.submitted_count >= r.player_count)
    or coalesce(now() >= r.timer_ends_at, false)
  ) then
    return jsonb_build_object('error', 'not_ready');
  end if;

  select count(*) filter (where answer = 'myth'),
         count(*) filter (where answer = 'fact')
    into v_myth, v_fact
    from public.votes
   where room_id = p_room_id
     and quest_index = p_quest_index;

  v_total := v_myth + v_fact;

  if v_total > 0 then
    v_myth_pct := round(v_myth * 100.0 / v_total);
    v_fact_pct := 100 - v_myth_pct;
  else
    v_myth_pct := 0;
    v_fact_pct := 0;
  end if;

  v_majority := case
    when v_total = 0 then 'none'
    when v_myth > v_fact then 'myth'
    when v_fact > v_myth then 'fact'
    else 'tie'
  end;

  v_result := jsonb_build_object(
    'questIndex',   p_quest_index,
    'myth',         v_myth,
    'fact',         v_fact,
    'total',        v_total,
    'mythPct',      v_myth_pct,
    'factPct',      v_fact_pct,
    'majority',     v_majority,
    'correct',      p_correct,
    'explanation',  p_explanation,
    'participants', r.player_count,
    'revealedAt',   now()
  );

  update public.rooms
     set status  = 'revealed',
         results = v_result,
         history = history || jsonb_build_array(v_result)
   where id = p_room_id;

  return jsonb_build_object('ok', true, 'result', v_result);
end;
$$;

-- Only the server (service role) may call the game functions.
revoke all on function public.pq_submit_vote(uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.pq_reveal_quest(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.pq_touch_room() from public, anon, authenticated;
revoke all on function public.pq_on_player_insert() from public, anon, authenticated;
grant execute on function public.pq_submit_vote(uuid, uuid, integer, text) to service_role;
grant execute on function public.pq_reveal_quest(uuid, integer, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 7. Realtime: stream UPDATEs of public.rooms to subscribed browsers
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Make the Supabase Data API (PostgREST) see the new tables immediately
-- ---------------------------------------------------------------------

notify pgrst, 'reload schema';

commit;
