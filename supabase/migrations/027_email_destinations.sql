-- 027_email_destinations.sql
-- Stores per-user email destinations (Mailchimp, Kit, etc.)

create table if not exists public.email_destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('mailchimp','kit','sendgrid','beehiiv','gohighlevel')),
  audience_id text,
  name text default 'Default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_destinations enable row level security;

create policy "select own email destinations"
on public.email_destinations for select
using (auth.uid() = user_id);

create policy "insert own email destinations"
on public.email_destinations for insert
with check (auth.uid() = user_id);

create policy "update own email destinations"
on public.email_destinations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own email destinations"
on public.email_destinations for delete
using (auth.uid() = user_id);

create index if not exists email_destinations_user_id_idx on public.email_destinations(user_id);

create trigger update_email_destinations_updated_at
  before update on public.email_destinations
  for each row
  execute function update_updated_at_column();
