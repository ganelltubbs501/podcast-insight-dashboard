-- Podcast Analytics System
-- Migration: 009_podcast_analytics.sql
-- Description: Create tables for podcast connections, metadata, episodes, metrics, and monetization projections

-- ============================================================================
-- 1. podcast_connections (one row per user - stores RSS connection info)
-- ============================================================================
create table if not exists podcast_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users unique not null,
  rss_url text not null,
  provider text default 'unknown' check (provider in ('unknown', 'buzzsprout', 'libsyn', 'anchor', 'podbean', 'spreaker', 'transistor', 'captivate', 'simplecast', 'megaphone', 'acast', 'spotify', 'apple')),
  provider_show_id text,
  status text default 'connected' check (status in ('connected', 'error', 'disconnected')),
  last_rss_sync_at timestamptz,
  last_analytics_sync_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);
comment on table podcast_connections is 'Stores podcast RSS connection info - one show per user';
comment on column podcast_connections.provider is 'Detected or configured hosting provider';
comment on column podcast_connections.provider_show_id is 'Show ID on the hosting provider platform';

-- ============================================================================
-- 2. podcasts (show-level normalized metadata extracted from RSS)
-- ============================================================================
create table if not exists podcasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users unique not null,
  connection_id uuid references podcast_connections(id) on delete cascade,
  title text not null,
  author text,
  description text,
  image_url text,
  language text default 'en',
  categories jsonb default '[]',
  explicit boolean default false,
  website_url text,
  latest_episode_at timestamptz,
  episode_count_total integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);
comment on table podcasts is 'Podcast show metadata extracted from RSS feed';
comment on column podcasts.categories is 'iTunes categories as JSON array';

-- ============================================================================
-- 3. podcast_episodes (episode inventory from RSS feed)
-- ============================================================================
create table if not exists podcast_episodes (
  id uuid default gen_random_uuid() primary key,
  podcast_id uuid references podcasts(id) on delete cascade not null,
  guid text not null,
  title text not null,
  published_at timestamptz,
  duration_sec integer,
  audio_url text,
  description text,
  episode_number integer,
  season_number integer,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique(podcast_id, guid)
);
comment on table podcast_episodes is 'Episode inventory parsed from podcast RSS feed';
comment on column podcast_episodes.guid is 'Unique episode identifier from RSS (used for deduplication)';

-- ============================================================================
-- 4. podcast_metrics_snapshots (30-day metrics snapshots - heart of projections)
-- ============================================================================
create table if not exists podcast_metrics_snapshots (
  id uuid default gen_random_uuid() primary key,
  podcast_id uuid references podcasts(id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  source text default 'manual' check (source in ('manual', 'api', 'csv', 'manual_carry_forward')),

  -- Core metrics
  downloads_30d_total integer,
  avg_downloads_per_episode_30d integer,
  avg_downloads_per_episode_7d integer,
  followers_total integer,
  followers_change_30d integer,
  unique_listeners_30d integer,
  top_countries jsonb default '[]',

  -- Provider-specific raw data
  raw jsonb default '{}',

  created_at timestamptz default timezone('utc'::text, now()) not null
);
comment on table podcast_metrics_snapshots is 'Periodic snapshots of podcast performance metrics';
comment on column podcast_metrics_snapshots.source is 'How metrics were collected: manual, api, csv, or carried forward';
comment on column podcast_metrics_snapshots.raw is 'Raw provider-specific data for debugging/future use';

-- ============================================================================
-- 5. monetization_projections (derived revenue projections)
-- ============================================================================
create table if not exists monetization_projections (
  id uuid default gen_random_uuid() primary key,
  podcast_id uuid references podcasts(id) on delete cascade not null,
  snapshot_id uuid references podcast_metrics_snapshots(id) on delete cascade,

  -- Assumptions used for calculation
  assumptions jsonb not null,

  -- Calculated projections
  sellable_impressions_est integer,
  sponsor_rev_low numeric(10,2),
  sponsor_rev_mid numeric(10,2),
  sponsor_rev_high numeric(10,2),
  affiliate_rev_est numeric(10,2),
  subscription_rev_est numeric(10,2),

  created_at timestamptz default timezone('utc'::text, now()) not null
);
comment on table monetization_projections is 'Revenue projections derived from metrics snapshots';
comment on column monetization_projections.assumptions is 'JSON with fill_rate, ad_slots, cpm values used';

-- ============================================================================
-- INDEXES
-- ============================================================================
create index if not exists podcast_connections_user_id_idx on podcast_connections(user_id);
create index if not exists podcasts_user_id_idx on podcasts(user_id);
create index if not exists podcasts_connection_id_idx on podcasts(connection_id);
create index if not exists podcast_episodes_podcast_id_idx on podcast_episodes(podcast_id);
create index if not exists podcast_episodes_published_at_idx on podcast_episodes(published_at desc);
create index if not exists podcast_metrics_snapshots_podcast_id_idx on podcast_metrics_snapshots(podcast_id);
create index if not exists podcast_metrics_snapshots_period_idx on podcast_metrics_snapshots(period_start desc, period_end desc);
create index if not exists monetization_projections_podcast_id_idx on monetization_projections(podcast_id);
create index if not exists monetization_projections_created_at_idx on monetization_projections(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table podcast_connections enable row level security;
alter table podcasts enable row level security;
alter table podcast_episodes enable row level security;
alter table podcast_metrics_snapshots enable row level security;
alter table monetization_projections enable row level security;

-- RLS Policies: podcast_connections
create policy "Users can view their own podcast connection"
  on podcast_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own podcast connection"
  on podcast_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own podcast connection"
  on podcast_connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own podcast connection"
  on podcast_connections for delete
  using (auth.uid() = user_id);

-- RLS Policies: podcasts
create policy "Users can view their own podcast"
  on podcasts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own podcast"
  on podcasts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own podcast"
  on podcasts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own podcast"
  on podcasts for delete
  using (auth.uid() = user_id);

-- RLS Policies: podcast_episodes (via podcast ownership)
create policy "Users can view episodes of their podcasts"
  on podcast_episodes for select
  using (exists (
    select 1 from podcasts
    where podcasts.id = podcast_episodes.podcast_id
    and podcasts.user_id = auth.uid()
  ));

create policy "Users can insert episodes to their podcasts"
  on podcast_episodes for insert
  with check (exists (
    select 1 from podcasts
    where podcasts.id = podcast_episodes.podcast_id
    and podcasts.user_id = auth.uid()
  ));

create policy "Users can update episodes of their podcasts"
  on podcast_episodes for update
  using (exists (
    select 1 from podcasts
    where podcasts.id = podcast_episodes.podcast_id
    and podcasts.user_id = auth.uid()
  ));

create policy "Users can delete episodes of their podcasts"
  on podcast_episodes for delete
  using (exists (
    select 1 from podcasts
    where podcasts.id = podcast_episodes.podcast_id
    and podcasts.user_id = auth.uid()
  ));

-- RLS Policies: podcast_metrics_snapshots (via podcast ownership)
create policy "Users can view metrics of their podcasts"
  on podcast_metrics_snapshots for select
  using (exists (
    select 1 from podcasts
    where podcasts.id = podcast_metrics_snapshots.podcast_id
    and podcasts.user_id = auth.uid()
  ));

create policy "Users can insert metrics to their podcasts"
  on podcast_metrics_snapshots for insert
  with check (exists (
    select 1 from podcasts
    where podcasts.id = podcast_metrics_snapshots.podcast_id
    and podcasts.user_id = auth.uid()
  ));

-- RLS Policies: monetization_projections (via podcast ownership)
create policy "Users can view projections of their podcasts"
  on monetization_projections for select
  using (exists (
    select 1 from podcasts
    where podcasts.id = monetization_projections.podcast_id
    and podcasts.user_id = auth.uid()
  ));

create policy "Users can insert projections to their podcasts"
  on monetization_projections for insert
  with check (exists (
    select 1 from podcasts
    where podcasts.id = monetization_projections.podcast_id
    and podcasts.user_id = auth.uid()
  ));

-- ============================================================================
-- TRIGGERS (reuse existing update_updated_at_column function)
-- ============================================================================
create trigger update_podcast_connections_updated_at
  before update on podcast_connections
  for each row
  execute function update_updated_at_column();

create trigger update_podcasts_updated_at
  before update on podcasts
  for each row
  execute function update_updated_at_column();

create trigger update_podcast_episodes_updated_at
  before update on podcast_episodes
  for each row
  execute function update_updated_at_column();
