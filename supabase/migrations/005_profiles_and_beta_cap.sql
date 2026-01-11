-- 005_profiles_and_beta_cap.sql
-- Creates profiles table and enforces a 50-user beta cap.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Basic RLS: users can see their own profile
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

-- Users can insert only their own profile (important for first login)
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- Users can update only their own profile (optional, safe default)
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

-- Enforce beta cap of 50 profiles
create or replace function public.enforce_beta_cap()
returns trigger
language plpgsql
security definer
as $$
declare
  user_count integer;
begin
  select count(*) into user_count from public.profiles;

  if user_count >= 50 then
    raise exception 'Beta is full (50 users).';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_beta_cap on public.profiles;

create trigger trg_enforce_beta_cap
before insert on public.profiles
for each row
execute function public.enforce_beta_cap();
