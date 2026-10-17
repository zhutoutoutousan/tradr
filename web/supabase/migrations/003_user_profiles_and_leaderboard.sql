-- User profiles and global leaderboard system
-- Extends Supabase Auth with game-specific profile data

-- User profiles table (one per auth.users record)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (length(username) >= 3 and length(username) <= 20),
  display_name text check (length(display_name) <= 50),
  avatar_url text,
  
  -- Game stats
  elo_rating int not null default 1200,
  best_elo int not null default 1200,
  total_games int not null default 0,
  total_wins int not null default 0,
  total_profit numeric not null default 0,
  best_return_pct numeric not null default 0,
  best_single_profit numeric not null default 0,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_played_at timestamptz,
  
  -- Preferences
  preferred_language text default 'de' check (preferred_language in ('de', 'en')),
  show_in_leaderboard boolean not null default true
);

-- Indexes for leaderboard queries
create index if not exists user_profiles_elo_idx 
  on public.user_profiles (elo_rating desc) 
  where show_in_leaderboard = true;

create index if not exists user_profiles_total_games_idx 
  on public.user_profiles (total_games desc);

create index if not exists user_profiles_username_idx 
  on public.user_profiles (username);

-- Game history for authenticated users (linked to profiles)
create table if not exists public.user_game_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  
  -- Game details
  played_at timestamptz not null default now(),
  mode text not null check (mode in ('solo', 'multiplayer')),
  market_id text not null,
  market_label text not null,
  seed bigint not null,
  
  -- Results
  rank smallint not null,
  return_pct numeric not null,
  profit numeric not null,
  trades smallint not null default 0,
  final_balance numeric not null,
  
  -- ELO changes
  elo_before int not null,
  elo_after int not null,
  elo_change int not null,
  
  -- Full game data for replay
  review_json jsonb not null,
  setup_json jsonb
);

create index if not exists user_game_history_user_idx 
  on public.user_game_history (user_id, played_at desc);

create index if not exists user_game_history_played_at_idx 
  on public.user_game_history (played_at desc);

-- Global leaderboard snapshot (updated periodically)
create table if not exists public.global_leaderboard (
  rank int not null,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  username text not null,
  display_name text,
  elo_rating int not null,
  total_games int not null,
  total_wins int not null,
  win_rate numeric not null,
  updated_at timestamptz not null default now(),
  
  primary key (rank)
);

create index if not exists global_leaderboard_user_idx 
  on public.global_leaderboard (user_id);

-- Achievements tracking
create table if not exists public.user_achievements (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  game_id uuid references public.user_game_history(id),
  
  primary key (user_id, achievement_id)
);

create index if not exists user_achievements_user_idx 
  on public.user_achievements (user_id);

-- RLS Policies

-- user_profiles
alter table public.user_profiles enable row level security;

create policy "users_can_read_all_profiles"
  on public.user_profiles for select
  using (true);

create policy "users_can_insert_own_profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "users_can_update_own_profile"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- user_game_history
alter table public.user_game_history enable row level security;

create policy "users_can_read_own_history"
  on public.user_game_history for select
  using (auth.uid() = user_id);

create policy "users_can_insert_own_history"
  on public.user_game_history for insert
  with check (auth.uid() = user_id);

-- global_leaderboard (read-only for users)
alter table public.global_leaderboard enable row level security;

create policy "anyone_can_read_leaderboard"
  on public.global_leaderboard for select
  using (true);

-- user_achievements
alter table public.user_achievements enable row level security;

create policy "users_can_read_own_achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "users_can_insert_own_achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- Functions

-- Update user profile stats after game
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
    last_played_at = new.played_at,
    updated_at = now()
  where id = new.user_id;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger update_stats_after_game
  after insert on public.user_game_history
  for each row
  execute function update_user_stats_after_game();

-- Refresh global leaderboard (call periodically)
create or replace function refresh_global_leaderboard()
returns void as $$
begin
  truncate table public.global_leaderboard;
  
  insert into public.global_leaderboard (rank, user_id, username, display_name, elo_rating, total_games, total_wins, win_rate)
  select
    row_number() over (order by elo_rating desc) as rank,
    id as user_id,
    username,
    display_name,
    elo_rating,
    total_games,
    total_wins,
    case when total_games > 0 then (total_wins::numeric / total_games * 100) else 0 end as win_rate
  from public.user_profiles
  where show_in_leaderboard = true
    and total_games >= 5  -- Minimum 5 games to appear on leaderboard
  order by elo_rating desc
  limit 1000;  -- Top 1000 players
end;
$$ language plpgsql security definer;

-- Auto-refresh leaderboard on profile update (debounced by trigger)
create or replace function maybe_refresh_leaderboard()
returns trigger as $$
begin
  -- Only refresh if ELO changed significantly or it's been a while
  if (new.elo_rating - old.elo_rating) > 10 or 
     (new.elo_rating - old.elo_rating) < -10 or
     old.updated_at < now() - interval '5 minutes' then
    perform refresh_global_leaderboard();
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger auto_refresh_leaderboard
  after update on public.user_profiles
  for each row
  when (new.show_in_leaderboard = true)
  execute function maybe_refresh_leaderboard();

-- Initialize leaderboard
select refresh_global_leaderboard();
