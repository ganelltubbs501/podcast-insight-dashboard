# Podcast Analytics & Monetization System - Implementation Plan

## Overview

This plan implements a comprehensive "Connect Podcast" feature with RSS parsing, analytics integration, and monetization projections.

---

## Phase 1: Database Schema (Migration 009)

### File: `supabase/migrations/009_podcast_analytics.sql`

Create 5 new tables following existing patterns (snake_case, RLS, user_id FK):

```sql
-- 1. podcast_connections (one row per user)
create table if not exists podcast_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users unique not null,  -- UNIQUE: one show per user
  rss_url text not null,
  provider text default 'unknown' check (provider in ('unknown', 'buzzsprout', 'libsyn', 'anchor', 'podbean', 'spreaker', 'transistor', 'captivate', 'simplecast', 'megaphone', 'acast')),
  provider_show_id text,
  status text default 'connected' check (status in ('connected', 'error', 'disconnected')),
  last_rss_sync_at timestamptz,
  last_analytics_sync_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. podcasts (show-level metadata)
create table if not exists podcasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users unique not null,  -- UNIQUE: one show per user
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

-- 3. podcast_episodes (episode inventory from RSS)
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
  unique(podcast_id, guid)  -- Prevent duplicate episodes per podcast
);

-- 4. podcast_metrics_snapshots (heart of projections + trends)
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

  -- Provider-specific extras
  raw jsonb default '{}',

  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. monetization_projections (derived outputs)
create table if not exists monetization_projections (
  id uuid default gen_random_uuid() primary key,
  podcast_id uuid references podcasts(id) on delete cascade not null,
  snapshot_id uuid references podcast_metrics_snapshots(id) on delete cascade,

  -- Assumptions used
  assumptions jsonb not null,  -- { fill_rate, ad_slots, cpm_low, cpm_mid, cpm_high }

  -- Calculated projections
  sellable_impressions_est integer,
  sponsor_rev_low numeric(10,2),
  sponsor_rev_mid numeric(10,2),
  sponsor_rev_high numeric(10,2),
  affiliate_rev_est numeric(10,2),
  subscription_rev_est numeric(10,2),

  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists podcast_connections_user_id_idx on podcast_connections(user_id);
create index if not exists podcasts_user_id_idx on podcasts(user_id);
create index if not exists podcast_episodes_podcast_id_idx on podcast_episodes(podcast_id);
create index if not exists podcast_episodes_published_at_idx on podcast_episodes(published_at);
create index if not exists podcast_metrics_snapshots_podcast_id_idx on podcast_metrics_snapshots(podcast_id);
create index if not exists podcast_metrics_snapshots_period_idx on podcast_metrics_snapshots(period_start, period_end);
create index if not exists monetization_projections_podcast_id_idx on monetization_projections(podcast_id);

-- Enable RLS on all tables
alter table podcast_connections enable row level security;
alter table podcasts enable row level security;
alter table podcast_episodes enable row level security;
alter table podcast_metrics_snapshots enable row level security;
alter table monetization_projections enable row level security;

-- RLS Policies: podcast_connections
create policy "Users can view their own podcast connection"
  on podcast_connections for select using (auth.uid() = user_id);
create policy "Users can insert their own podcast connection"
  on podcast_connections for insert with check (auth.uid() = user_id);
create policy "Users can update their own podcast connection"
  on podcast_connections for update using (auth.uid() = user_id);
create policy "Users can delete their own podcast connection"
  on podcast_connections for delete using (auth.uid() = user_id);

-- RLS Policies: podcasts
create policy "Users can view their own podcast"
  on podcasts for select using (auth.uid() = user_id);
create policy "Users can insert their own podcast"
  on podcasts for insert with check (auth.uid() = user_id);
create policy "Users can update their own podcast"
  on podcasts for update using (auth.uid() = user_id);
create policy "Users can delete their own podcast"
  on podcasts for delete using (auth.uid() = user_id);

-- RLS Policies: podcast_episodes (via podcast ownership)
create policy "Users can view episodes of their podcasts"
  on podcast_episodes for select
  using (exists (select 1 from podcasts where podcasts.id = podcast_episodes.podcast_id and podcasts.user_id = auth.uid()));
create policy "Users can insert episodes to their podcasts"
  on podcast_episodes for insert
  with check (exists (select 1 from podcasts where podcasts.id = podcast_episodes.podcast_id and podcasts.user_id = auth.uid()));
create policy "Users can update episodes of their podcasts"
  on podcast_episodes for update
  using (exists (select 1 from podcasts where podcasts.id = podcast_episodes.podcast_id and podcasts.user_id = auth.uid()));
create policy "Users can delete episodes of their podcasts"
  on podcast_episodes for delete
  using (exists (select 1 from podcasts where podcasts.id = podcast_episodes.podcast_id and podcasts.user_id = auth.uid()));

-- RLS Policies: podcast_metrics_snapshots (via podcast ownership)
create policy "Users can view metrics of their podcasts"
  on podcast_metrics_snapshots for select
  using (exists (select 1 from podcasts where podcasts.id = podcast_metrics_snapshots.podcast_id and podcasts.user_id = auth.uid()));
create policy "Users can insert metrics to their podcasts"
  on podcast_metrics_snapshots for insert
  with check (exists (select 1 from podcasts where podcasts.id = podcast_metrics_snapshots.podcast_id and podcasts.user_id = auth.uid()));

-- RLS Policies: monetization_projections (via podcast ownership)
create policy "Users can view projections of their podcasts"
  on monetization_projections for select
  using (exists (select 1 from podcasts where podcasts.id = monetization_projections.podcast_id and podcasts.user_id = auth.uid()));
create policy "Users can insert projections to their podcasts"
  on monetization_projections for insert
  with check (exists (select 1 from podcasts where podcasts.id = monetization_projections.podcast_id and podcasts.user_id = auth.uid()));

-- Updated_at triggers
create trigger update_podcast_connections_updated_at
  before update on podcast_connections
  for each row execute function update_updated_at_column();

create trigger update_podcasts_updated_at
  before update on podcasts
  for each row execute function update_updated_at_column();

create trigger update_podcast_episodes_updated_at
  before update on podcast_episodes
  for each row execute function update_updated_at_column();
```

---

## Phase 2: Backend Services

### 2.1 RSS Parser Service
**File: `server/src/services/rss-parser.ts`**

```typescript
// Use rss-parser npm package
// Functions:
// - fetchAndParseRSS(url: string): Promise<ParsedFeed>
// - validatePodcastFeed(feed): boolean (check for itunes tags, enclosures)
// - extractShowMetadata(feed): PodcastMetadata
// - extractEpisodes(feed): Episode[]
// - detectProvider(feedUrl: string): Provider (pattern match for buzzsprout, libsyn, etc.)
```

### 2.2 Podcast Analytics Service
**File: `server/src/services/podcast-analytics.ts`**

```typescript
// Functions:
// - computeMetricsFromDaily(dailyDownloads[]): MetricsSnapshot
// - computeMetricsFromManual(input): MetricsSnapshot
// - computeProjections(snapshot, assumptions): MonetizationProjection
// - getDefaultAssumptions(podcastSize): Assumptions
```

### 2.3 Provider Connectors Interface
**File: `server/src/services/connectors/index.ts`**

```typescript
// Interface all connectors implement:
interface PodcastConnector {
  detectProvider(rssUrl: string): boolean;
  getAuthUrl?(state: string): string;
  exchangeCode?(code: string): Promise<Tokens>;
  getMetrics(credentials: any, showId: string, start: Date, end: Date): Promise<NormalizedMetrics>;
}

// Initial implementation: Manual-only (MVP)
// Future: BuzzsproutConnector, LibsynConnector, etc.
```

---

## Phase 3: Backend API Endpoints

### File: `server/src/index.ts` (add to existing)

Add these endpoints under `/api/podcast/*`:

```typescript
// ============================================================================
// PODCAST ANALYTICS ENDPOINTS
// ============================================================================

// 1. POST /api/podcast/connect-rss
// - Fetch RSS, validate, upsert show + episodes
// - Body: { rssUrl: string }
// - Returns: { connection, podcast, episodeCount }

// 2. POST /api/podcast/sync-rss
// - Internal: refresh episodes (called by scheduler)
// - Body: { podcastId: string }

// 3. GET /api/podcast/analytics/sources
// - Returns supported providers + whether detected for user's RSS
// - Returns: { detected: 'buzzsprout' | null, supported: string[], manualAvailable: true }

// 4. POST /api/podcast/analytics/manual
// - Create metrics snapshot from manual input
// - Body: { downloads30dTotal, avgDownloadsPerEpisode30d, followers?, topCountries? }
// - Returns: { snapshot, projection }

// 5. POST /api/podcast/analytics/connect-provider
// - Initiate provider OAuth handshake
// - Body: { provider: string }
// - Returns: { authUrl } or handles inline for API-key providers

// 6. GET /api/podcast/projections/latest
// - Returns latest projection for user's podcast
// - Returns: { projection, snapshot, podcast }

// 7. POST /api/podcast/projections/recompute
// - Recalculate projections with new assumptions
// - Body: { assumptions: { fillRate, adSlots, cpmLow, cpmMid, cpmHigh } }
// - Returns: { projection }

// 8. GET /api/podcast/dashboard
// - Returns complete dashboard data (podcast, episodes, latest metrics, projection)
// - Returns: { podcast, recentEpisodes[], metrics, projection, trends? }
```

---

## Phase 4: Zod Validation Schemas

### File: `server/src/validation/schemas.ts` (add to existing)

```typescript
// Add these schemas:
export const connectRssSchema = z.object({
  rssUrl: z.string().url()
});

export const manualMetricsSchema = z.object({
  downloads30dTotal: z.number().int().min(0),
  avgDownloadsPerEpisode30d: z.number().int().min(0).optional(),
  episodesPublishedLast30d: z.number().int().min(0).optional(),
  followersTotal: z.number().int().min(0).optional(),
  topCountries: z.array(z.object({
    country: z.string(),
    percentage: z.number()
  })).optional()
});

export const projectionsAssumptionsSchema = z.object({
  fillRate: z.number().min(0).max(1).default(0.35),
  adSlots: z.number().int().min(1).max(6).default(2),
  cpmLow: z.number().min(0).default(15),
  cpmMid: z.number().min(0).default(25),
  cpmHigh: z.number().min(0).default(40)
});
```

---

## Phase 5: TypeScript Types

### File: `types/podcast-analytics.ts` (new file)

```typescript
export interface PodcastConnection {
  id: string;
  userId: string;
  rssUrl: string;
  provider: 'unknown' | 'buzzsprout' | 'libsyn' | 'anchor' | ...;
  providerShowId?: string;
  status: 'connected' | 'error' | 'disconnected';
  lastRssSyncAt?: string;
  lastAnalyticsSyncAt?: string;
}

export interface Podcast {
  id: string;
  userId: string;
  connectionId: string;
  title: string;
  author?: string;
  description?: string;
  imageUrl?: string;
  language: string;
  categories: string[];
  explicit: boolean;
  websiteUrl?: string;
  latestEpisodeAt?: string;
  episodeCountTotal: number;
}

export interface PodcastEpisode {
  id: string;
  podcastId: string;
  guid: string;
  title: string;
  publishedAt?: string;
  durationSec?: number;
  audioUrl?: string;
  description?: string;
  episodeNumber?: number;
  seasonNumber?: number;
}

export interface PodcastMetricsSnapshot {
  id: string;
  podcastId: string;
  periodStart: string;
  periodEnd: string;
  source: 'manual' | 'api' | 'csv' | 'manual_carry_forward';
  downloads30dTotal?: number;
  avgDownloadsPerEpisode30d?: number;
  avgDownloadsPerEpisode7d?: number;
  followersTotal?: number;
  followersChange30d?: number;
  uniqueListeners30d?: number;
  topCountries?: { country: string; percentage: number }[];
  raw?: Record<string, any>;
}

export interface MonetizationProjection {
  id: string;
  podcastId: string;
  snapshotId?: string;
  assumptions: ProjectionAssumptions;
  sellableImpressionsEst: number;
  sponsorRevLow: number;
  sponsorRevMid: number;
  sponsorRevHigh: number;
  affiliateRevEst?: number;
  subscriptionRevEst?: number;
}

export interface ProjectionAssumptions {
  fillRate: number;      // 0.35 default
  adSlots: number;       // 2 default (pre + mid)
  cpmLow: number;        // $15
  cpmMid: number;        // $25
  cpmHigh: number;       // $40
  episodesPerMonth?: number;
}
```

---

## Phase 6: Frontend Components

### 6.1 Connect Podcast Page
**File: `pages/ConnectPodcast.tsx`**

Three-step wizard:
1. **Step A - RSS Input**: Text field for RSS URL, "Connect" button
2. **Step B - Analytics Source**: Three tiles (Provider API, Upload CSV, Manual Entry)
3. **Step C - Dashboard Preview**: Show what data is available

### 6.2 Podcast Analytics Dashboard
**File: `pages/PodcastAnalytics.tsx`**

Display:
- Show artwork + title + episode count
- Publishing cadence visualization
- Latest metrics (downloads, followers)
- Revenue projections (low/mid/high bands)
- Episode inventory table
- "Update Metrics" button (opens manual entry modal)

### 6.3 Manual Metrics Modal
**File: `components/ManualMetricsModal.tsx`**

Form fields:
- Total downloads (last 30 days)
- Episodes published (last 30 days) - to compute average
- Followers (optional)
- Top countries (optional)

### 6.4 Revenue Projections Card
**File: `components/RevenueProjectionsCard.tsx`**

Display:
- Three revenue bands (low/mid/high) as gauges
- Assumptions editor (fill rate, ad slots, CPM)
- "Recalculate" button
- Per-episode vs monthly toggle

---

## Phase 7: Frontend Services

### File: `services/podcast.ts` (new file)

```typescript
// API calls to backend:
export async function connectRss(rssUrl: string): Promise<ConnectRssResponse>
export async function getAnalyticsSources(): Promise<SourcesResponse>
export async function submitManualMetrics(metrics: ManualMetricsInput): Promise<MetricsResponse>
export async function getLatestProjections(): Promise<ProjectionsResponse>
export async function recomputeProjections(assumptions: Assumptions): Promise<ProjectionsResponse>
export async function getPodcastDashboard(): Promise<DashboardResponse>
```

---

## Phase 8: Routing Updates

### File: `App.tsx` (update existing)

Add routes:
```typescript
<Route path="/connect-podcast" element={<ConnectPodcast />} />
<Route path="/podcast-analytics" element={<PodcastAnalytics />} />
```

Update navigation to include "Connect Podcast" link.

---

## Implementation Order

1. **Database migration** (009_podcast_analytics.sql) - Run in Supabase
2. **TypeScript types** (types/podcast-analytics.ts)
3. **Zod schemas** (add to validation/schemas.ts)
4. **RSS parser service** (server/src/services/rss-parser.ts)
5. **Analytics service** (server/src/services/podcast-analytics.ts)
6. **Backend endpoints** (add to server/src/index.ts)
7. **Frontend service** (services/podcast.ts)
8. **Connect Podcast page** (pages/ConnectPodcast.tsx)
9. **Manual Metrics modal** (components/ManualMetricsModal.tsx)
10. **Podcast Analytics dashboard** (pages/PodcastAnalytics.tsx)
11. **Revenue Projections card** (components/RevenueProjectionsCard.tsx)
12. **Route updates** (App.tsx)

---

## Dependencies to Install

**Backend (server/):**
```bash
npm install rss-parser
```

**No new frontend dependencies needed** - uses existing React, Tailwind, Lucide icons.

---

## MVP Scope (First Release)

For initial release, focus on:
- ✅ RSS connection + show/episode extraction
- ✅ Manual metrics entry
- ✅ Basic monetization projections
- ⏳ Provider API connectors (future)
- ⏳ CSV upload (future)
- ⏳ Weekly snapshot automation (future)

---

## Notes

- **One podcast per user**: Enforced by UNIQUE constraint on user_id
- **Projections are stateless**: Can always be recomputed from latest snapshot
- **RLS security**: All tables protected by user_id policies
- **Existing patterns followed**: Same structure as transcripts, scheduled_posts tables
