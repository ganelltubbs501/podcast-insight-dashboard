-- 019_add_team_id_to_content_tables.sql
-- Adds team_id to transcripts and scheduled_posts for team collaboration
-- Legacy rows with team_id null remain "personal workspace" until migrated
-- NOTE: Must run AFTER 018_teams_and_members.sql (which creates teams/team_members tables)

-- Add team_id to transcripts
alter table public.transcripts
add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists transcripts_team_id_idx
on public.transcripts(team_id);

-- Add team_id to scheduled_posts
alter table public.scheduled_posts
add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists scheduled_posts_team_id_idx
on public.scheduled_posts(team_id);

-- Update RLS policies to include team-based access for transcripts
-- Users can view transcripts if they own them OR belong to the same team
drop policy if exists "Users can view their own transcripts" on public.transcripts;
create policy "Users can view own or team transcripts"
  on public.transcripts for select
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own transcripts" on public.transcripts;
create policy "Users can update own or team transcripts"
  on public.transcripts for update
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own transcripts" on public.transcripts;
create policy "Users can delete own or team transcripts"
  on public.transcripts for delete
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Keep insert policy user-scoped (user creates, then can assign to team)
drop policy if exists "Users can create transcripts" on public.transcripts;
drop policy if exists "Users can insert their own transcripts" on public.transcripts;
create policy "Users can insert their own transcripts"
  on public.transcripts for insert
  with check (auth.uid() = user_id);

-- Update RLS policies for scheduled_posts
drop policy if exists "Users can view their own scheduled posts" on public.scheduled_posts;
create policy "Users can view own or team scheduled posts"
  on public.scheduled_posts for select
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own scheduled posts" on public.scheduled_posts;
create policy "Users can update own or team scheduled posts"
  on public.scheduled_posts for update
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own scheduled posts" on public.scheduled_posts;
create policy "Users can delete own or team scheduled posts"
  on public.scheduled_posts for delete
  using (
    auth.uid() = user_id
    or team_id in (
      select team_id from public.team_members where user_id = auth.uid()
    )
  );

-- Keep insert policy user-scoped
drop policy if exists "Users can insert their own scheduled posts" on public.scheduled_posts;
create policy "Users can insert their own scheduled posts"
  on public.scheduled_posts for insert
  with check (auth.uid() = user_id);

-- Add helpful comments
comment on column public.transcripts.team_id is 'Team ID for team collaboration. NULL means personal workspace.';
comment on column public.scheduled_posts.team_id is 'Team ID for team collaboration. NULL means personal workspace.';
