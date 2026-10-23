-- Account XP, replay links on game history, stored round replays and replay danmaku.

alter table public.user_profiles add column if not exists xp int not null default 0;

alter table public.user_game_history add column if not exists xp_gained int not null default 0;
alter table public.user_game_history add column if not exists total_players smallint;
alter table public.user_game_history add column if not exists replay_id text;

create or replace function update_user_stats_after_game()
returns trigger as $$
begin
  update public.user_profiles
  set
    total_games = total_games + 1,
    total_wins = total_wins + case when new.rank = 1 then 1 else 0 end,
    total_profit = total_profit + new.profit,
    best_return_pct = greatest(best_return_pct, new.return_pct),
    best_single_profit = greatest(best_single_profit, new.profit),
    elo_rating = new.elo_after,
    best_elo = greatest(best_elo, new.elo_after),
    xp = xp + greatest(new.xp_gained, 0),
    last_played_at = new.played_at,
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

-- Full round recordings (price path, every trader's trades, equity samples, chat).
create table if not exists public.game_replays (
  id text primary key,
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('solo', 'multiplayer')),
  room text,
  round_number int,
  market_id text not null,
  market_label text not null,
  duration_ticks int not null,
  recording jsonb not null check (pg_column_size(recording) < 3000000),
  device_id uuid,
  user_id uuid references auth.users(id) on delete set null
);

create index if not exists game_replays_created_at_idx on public.game_replays (created_at desc);

alter table public.game_replays enable row level security;

create policy "anyone_can_read_replays"
  on public.game_replays for select
  to anon, authenticated
  using (true);

create policy "anyone_can_insert_replays"
  on public.game_replays for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Danmaku left by replay viewers, pinned to a point on the replay timeline.
create table if not exists public.replay_comments (
  id uuid primary key default gen_random_uuid(),
  replay_id text not null references public.game_replays(id) on delete cascade,
  tick int not null check (tick >= 0),
  name text not null check (length(name) between 1 and 24),
  text text not null check (length(text) between 1 and 120),
  color text,
  created_at timestamptz not null default now()
);

create index if not exists replay_comments_replay_idx on public.replay_comments (replay_id, tick);

alter table public.replay_comments enable row level security;

create policy "anyone_can_read_replay_comments"
  on public.replay_comments for select
  to anon, authenticated
  using (true);

create policy "anyone_can_insert_replay_comments"
  on public.replay_comments for insert
  to anon, authenticated
  with check (true);
