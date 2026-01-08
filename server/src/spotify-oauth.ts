// ============================================================================
// SPOTIFY FOR PODCASTERS OAUTH: Get real download data
// ============================================================================

import crypto from 'crypto';

interface SpotifyOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

interface SpotifyPodcastAnalytics {
  showId: string;
  showName: string;
  totalStreams: number;
  totalFollowers: number;

  // Episode performance
  episodes: {
    id: string;
    name: string;
    releaseDate: string;
    streams: number;
    starts: number;
    completions: number;
    averageListenTime: number; // seconds
    completionRate: number; // percentage
  }[];

  // Audience demographics
  demographics?: {
    topCountries: { country: string; percentage: number }[];
    topCities: { city: string; percentage: number }[];
    ageRanges?: { range: string; percentage: number }[];
    gender?: { male: number; female: number; other: number };
  };

  // Time range data
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Generate authorization URL for Spotify OAuth
 * User visits this URL to grant access to their podcast analytics
 */
export function getSpotifyAuthUrl(config: SpotifyOAuthConfig, state?: string): string {
  const scopes = [
    'user-read-email',
    'user-read-private',
    // Note: Spotify for Podcasters API uses different scopes than regular Spotify API
    // These would be the actual scopes when Spotify releases the Podcasters API
    // For now, this is a placeholder structure
  ].join(' ');

  const authState = state || crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: scopes,
    state: authState,
    show_dialog: 'true' // Force user to approve
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeSpotifyCode(
  config: SpotifyOAuthConfig,
  code: string
): Promise<SpotifyTokens> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify token exchange failed: ${error}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope
  };
}

/**
 * Refresh expired access token
 */
export async function refreshSpotifyToken(
  config: SpotifyOAuthConfig,
  refreshToken: string
): Promise<SpotifyTokens> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify token refresh failed: ${error}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Refresh token might not change
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope
  };
}

/**
 * Fetch podcast analytics from Spotify for Podcasters
 *
 * NOTE: As of 2025, Spotify for Podcasters API is not publicly available.
 * This is a mock implementation showing the expected structure.
 *
 * When Spotify releases their API:
 * 1. Update the endpoint URL
 * 2. Update the request headers/parameters based on their docs
 * 3. Map their response format to our SpotifyPodcastAnalytics structure
 */
export async function getSpotifyPodcastAnalytics(
  accessToken: string,
  showId: string,
  dateRange?: { start: string; end: string }
): Promise<SpotifyPodcastAnalytics> {
  // PLACEHOLDER: This endpoint doesn't exist yet
  // const endpoint = `https://api.spotify.com/v1/podcasters/shows/${showId}/analytics`;

  // When the API is available, the request would look like:
  /*
  const params = new URLSearchParams({
    start_date: dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: dateRange?.end || new Date().toISOString()
  });

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify Analytics API failed: ${response.status}`);
  }

  const data = await response.json();

  // Map Spotify's response to our structure
  return {
    showId: data.show_id,
    showName: data.show_name,
    totalStreams: data.total_streams,
    totalFollowers: data.total_followers,
    episodes: data.episodes.map((ep: any) => ({
      id: ep.id,
      name: ep.name,
      releaseDate: ep.release_date,
      streams: ep.streams,
      starts: ep.starts,
      completions: ep.completions,
      averageListenTime: ep.average_listen_time,
      completionRate: (ep.completions / ep.starts) * 100
    })),
    demographics: data.demographics,
    dateRange: {
      start: dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: dateRange?.end || new Date().toISOString()
    }
  };
  */

  // For now, throw an error indicating the API isn't available
  throw new Error('Spotify for Podcasters API is not yet publicly available. Use manual input or wait for API release.');
}

/**
 * Extract verified metrics from Spotify analytics
 * These are VERIFIED metrics that replace estimates
 */
export function extractVerifiedMetrics(analytics: SpotifyPodcastAnalytics): {
  downloadsPerEpisode: number;
  downloadsPerEpisodeLast30Days: number;
  completionRate: number;
  averageListenTime: number;
  subscriberCount: number;
  totalDownloads: number;
  episodesPerMonth: number;
  monthlyGrowthRate: number;
} {
  // Calculate average downloads from recent episodes
  const recentEpisodes = analytics.episodes
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 10);

  const avgDownloads = recentEpisodes.reduce((sum, ep) => sum + ep.streams, 0) / recentEpisodes.length;

  // Last 30 days episodes
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const last30DaysEpisodes = analytics.episodes.filter(ep =>
    new Date(ep.releaseDate).getTime() > thirtyDaysAgo
  );
  const avgLast30Days = last30DaysEpisodes.length > 0
    ? last30DaysEpisodes.reduce((sum, ep) => sum + ep.streams, 0) / last30DaysEpisodes.length
    : avgDownloads;

  // Calculate completion rate
  const totalStarts = analytics.episodes.reduce((sum, ep) => sum + ep.starts, 0);
  const totalCompletions = analytics.episodes.reduce((sum, ep) => sum + ep.completions, 0);
  const completionRate = totalStarts > 0 ? (totalCompletions / totalStarts) * 100 : 0;

  // Average listen time
  const avgListenTime = analytics.episodes.reduce((sum, ep) => sum + ep.averageListenTime, 0) / analytics.episodes.length;

  // Calculate monthly growth rate
  const sortedEpisodes = [...analytics.episodes].sort((a, b) =>
    new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  );

  let monthlyGrowthRate = 0;
  if (sortedEpisodes.length >= 2) {
    const oldestStreams = sortedEpisodes.slice(0, 3).reduce((sum, ep) => sum + ep.streams, 0) / 3;
    const newestStreams = sortedEpisodes.slice(-3).reduce((sum, ep) => sum + ep.streams, 0) / 3;
    const monthsSpan = (new Date(sortedEpisodes[sortedEpisodes.length - 1].releaseDate).getTime() -
                        new Date(sortedEpisodes[0].releaseDate).getTime()) / (30 * 24 * 60 * 60 * 1000);

    if (monthsSpan > 0 && oldestStreams > 0) {
      monthlyGrowthRate = ((newestStreams / oldestStreams - 1) / monthsSpan) * 100;
    }
  }

  // Episodes per month
  const dateRange = new Date(analytics.dateRange.end).getTime() - new Date(analytics.dateRange.start).getTime();
  const months = dateRange / (30 * 24 * 60 * 60 * 1000);
  const episodesPerMonth = months > 0 ? analytics.episodes.length / months : 0;

  return {
    downloadsPerEpisode: Math.round(avgDownloads),
    downloadsPerEpisodeLast30Days: Math.round(avgLast30Days),
    completionRate: Math.round(completionRate * 10) / 10,
    averageListenTime: Math.round(avgListenTime),
    subscriberCount: analytics.totalFollowers,
    totalDownloads: analytics.totalStreams,
    episodesPerMonth: Math.round(episodesPerMonth * 10) / 10,
    monthlyGrowthRate: Math.round(monthlyGrowthRate * 10) / 10
  };
}

/**
 * Store user's Spotify tokens securely
 * In production, this should be stored in a database with encryption
 */
export interface StoredSpotifyConnection {
  userId: string;
  showId: string;
  tokens: SpotifyTokens;
  connectedAt: number;
  lastSyncedAt?: number;
}

// This would be replaced with actual database storage
const tokenStore = new Map<string, StoredSpotifyConnection>();

export function storeSpotifyConnection(connection: StoredSpotifyConnection): void {
  tokenStore.set(connection.userId, connection);
}

export function getSpotifyConnection(userId: string): StoredSpotifyConnection | null {
  return tokenStore.get(userId) || null;
}

export function removeSpotifyConnection(userId: string): void {
  tokenStore.delete(userId);
}
