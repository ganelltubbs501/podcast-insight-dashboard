create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  provider text not null, -- 'linkedin'
  account_id text,        -- provider user id
  account_name text,      -- display name

  access_token text not null,    -- encrypted
  refresh_token text,            -- encrypted (if provided)
  token_expires_at timestamptz,

  scopes text[] default '{}',

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),

  unique(user_id, provider)
);

alter table public.connected_accounts enable row level security;

create policy "Users can view their connected accounts"
on public.connected_accounts for select
using (auth.uid() = user_id);

create policy "Users can insert their connected accounts"
on public.connected_accounts for insert
with check (auth.uid() = user_id);

create policy "Users can update their connected accounts"
on public.connected_accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their connected accounts"
on public.connected_accounts for delete
using (auth.uid() = user_id);

-- updated_at trigger (if you already have update_updated_at_column() use it)
do $$ begin
  create trigger update_connected_accounts_updated_at
  before update on public.connected_accounts
  for each row
  execute function update_updated_at_column();
exception when duplicate_object then null;
end $$;
