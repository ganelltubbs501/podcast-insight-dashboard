-- 006_podcast_connectors_and_metrics.sql
-- LoquiHQ Podcast Connect (RSS + metrics snapshots + monetization projections)
-- One show per user enforced (for now), with a future expansion path.

-- Enable uuid generation (Supabase usually has this, but safe to ensure)
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type public.podcast_provider as enum (
    'unknown',
    'buzzsprout',
    'libsyn',
    'transistor',
    'captivate',
    'simplecast',
    'spotify_for_creators',
    'anchor',
    'rss_only'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.connection_status as enum ('connected', 'error', 'disconnected');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.metrics_source as enum ('manual', 'api', 'csv', 'carry_forward');
exception
  when duplicate_object then null;
end $$;

-- ---------- PODCASTS (one per user for now) ----------
create table if not exists public.podcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Future expansion runway (optional now)
  -- Later you can introduce account_id/workspace_id and move uniqueness there.
  account_id uuid null,

  title text not null,
  author text null,
  description text null,
  image_url text null,
  language text null,
  categories jsonb not null default '[]'::jsonb,
  explicit boolean not null default false,
  website_url text null,

  rss_url text not null,
  latest_episode_at timestamptz null,
  episode_count_total integer not null default 0,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Enforce ONE show per user (for now)
do $$ begin
  create unique index podcasts_one_per_user on public.podcasts(user_id);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- Add rss_url column if it doesn't exist (table may have been created by earlier migration without it)
alter table public.podcasts add column if not exists rss_url text;

do $$ begin
  create unique index podcasts_rss_unique on public.podcasts(rss_url);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- ---------- CONNECTIONS ----------
create table if not exists public.podcast_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,

  rss_url text not null,
  provider public.podcast_provider not null default 'unknown',
  provider_show_id text null,

  status public.connection_status not null default 'connected',
  last_rss_sync_at timestamptz null,
  last_analytics_sync_at timestamptz null,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Add podcast_id column if it doesn't exist (table may have been created by earlier migration without it)
alter table public.podcast_connections add column if not exists podcast_id uuid references public.podcasts(id) on delete cascade;

-- Keep 1 connection per podcast
do $$ begin
  create unique index podcast_connections_one_per_podcast on public.podcast_connections(podcast_id);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- ---------- EPISODES (from RSS) ----------
create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,

  guid text not null,
  title text not null,
  published_at timestamptz not null,
  duration_sec integer null,
  audio_url text null,

  episode_number integer null,
  season_number integer null,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

do $$ begin
  create unique index podcast_episodes_guid_unique on public.podcast_episodes(podcast_id, guid);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

do $$ begin
  create index podcast_episodes_published_at_idx on public.podcast_episodes(podcast_id, published_at desc);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- ---------- METRICS SNAPSHOTS (weekly snapshots, rolling 30-day avg fields stored) ----------
create table if not exists public.podcast_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,

  -- Period the metrics represent (rolling 30 days)
  period_start date not null,
  period_end date not null,

  source public.metrics_source not null default 'manual',

  -- Manual requires BOTH (your choice #2)
  downloads_30d_total integer not null check (downloads_30d_total >= 0),
  avg_downloads_per_episode_30d integer not null check (avg_downloads_per_episode_30d >= 0),

  -- Optional extras (when available)
  avg_downloads_per_episode_7d integer null check (avg_downloads_per_episode_7d is null or avg_downloads_per_episode_7d >= 0),
  unique_listeners_30d integer null check (unique_listeners_30d is null or unique_listeners_30d >= 0),
  followers_total integer null check (followers_total is null or followers_total >= 0),
  followers_change_30d integer null,

  top_countries jsonb not null default '[]'::jsonb,
  platforms jsonb not null default '[]'::jsonb, -- optional breakdown if provided

  raw jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc'::text, now())
);

do $$ begin
  create index podcast_metrics_snapshots_period_idx on public.podcast_metrics_snapshots(podcast_id, period_end desc);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- ---------- MONETIZATION PROJECTIONS (derived outputs per snapshot) ----------
create table if not exists public.monetization_projections (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  snapshot_id uuid not null references public.podcast_metrics_snapshots(id) on delete cascade,

  assumptions jsonb not null default '{}'::jsonb,

  sellable_impressions_est integer not null default 0 check (sellable_impressions_est >= 0),

  sponsor_rev_low numeric(12,2) not null default 0,
  sponsor_rev_mid numeric(12,2) not null default 0,
  sponsor_rev_high numeric(12,2) not null default 0,

  affiliate_rev_est numeric(12,2) null,
  subscription_rev_est numeric(12,2) null,

  created_at timestamptz not null default timezone('utc'::text, now())
);

do $$ begin
  create unique index monetization_projections_one_per_snapshot on public.monetization_projections(snapshot_id);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- ---------- RLS ----------
alter table public.podcasts enable row level security;
alter table public.podcast_connections enable row level security;
alter table public.podcast_episodes enable row level security;
alter table public.podcast_metrics_snapshots enable row level security;
alter table public.monetization_projections enable row level security;

-- Podcasts: user owns row
drop policy if exists "Users can view own podcasts" on public.podcasts;
create policy "Users can view own podcasts"
on public.podcasts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own podcasts" on public.podcasts;
create policy "Users can insert own podcasts"
on public.podcasts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own podcasts" on public.podcasts;
create policy "Users can update own podcasts"
on public.podcasts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own podcasts" on public.podcasts;
create policy "Users can delete own podcasts"
on public.podcasts for delete
to authenticated
using (auth.uid() = user_id);

-- Connections/Episodes/Snapshots/Projections: access via podcast ownership
drop policy if exists "Users can view own podcast connections" on public.podcast_connections;
create policy "Users can view own podcast connections"
on public.podcast_connections for select
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_connections.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can insert own podcast connections" on public.podcast_connections;
create policy "Users can insert own podcast connections"
on public.podcast_connections for insert
to authenticated
with check (exists (
  select 1 from public.podcasts p
  where p.id = podcast_connections.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can update own podcast connections" on public.podcast_connections;
create policy "Users can update own podcast connections"
on public.podcast_connections for update
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_connections.podcast_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from public.podcasts p
  where p.id = podcast_connections.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can delete own podcast connections" on public.podcast_connections;
create policy "Users can delete own podcast connections"
on public.podcast_connections for delete
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_connections.podcast_id and p.user_id = auth.uid()
));

-- Episodes
drop policy if exists "Users can view own episodes" on public.podcast_episodes;
create policy "Users can view own episodes"
on public.podcast_episodes for select
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_episodes.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can insert own episodes" on public.podcast_episodes;
create policy "Users can insert own episodes"
on public.podcast_episodes for insert
to authenticated
with check (exists (
  select 1 from public.podcasts p
  where p.id = podcast_episodes.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can update own episodes" on public.podcast_episodes;
create policy "Users can update own episodes"
on public.podcast_episodes for update
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_episodes.podcast_id and p.user_id = auth.uid()
))
with check (exists (
  select 1 from public.podcasts p
  where p.id = podcast_episodes.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can delete own episodes" on public.podcast_episodes;
create policy "Users can delete own episodes"
on public.podcast_episodes for delete
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_episodes.podcast_id and p.user_id = auth.uid()
));

-- Metrics snapshots
drop policy if exists "Users can view own podcast metrics" on public.podcast_metrics_snapshots;
create policy "Users can view own podcast metrics"
on public.podcast_metrics_snapshots for select
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_metrics_snapshots.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can insert own podcast metrics" on public.podcast_metrics_snapshots;
create policy "Users can insert own podcast metrics"
on public.podcast_metrics_snapshots for insert
to authenticated
with check (exists (
  select 1 from public.podcasts p
  where p.id = podcast_metrics_snapshots.podcast_id and p.user_id = auth.uid()
));

-- (Optional) allow update/delete for snapshots. Usually you allow delete, avoid update.
drop policy if exists "Users can delete own podcast metrics" on public.podcast_metrics_snapshots;
create policy "Users can delete own podcast metrics"
on public.podcast_metrics_snapshots for delete
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = podcast_metrics_snapshots.podcast_id and p.user_id = auth.uid()
));

-- Projections
drop policy if exists "Users can view own projections" on public.monetization_projections;
create policy "Users can view own projections"
on public.monetization_projections for select
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = monetization_projections.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can insert own projections" on public.monetization_projections;
create policy "Users can insert own projections"
on public.monetization_projections for insert
to authenticated
with check (exists (
  select 1 from public.podcasts p
  where p.id = monetization_projections.podcast_id and p.user_id = auth.uid()
));

drop policy if exists "Users can delete own projections" on public.monetization_projections;
create policy "Users can delete own projections"
on public.monetization_projections for delete
to authenticated
using (exists (
  select 1 from public.podcasts p
  where p.id = monetization_projections.podcast_id and p.user_id = auth.uid()
));

comment on table public.podcasts is 'One podcast per user (for now). Future: allow multiple podcasts per account/workspace.';
comment on table public.podcast_metrics_snapshots is 'Weekly snapshots storing rolling 30-day metrics (manual/api/csv).';
comment on table public.monetization_projections is 'Derived monetization estimates per metrics snapshot.';
