-- RiotCue MVP database. Apply once in Supabase SQL Editor.
-- API routes authenticate users and invoke these service-role-only RPC functions.
create extension if not exists pgcrypto;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Z2-9]{6}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  phase text not null default 'lobby'
    check (phase in ('lobby','countdown','playing','won','expired','finished')),
  actor_id uuid references auth.users(id) on delete set null,
  round_no int not null default 0 check (round_no >= 0),
  total_rounds int not null check (total_rounds between 1 and 30),
  duration_seconds int not null check (duration_seconds between 15 and 300),
  countdown_ends_at timestamptz,
  round_ends_at timestamptz,
  public_answer text,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 32),
  role text not null check (role in ('host','player','spectator')),
  score int not null default 0 check (score >= 0),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.round_secrets (
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no int not null,
  prompt text not null,
  primary key (room_id, round_no)
);

create index room_members_join_order on public.room_members(room_id, joined_at, user_id);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.round_secrets enable row level security;

-- SECURITY DEFINER avoids recursive policy evaluation on room_members.
create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.room_members
    where room_id = p_room and user_id = auth.uid()
  );
$$;
revoke all on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

create policy "members read room" on public.rooms for select to authenticated
  using (public.is_room_member(id));
create policy "members read roster" on public.room_members for select to authenticated
  using (public.is_room_member(room_id));
-- No client-side INSERT/UPDATE/DELETE policies. No policies for round_secrets.

create or replace function public.create_room(
  p_code text, p_user uuid, p_name text, p_duration int, p_rounds int
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_room uuid;
begin
  if p_user is null or length(btrim(p_name)) not between 1 and 32
     or p_duration not between 15 and 300 or p_rounds not between 1 and 30 then
    raise exception 'Invalid room settings';
  end if;
  insert into public.rooms(code,host_id,duration_seconds,total_rounds)
  values (upper(p_code),p_user,p_duration,p_rounds)
  returning id into v_room;
  insert into public.room_members(room_id,user_id,display_name,role)
  values (v_room,p_user,btrim(p_name),'host');
  return v_room;
end; $$;

create or replace function public.join_room(
  p_code text, p_user uuid, p_name text, p_spectator boolean
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_room uuid;
begin
  if p_user is null or length(btrim(p_name)) not between 1 and 32 then
    raise exception 'Invalid player name';
  end if;
  select id into v_room from public.rooms where code = upper(p_code) for update;
  if v_room is null then raise exception 'Room not found'; end if;
  insert into public.room_members(room_id,user_id,display_name,role)
    values(v_room,p_user,btrim(p_name),case when p_spectator then 'spectator' else 'player' end)
  on conflict (room_id,user_id) do update set display_name = excluded.display_name;
  return v_room;
end; $$;

create or replace function public.pick_prompt()
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_words text[] := array[
    'Titanic','Moonwalk','Surfing','Riding a roller coaster','Making pizza',
    'Walking on the moon','A dinosaur','Brushing your teeth','Skiing',
    'Playing air guitar','An astronaut','A cat stuck in a tree','Juggling',
    'A robot dancing','A movie star','Opening a stubborn jar','Swimming',
    'A superhero','A pirate','Flying an airplane','Doing the limbo',
    'A magician','Taking a selfie','A rock concert','Building a snowman',
    'A zombie','A penguin','Trying to catch a fly','A haunted house',
    'A race car driver','Walking a dog','A chicken','A goalkeeper',
    'A beekeeper','An octopus','A tornado','A chef','A baby learning to walk'
  ];
begin
  return v_words[1 + floor(random() * array_length(v_words, 1))::int];
end; $$;

create or replace function public.sync_room(p_room uuid, p_user uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_room public.rooms%rowtype;
begin
  if not exists (select 1 from public.room_members where room_id=p_room and user_id=p_user) then
    raise exception 'Not a room member';
  end if;
  select * into v_room from public.rooms where id = p_room for update;
  if not found then raise exception 'Room not found'; end if;

  if v_room.phase='countdown' and clock_timestamp() >= v_room.countdown_ends_at then
    update public.rooms set phase='playing',
      round_ends_at=v_room.countdown_ends_at + make_interval(secs => v_room.duration_seconds)
      where id=p_room returning * into v_room;
  end if;
  if v_room.phase='playing' and clock_timestamp() >= v_room.round_ends_at then
    update public.rooms set phase='expired',
      public_answer=(select prompt from public.round_secrets
        where room_id=p_room and round_no=v_room.round_no)
      where id=p_room;
  end if;
end; $$;

create or replace function public.act_room(p_room uuid, p_user uuid, p_action text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_room public.rooms%rowtype;
  v_actor uuid;
  v_count int;
  v_offset int;
  v_next_round int;
begin
  perform public.sync_room(p_room,p_user);
  select * into v_room from public.rooms where id=p_room for update;
  if not found then raise exception 'Room not found'; end if;

  if p_action = 'win' then
    if p_user <> v_room.host_id and p_user is distinct from v_room.actor_id then
      raise exception 'Only the actor or host can confirm a win';
    end if;
    if v_room.phase <> 'playing' or clock_timestamp() >= v_room.round_ends_at then
      raise exception 'Round is not active';
    end if;
    update public.rooms set phase='won',
      public_answer=(select prompt from public.round_secrets
        where room_id=p_room and round_no=v_room.round_no)
      where id=p_room;
    update public.room_members set score=score+10
      where room_id=p_room and user_id=v_room.actor_id;
    return;
  end if;

  if p_user <> v_room.host_id then raise exception 'Only host can control rounds'; end if;
  if p_action='start' and v_room.phase <> 'lobby' then
    raise exception 'Game already started';
  elsif p_action='next' and v_room.phase not in ('won','expired') then
    raise exception 'Round not completed';
  elsif p_action not in ('start','next') then
    raise exception 'Unknown action';
  end if;

  if p_action='next' and v_room.round_no >= v_room.total_rounds then
    update public.rooms set phase='finished' where id=p_room;
    return;
  end if;

  v_next_round := v_room.round_no + 1;
  select count(*) into v_count from public.room_members
    where room_id=p_room and role <> 'spectator';
  if v_count=0 then raise exception 'No active players'; end if;
  v_offset := (v_next_round-1) % v_count;
  select user_id into v_actor from public.room_members
    where room_id=p_room and role <> 'spectator'
    order by joined_at, user_id offset v_offset limit 1;

  insert into public.round_secrets(room_id,round_no,prompt)
    values(p_room,v_next_round,public.pick_prompt());

  update public.rooms set phase='countdown', actor_id=v_actor,
    round_no=v_next_round, countdown_ends_at=clock_timestamp()+interval '5 seconds',
    round_ends_at=null, public_answer=null
    where id=p_room;
end; $$;

create or replace function public.get_actor_prompt(p_room uuid, p_user uuid)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare v_prompt text;
begin
  select s.prompt into v_prompt from public.rooms r
    join public.round_secrets s on s.room_id=r.id and s.round_no=r.round_no
    where r.id=p_room and r.actor_id=p_user and r.phase in ('countdown','playing')
      and exists(select 1 from public.room_members m
        where m.room_id=r.id and m.user_id=p_user and m.role <> 'spectator');
  return v_prompt;
end; $$;

revoke all on function public.create_room(text,uuid,text,int,int) from public,anon,authenticated;
revoke all on function public.join_room(text,uuid,text,boolean) from public,anon,authenticated;
revoke all on function public.pick_prompt() from public,anon,authenticated;
revoke all on function public.sync_room(uuid,uuid) from public,anon,authenticated;
revoke all on function public.act_room(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.get_actor_prompt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_room(text,uuid,text,int,int) to service_role;
grant execute on function public.join_room(text,uuid,text,boolean) to service_role;
grant execute on function public.pick_prompt() to service_role;
grant execute on function public.sync_room(uuid,uuid) to service_role;
grant execute on function public.act_room(uuid,uuid,text) to service_role;
grant execute on function public.get_actor_prompt(uuid,uuid) to service_role;

-- Realtime receives sanitized shared state only, never round_secrets.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_members;
