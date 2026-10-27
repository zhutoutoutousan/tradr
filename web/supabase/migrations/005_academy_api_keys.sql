-- Academy API keys + learning events for Tradr API / Cursor dogfooding.
-- Keys: plaintext shown once; only sha256 hash stored.
-- Lookup via security-definer RPC so Bearer auth works without service role.

create table if not exists public.academy_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['planet:read','lexicon:read']::text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists academy_api_keys_user_idx on public.academy_api_keys (user_id);
create index if not exists academy_api_keys_hash_idx on public.academy_api_keys (key_hash) where revoked_at is null;

create table if not exists public.academy_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'api',
  created_at timestamptz not null default now()
);

create index if not exists academy_learning_events_user_created_idx
  on public.academy_learning_events (user_id, created_at desc);

alter table public.academy_api_keys enable row level security;
alter table public.academy_learning_events enable row level security;

create policy "users_manage_own_api_keys"
  on public.academy_api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_read_own_learning_events"
  on public.academy_learning_events for select
  using (auth.uid() = user_id);

create policy "users_insert_own_learning_events"
  on public.academy_learning_events for insert
  with check (auth.uid() = user_id);

-- Bearer key → user + scopes (callable with anon key)
create or replace function public.academy_lookup_api_key(p_key_hash text)
returns table (key_id uuid, user_id uuid, scopes text[])
language sql
security definer
set search_path = public
as $$
  select k.id, k.user_id, k.scopes
  from public.academy_api_keys k
  where k.key_hash = p_key_hash
    and k.revoked_at is null
  limit 1;
$$;

revoke all on function public.academy_lookup_api_key(text) from public;
grant execute on function public.academy_lookup_api_key(text) to anon, authenticated;

create or replace function public.academy_touch_api_key(p_key_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.academy_api_keys
  set last_used_at = now()
  where id = p_key_id and revoked_at is null;
$$;

revoke all on function public.academy_touch_api_key(uuid) from public;
grant execute on function public.academy_touch_api_key(uuid) to anon, authenticated;

create or replace function public.academy_insert_learning_event(
  p_user_id uuid,
  p_kind text,
  p_payload jsonb,
  p_source text default 'api'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.academy_learning_events (user_id, kind, payload, source)
  values (p_user_id, p_kind, coalesce(p_payload, '{}'::jsonb), coalesce(p_source, 'api'))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.academy_insert_learning_event(uuid, text, jsonb, text) from public;
grant execute on function public.academy_insert_learning_event(uuid, text, jsonb, text) to anon, authenticated;
