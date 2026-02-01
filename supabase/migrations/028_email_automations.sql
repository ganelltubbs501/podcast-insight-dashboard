-- 028_email_automations.sql
-- Maps LoquiHQ triggers to provider automations

create table if not exists public.email_automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('mailchimp','kit')),
  destination_id uuid references public.email_destinations(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('tag_applied')),
  trigger_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_automations enable row level security;

create policy "select own email automations"
on public.email_automations for select
using (auth.uid() = user_id);

create policy "insert own email automations"
on public.email_automations for insert
with check (auth.uid() = user_id);

create policy "update own email automations"
on public.email_automations for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own email automations"
on public.email_automations for delete
using (auth.uid() = user_id);

create index if not exists email_automations_user_id_idx on public.email_automations(user_id);

create trigger update_email_automations_updated_at
  before update on public.email_automations
  for each row
  execute function update_updated_at_column();
