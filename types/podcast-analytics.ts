// Podcast Analytics Types
// Used for podcast connection, metrics tracking, and monetization projections

export type PodcastProvider =
  | 'unknown'
  | 'buzzsprout'
  | 'libsyn'
  | 'anchor'
  | 'podbean'
  | 'spreaker'
  | 'transistor'
  | 'captivate'
  | 'simplecast'
  | 'megaphone'
  | 'acast'
  | 'spotify'
  | 'apple';

export type ConnectionStatus = 'connected' | 'error' | 'disconnected';

export type MetricsSource = 'manual' | 'api' | 'csv' | 'manual_carry_forward';

// ============================================================================
// Database Models (match Supabase schema)
// ============================================================================

export interface PodcastConnection {
  id: string;
  userId: string;
  rssUrl: string;
  provider: PodcastProvider;
  providerShowId?: string;
  status: ConnectionStatus;
  lastRssSyncAt?: string;
  lastAnalyticsSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Podcast {
  id: string;
  userId: string;
  connectionId?: string;
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CountryMetric {
  country: string;
  percentage: number;
}

export interface PodcastMetricsSnapshot {
  id: string;
  podcastId: string;
  periodStart: string;
  periodEnd: string;
  source: MetricsSource;

  // Core metrics
  downloads30dTotal?: number;
  avgDownloadsPerEpisode30d?: number;
  avgDownloadsPerEpisode7d?: number;
  followersTotal?: number;
  followersChange30d?: number;
  uniqueListeners30d?: number;
  topCountries?: CountryMetric[];

  // Raw provider data
  raw?: Record<string, unknown>;

  createdAt: string;
}

export interface ProjectionAssumptions {
  fillRate: number;        // Default 0.35 (35%)
  adSlots: number;         // Default 2 (pre-roll + mid-roll)
  cpmLow: number;          // Default $15
  cpmMid: number;          // Default $25
  cpmHigh: number;         // Default $40
  episodesPerMonth?: number;
}

export interface MonetizationProjection {
  id: string;
  podcastId: string;
  snapshotId?: string;
  assumptions: ProjectionAssumptions;

  // Calculated projections
  sellableImpressionsEst: number;
  sponsorRevLow: number;
  sponsorRevMid: number;
  sponsorRevHigh: number;
  affiliateRevEst?: number;
  subscriptionRevEst?: number;

  createdAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ConnectRssRequest {
  rssUrl: string;
}

export interface ConnectRssResponse {
  connection: PodcastConnection;
  podcast: Podcast;
  episodeCount: number;
  detectedProvider?: PodcastProvider;
}

export interface AnalyticsSourcesResponse {
  detected: PodcastProvider | null;
  supported: PodcastProvider[];
  manualAvailable: boolean;
  currentConnection?: PodcastConnection;
}

export interface ManualMetricsInput {
  downloads30dTotal: number;
  avgDownloadsPerEpisode30d: number; // Required by backend
  followersTotal?: number;
  topCountries?: CountryMetric[];
}

export interface ManualMetricsResponse {
  snapshot: PodcastMetricsSnapshot;
  projection: MonetizationProjection;
}

export interface ProjectionsResponse {
  projection: MonetizationProjection;
  snapshot?: PodcastMetricsSnapshot;
  podcast?: Podcast;
}

export interface PodcastDashboardResponse {
  podcast: Podcast;
  connection: PodcastConnection;
  recentEpisodes: PodcastEpisode[];
  latestMetrics?: PodcastMetricsSnapshot;
  latestProjection?: MonetizationProjection;
  trends?: {
    downloadsChange?: number;      // Percentage change from previous period
    followersChange?: number;
    direction: 'up' | 'down' | 'stable';
  };
}

// ============================================================================
// RSS Parsing Types
// ============================================================================

export interface ParsedRssFeed {
  title: string;
  description?: string;
  link?: string;
  image?: { url: string };
  language?: string;
  author?: string;
  categories?: string[];
  itunes?: {
    author?: string;
    explicit?: string;
    categories?: Array<{ name: string; subcategories?: Array<{ name: string }> }>;
    image?: string;
  };
  items: ParsedRssItem[];
}

export interface ParsedRssItem {
  guid?: string;
  title?: string;
  pubDate?: string;
  enclosure?: { url: string; type?: string; length?: string };
  itunes?: {
    duration?: string;
    episode?: string;
    season?: string;
  };
  content?: string;
  contentSnippet?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export type ConnectPodcastStep = 'rss' | 'analytics' | 'dashboard';

export type AnalyticsSourceOption = 'provider' | 'csv' | 'manual';

export interface ConnectPodcastState {
  step: ConnectPodcastStep;
  rssUrl: string;
  isLoading: boolean;
  error?: string;
  connection?: PodcastConnection;
  podcast?: Podcast;
  selectedAnalyticsSource?: AnalyticsSourceOption;
}
