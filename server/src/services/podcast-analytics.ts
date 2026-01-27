/**
 * Podcast Analytics Service
 * Handles metrics computation and monetization projections
 */

export interface MetricsSnapshot {
  periodStart: Date;
  periodEnd: Date;
  source: 'manual' | 'api' | 'csv' | 'manual_carry_forward';
  downloads30dTotal: number;
  avgDownloadsPerEpisode30d: number;
  avgDownloadsPerEpisode7d?: number;
  followersTotal?: number;
  followersChange30d?: number;
  uniqueListeners30d?: number;
  topCountries?: Array<{ country: string; percentage: number }>;
  raw?: Record<string, unknown>;
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
  assumptions: ProjectionAssumptions;
  sellableImpressionsEst: number;
  sponsorRevLow: number;
  sponsorRevMid: number;
  sponsorRevHigh: number;
  monthlyRevLow?: number;
  monthlyRevMid?: number;
  monthlyRevHigh?: number;
}

export interface DailyDownload {
  date: Date;
  downloads: number;
  episodeGuid?: string;
}

/**
 * Default projection assumptions based on podcast size
 */
export function getDefaultAssumptions(avgDownloads?: number): ProjectionAssumptions {
  // Adjust fill rate based on podcast size
  // Smaller shows have lower fill rates (harder to sell inventory)
  let fillRate = 0.35;
  if (avgDownloads && avgDownloads >= 10000) {
    fillRate = 0.60; // Mature shows with consistent audience
  } else if (avgDownloads && avgDownloads >= 5000) {
    fillRate = 0.45; // Growing shows
  }

  return {
    fillRate,
    adSlots: 2,       // Pre-roll + mid-roll
    cpmLow: 15,       // Conservative CPM
    cpmMid: 25,       // Average CPM for general podcasts
    cpmHigh: 40,      // Premium CPM (niche/engaged audience)
    episodesPerMonth: 4,
  };
}

/**
 * Compute metrics from daily download data (API source)
 */
export function computeMetricsFromDaily(
  dailyDownloads: DailyDownload[],
  episodesPublished: number
): MetricsSnapshot {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter to last 30 days
  const last30Days = dailyDownloads.filter((d) => d.date >= thirtyDaysAgo);
  const last7Days = dailyDownloads.filter((d) => d.date >= sevenDaysAgo);

  // Sum downloads
  const downloads30dTotal = last30Days.reduce((sum, d) => sum + d.downloads, 0);
  const downloads7dTotal = last7Days.reduce((sum, d) => sum + d.downloads, 0);

  // Compute averages
  const effectiveEpisodes = Math.max(1, episodesPublished);
  const avgDownloadsPerEpisode30d = Math.round(downloads30dTotal / effectiveEpisodes);

  // For 7-day, estimate based on proportion
  const episodes7d = Math.max(1, Math.ceil(episodesPublished / 4)); // ~1/4 of monthly episodes
  const avgDownloadsPerEpisode7d = Math.round(downloads7dTotal / episodes7d);

  return {
    periodStart: thirtyDaysAgo,
    periodEnd: now,
    source: 'api',
    downloads30dTotal,
    avgDownloadsPerEpisode30d,
    avgDownloadsPerEpisode7d,
  };
}

/**
 * Compute metrics from manual input
 * Both downloads30dTotal and avgDownloadsPerEpisode30d are REQUIRED per DB schema
 */
export function computeMetricsFromManual(input: {
  downloads30dTotal: number;
  avgDownloadsPerEpisode30d: number;  // Required
  followersTotal?: number;
  topCountries?: Array<{ country: string; percentage: number }>;
}): MetricsSnapshot {
  // Snapshot dates: period_end = today, period_start = today - 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    periodStart: thirtyDaysAgo,
    periodEnd: now,
    source: 'manual',
    downloads30dTotal: input.downloads30dTotal,
    avgDownloadsPerEpisode30d: input.avgDownloadsPerEpisode30d,
    followersTotal: input.followersTotal,
    topCountries: input.topCountries,
  };
}

/**
 * Compute monetization projections from metrics snapshot
 */
export function computeProjections(
  snapshot: MetricsSnapshot,
  customAssumptions?: Partial<ProjectionAssumptions>
): MonetizationProjection {
  // Merge with defaults
  const defaults = getDefaultAssumptions(snapshot.avgDownloadsPerEpisode30d);
  const assumptions: ProjectionAssumptions = {
    ...defaults,
    ...customAssumptions,
  };

  // Core calculation:
  // sellable_impressions = avg_downloads × ad_slots × fill_rate
  const sellableImpressionsEst = Math.round(
    snapshot.avgDownloadsPerEpisode30d * assumptions.adSlots * assumptions.fillRate
  );

  // Revenue per episode = (impressions / 1000) × CPM
  const sponsorRevLow = (sellableImpressionsEst / 1000) * assumptions.cpmLow;
  const sponsorRevMid = (sellableImpressionsEst / 1000) * assumptions.cpmMid;
  const sponsorRevHigh = (sellableImpressionsEst / 1000) * assumptions.cpmHigh;

  // Monthly projections (if episodes per month known)
  const episodesPerMonth = assumptions.episodesPerMonth || 4;
  const monthlyRevLow = sponsorRevLow * episodesPerMonth;
  const monthlyRevMid = sponsorRevMid * episodesPerMonth;
  const monthlyRevHigh = sponsorRevHigh * episodesPerMonth;

  return {
    assumptions,
    sellableImpressionsEst,
    sponsorRevLow: Math.round(sponsorRevLow * 100) / 100,
    sponsorRevMid: Math.round(sponsorRevMid * 100) / 100,
    sponsorRevHigh: Math.round(sponsorRevHigh * 100) / 100,
    monthlyRevLow: Math.round(monthlyRevLow * 100) / 100,
    monthlyRevMid: Math.round(monthlyRevMid * 100) / 100,
    monthlyRevHigh: Math.round(monthlyRevHigh * 100) / 100,
  };
}

/**
 * Calculate trend direction from two snapshots
 */
export function calculateTrend(
  current: MetricsSnapshot,
  previous?: MetricsSnapshot
): { direction: 'up' | 'down' | 'stable'; percentChange?: number } {
  if (!previous || !previous.downloads30dTotal) {
    return { direction: 'stable' };
  }

  const change = current.downloads30dTotal - previous.downloads30dTotal;
  const percentChange = Math.round((change / previous.downloads30dTotal) * 100);

  if (percentChange > 5) {
    return { direction: 'up', percentChange };
  } else if (percentChange < -5) {
    return { direction: 'down', percentChange };
  }

  return { direction: 'stable', percentChange };
}

/**
 * Estimate publishing cadence from episodes
 */
export function estimateCadence(
  episodes: Array<{ publishedAt?: Date | string }>
): { cadence: string; episodesPerMonth: number } {
  if (episodes.length < 2) {
    return { cadence: 'Unknown', episodesPerMonth: 1 };
  }

  // Get dates and sort
  const dates = episodes
    .filter((e) => e.publishedAt)
    .map((e) => new Date(e.publishedAt!))
    .sort((a, b) => b.getTime() - a.getTime())
    .slice(0, 20); // Use last 20 episodes

  if (dates.length < 2) {
    return { cadence: 'Unknown', episodesPerMonth: 1 };
  }

  // Calculate average days between episodes
  let totalDays = 0;
  for (let i = 0; i < dates.length - 1; i++) {
    const diff = dates[i].getTime() - dates[i + 1].getTime();
    totalDays += diff / (1000 * 60 * 60 * 24);
  }
  const avgDaysBetween = totalDays / (dates.length - 1);

  // Determine cadence label
  let cadence: string;
  let episodesPerMonth: number;

  if (avgDaysBetween <= 1.5) {
    cadence = 'Daily';
    episodesPerMonth = 30;
  } else if (avgDaysBetween <= 4) {
    cadence = 'Multiple per week';
    episodesPerMonth = Math.round(30 / avgDaysBetween);
  } else if (avgDaysBetween <= 8) {
    cadence = 'Weekly';
    episodesPerMonth = 4;
  } else if (avgDaysBetween <= 16) {
    cadence = 'Bi-weekly';
    episodesPerMonth = 2;
  } else if (avgDaysBetween <= 35) {
    cadence = 'Monthly';
    episodesPerMonth = 1;
  } else {
    cadence = 'Irregular';
    episodesPerMonth = Math.max(1, Math.round(30 / avgDaysBetween));
  }

  return { cadence, episodesPerMonth };
}
