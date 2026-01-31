-- 018_teams_and_members.sql
-- Teams + members + invites (tables first, then RLS + policies)

-- =========
-- TABLES
-- =========

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists teams_owner_user_id_idx on public.teams(owner_user_id);

-- Team member roles (simple + scalable)
-- owner/admin/editor/viewer
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(team_id, user_id)
);

create index if not exists team_members_team_id_idx on public.team_members(team_id);
create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- Optional: invites table (email-based)
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  email_normalized text,
  role text not null check (role in ('admin','editor','viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists team_invites_team_id_idx on public.team_invites(team_id);
create index if not exists team_invites_email_norm_idx on public.team_invites(email_normalized);

-- Normalize email into email_normalized
create or replace function public.normalize_team_invite_email()
returns trigger
language plpgsql
as $$
begin
  new.email_normalized := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_normalize_team_invite_email on public.team_invites;

create trigger trg_normalize_team_invite_email
before insert or update on public.team_invites
for each row
execute function public.normalize_team_invite_email();

-- One active invite per email per team
create unique index if not exists team_invites_one_active_per_email
on public.team_invites(team_id, email_normalized)
where accepted_at is null and revoked_at is null;

-- =========
-- RLS
-- =========

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

-- =========
-- POLICIES (after tables exist)
-- =========

-- Teams: members can view teams
drop policy if exists "Team members can view their teams" on public.teams;
create policy "Team members can view their teams"
on public.teams
for select
using (
  id in (select team_id from public.team_members where user_id = auth.uid())
);

-- Teams: owner can update team
drop policy if exists "Team owner can update team" on public.teams;
create policy "Team owner can update team"
on public.teams
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Teams: authenticated can create team (they become owner via app logic)
drop policy if exists "Authenticated can create team" on public.teams;
create policy "Authenticated can create team"
on public.teams
for insert
with check (auth.uid() = owner_user_id);

-- Members: team members can view membership list
drop policy if exists "Team members can view members" on public.team_members;
create policy "Team members can view members"
on public.team_members
for select
using (
  team_id in (select team_id from public.team_members where user_id = auth.uid())
);

-- Members: only owner/admin can add members
drop policy if exists "Owner/admin can add members" on public.team_members;
create policy "Owner/admin can add members"
on public.team_members
for insert
with check (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner','admin')
  )
);

-- Members: only owner/admin can update roles
drop policy if exists "Owner/admin can update members" on public.team_members;
create policy "Owner/admin can update members"
on public.team_members
for update
using (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner','admin')
  )
);

-- Invites: members can view invites for their team
drop policy if exists "Team members can view invites" on public.team_invites;
create policy "Team members can view invites"
on public.team_invites
for select
using (
  team_id in (select team_id from public.team_members where user_id = auth.uid())
);

-- Invites: owner/admin can create invites
drop policy if exists "Owner/admin can create invites" on public.team_invites;
create policy "Owner/admin can create invites"
on public.team_invites
for insert
with check (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invites.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner','admin')
  )
);

-- Invites: owner/admin can revoke invites
drop policy if exists "Owner/admin can update invites" on public.team_invites;
create policy "Owner/admin can update invites"
on public.team_invites
for update
using (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invites.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_invites.team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner','admin')
  )
);
