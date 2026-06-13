-- Live multiplayer room directory (heartbeat while at least one trader is in lobby/game).

create table if not exists public.active_mp_rooms (
  room_code text primary key,
  traders smallint not null default 0 check (traders >= 0),
  spectators smallint not null default 0 check (spectators >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists active_mp_rooms_updated_at_idx
  on public.active_mp_rooms (updated_at desc);

alter table public.active_mp_rooms enable row level security;

create policy "anon_select_active_mp_rooms"
  on public.active_mp_rooms for select
  to anon, authenticated
  using (true);

create policy "anon_insert_active_mp_rooms"
  on public.active_mp_rooms for insert
  to anon, authenticated
  with check (true);

create policy "anon_update_active_mp_rooms"
  on public.active_mp_rooms for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "anon_delete_active_mp_rooms"
  on public.active_mp_rooms for delete
  to anon, authenticated
  using (true);