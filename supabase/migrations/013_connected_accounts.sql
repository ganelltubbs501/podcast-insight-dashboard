create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  profile jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.connected_accounts enable row level security;

create policy "select own connected accounts"
on public.connected_accounts for select
using (auth.uid() = user_id);

create policy "insert own connected accounts"
on public.connected_accounts for insert
with check (auth.uid() = user_id);

create policy "update own connected accounts"
on public.connected_accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own connected accounts"
on public.connected_accounts for delete
using (auth.uid() = user_id);
