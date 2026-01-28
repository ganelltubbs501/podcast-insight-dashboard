/**
 * Podcast Analytics Service
 * Frontend API client for podcast connection, metrics, and projections
 */

import { supabase } from "../lib/supabaseClient";
import type {
  ConnectRssResponse,
  AnalyticsSourcesResponse,
  ManualMetricsInput,
  ManualMetricsResponse,
  ProjectionsResponse,
  PodcastDashboardResponse,
  ProjectionAssumptions,
} from "../types/podcast-analytics";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

function requireApi() {
  if (!API_BASE) throw new Error("VITE_API_BASE_URL is not configured");
}

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Get auth headers for API requests
 */
async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Generic GET request helper
 */
async function getJSON<T>(path: string): Promise<T> {
  requireApi();
  const headers = await getHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error("Authentication required. Please log in again.");
    }
    throw new Error(data.error || `API ${res.status}: Request failed`);
  }
  return (await res.json()) as T;
}

/**
 * Generic POST request helper
 */
async function postJSON<T>(path: string, body: unknown): Promise<T> {
  requireApi();
  const headers = await getHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error("Authentication required. Please log in again.");
    }
    throw new Error(data.error || `API ${res.status}: Request failed`);
  }
  return (await res.json()) as T;
}

// ============================================================================
// PODCAST CONNECTION
// ============================================================================

/**
 * Connect a podcast via RSS feed URL
 * @param rssUrl - The podcast RSS feed URL
 */
export async function connectPodcastRss(rssUrl: string): Promise<ConnectRssResponse> {
  return postJSON<ConnectRssResponse>("/api/podcast/connect-rss", { rssUrl });
}

/**
 * Response from resync RSS endpoint
 */
export interface ResyncRssResponse {
  success: boolean;
  episodeCountTotal: number;
  newEpisodeCount: number;
  lastSyncAt: string;
}

/**
 * Resync podcast RSS feed to fetch new episodes
 * Has a 5-minute cooldown between syncs
 */
export async function resyncPodcastRss(): Promise<ResyncRssResponse> {
  return postJSON<ResyncRssResponse>("/api/podcast/resync-rss", {});
}

/**
 * Response from disconnect endpoint
 */
export interface DisconnectPodcastResponse {
  success: boolean;
  message: string;
  podcastTitle: string;
}

/**
 * Disconnect the podcast and remove all related data
 */
export async function disconnectPodcast(): Promise<DisconnectPodcastResponse> {
  requireApi();
  const headers = await getHeaders();

  const res = await fetch(`${API_BASE}/api/podcast/disconnect`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error("Authentication required. Please log in again.");
    }
    if (res.status === 404) {
      throw new Error("No podcast connected");
    }
    throw new Error(data.error || `API ${res.status}: Request failed`);
  }
  return (await res.json()) as DisconnectPodcastResponse;
}

/**
 * Get available analytics sources for the user's podcast
 */
export async function getAnalyticsSources(): Promise<AnalyticsSourcesResponse> {
  return getJSON<AnalyticsSourcesResponse>("/api/podcast/analytics/sources");
}

// ============================================================================
// METRICS
// ============================================================================

/**
 * Submit manual metrics for the podcast
 * @param metrics - Manual metrics input (downloads, followers, etc.)
 */
export async function submitManualMetrics(
  metrics: ManualMetricsInput
): Promise<ManualMetricsResponse> {
  return postJSON<ManualMetricsResponse>("/api/podcast/analytics/manual", metrics);
}

// ============================================================================
// PROJECTIONS
// ============================================================================

/**
 * Get the latest monetization projections
 */
export async function getLatestProjections(): Promise<ProjectionsResponse> {
  return getJSON<ProjectionsResponse>("/api/podcast/projections/latest");
}

/**
 * Recompute projections with new assumptions
 * @param assumptions - New projection assumptions (fill rate, CPM, etc.)
 */
export async function recomputeProjections(
  assumptions: Partial<ProjectionAssumptions>
): Promise<{ projection: ProjectionsResponse["projection"] }> {
  return postJSON("/api/podcast/projections/recompute", assumptions);
}

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * Get complete podcast dashboard data
 * Includes connection, podcast info, recent episodes, metrics, and projections
 */
export async function getPodcastDashboard(): Promise<PodcastDashboardResponse> {
  return getJSON<PodcastDashboardResponse>("/api/podcast/dashboard");
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if user has a connected podcast
 */
export async function hasPodcastConnected(): Promise<boolean> {
  try {
    const sources = await getAnalyticsSources();
    return !!sources.currentConnection;
  } catch {
    return false;
  }
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "—";
  return num.toLocaleString();
}

/**
 * Format currency
 */
export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to relative time or formatted date
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default {
  connectPodcastRss,
  resyncPodcastRss,
  getAnalyticsSources,
  submitManualMetrics,
  getLatestProjections,
  recomputeProjections,
  getPodcastDashboard,
  hasPodcastConnected,
  formatDuration,
  formatNumber,
  formatCurrency,
  formatDate,
};
