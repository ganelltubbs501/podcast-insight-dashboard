import { enrichForSponsorship } from './enrichment.js';
import { calculateReadinessScore, calculateStrategyReadiness } from './readiness.js';

// ============================================================================
// MONETIZATION INPUT PROCESSOR: Convert user input to confidence-weighted data
// ============================================================================

interface MonetizationInput {
  hasAnalyticsAccess: boolean;
  platform?: string;
  metrics?: any;
  monetizationMethods?: string[];
  currentMonthlyRevenue?: number;
  revenueGoal?: number;
  timeline?: string;
}

interface DataConfidence {
  field: string;
  label: string;
  confidence: 'verified' | 'estimated' | 'unknown';
  source: string;
  value: any;
}

interface ProcessedMetrics {
  metrics: any;
  dataConfidence: DataConfidence[];
  overallConfidence: 'low' | 'medium' | 'high';
  currentRevenue: number;
  revenueGoal?: number;
  timeline?: string;
  monetizationMethods: string[];
  enrichmentData?: any;
  readinessAnalysis?: any;
  strategyReadiness?: any;
}

export async function processMonetizationInput(
  input: MonetizationInput,
  transcriptContext: string
): Promise<ProcessedMetrics> {
  const dataConfidence: DataConfidence[] = [];
  const metrics: any = {};

  // ========================================================================
  // STEP 1: Process Manual Metrics (VERIFIED data)
  // ========================================================================

  if (input.metrics) {
    // Downloads per episode
    if (input.metrics.downloadsPerEpisode) {
      metrics.downloadsPerEpisode = input.metrics.downloadsPerEpisode;
      dataConfidence.push({
        field: 'downloadsPerEpisode',
        label: 'Downloads per Episode',
        confidence: 'verified',
        source: `User-provided (${input.platform || 'manual entry'})`,
        value: input.metrics.downloadsPerEpisode
      });
    }

    // Total downloads
    if (input.metrics.totalDownloads) {
      metrics.totalDownloads = input.metrics.totalDownloads;
      dataConfidence.push({
        field: 'totalDownloads',
        label: 'Total Downloads',
        confidence: 'verified',
        source: `User-provided (${input.platform || 'manual entry'})`,
        value: input.metrics.totalDownloads
      });
    }

    // Completion rate
    if (input.metrics.completionRate) {
      metrics.completionRate = input.metrics.completionRate;
      dataConfidence.push({
        field: 'completionRate',
        label: 'Completion Rate',
        confidence: 'verified',
        source: `User-provided (${input.platform || 'manual entry'})`,
        value: `${input.metrics.completionRate}%`
      });
    }

    // Email list size
    if (input.metrics.emailListSize) {
      metrics.emailListSize = input.metrics.emailListSize;
      dataConfidence.push({
        field: 'emailListSize',
        label: 'Email List Size',
        confidence: 'verified',
        source: `User-provided (${input.platform || 'manual entry'})`,
        value: input.metrics.emailListSize
      });
    }

    // Total episodes
    if (input.metrics.totalEpisodes) {
      metrics.totalEpisodes = input.metrics.totalEpisodes;
      dataConfidence.push({
        field: 'totalEpisodes',
        label: 'Total Episodes',
        confidence: 'verified',
        source: `User-provided (${input.platform || 'manual entry'})`,
        value: input.metrics.totalEpisodes
      });
    }
  }

  // ========================================================================
  // STEP 2: Try to Enrich with External Data (ESTIMATED data)
  // ========================================================================

  let enrichmentData = null;
  try {
    enrichmentData = await enrichForSponsorship(transcriptContext, {
      youtubeApiKey: process.env.YOUTUBE_API_KEY
    });

    // If user didn't provide downloads, use enrichment estimate
    if (!metrics.downloadsPerEpisode && enrichmentData?.metrics) {
      metrics.downloadsPerEpisode = enrichmentData.metrics.estimatedDownloads;
      dataConfidence.push({
        field: 'downloadsPerEpisode',
        label: 'Downloads per Episode',
        confidence: 'estimated',
        source: enrichmentData.metrics.reasoning || 'Similar podcast analysis',
        value: enrichmentData.metrics.estimatedDownloads
      });
    }

    // CPM estimate from enrichment
    if (enrichmentData?.metrics?.estimatedCPM) {
      metrics.estimatedCPM = enrichmentData.metrics.estimatedCPM;
      dataConfidence.push({
        field: 'estimatedCPM',
        label: 'Estimated CPM',
        confidence: 'estimated',
        source: 'Market rates for similar shows',
        value: `$${enrichmentData.metrics.estimatedCPM}`
      });
    }

    // YouTube data
    if (enrichmentData?.youtube?.subscriberCount) {
      metrics.youtubeSubscribers = enrichmentData.youtube.subscriberCount;
      dataConfidence.push({
        field: 'youtubeSubscribers',
        label: 'YouTube Subscribers',
        confidence: 'verified',
        source: 'YouTube API',
        value: enrichmentData.youtube.subscriberCount
      });
    }

    // Spotify data
    if (enrichmentData?.spotify?.total_episodes) {
      if (!metrics.totalEpisodes) {
        metrics.totalEpisodes = enrichmentData.spotify.total_episodes;
        dataConfidence.push({
          field: 'totalEpisodes',
          label: 'Total Episodes',
          confidence: 'verified',
          source: 'Spotify API',
          value: enrichmentData.spotify.total_episodes
        });
      }
    }

    // Current sponsors (from RSS analysis)
    if (enrichmentData?.rss?.sponsorCandidates?.length > 0) {
      metrics.hasSponsors = true;
      metrics.sponsorCount = enrichmentData.rss.sponsorCandidates.length;
      dataConfidence.push({
        field: 'currentSponsors',
        label: 'Current Sponsors',
        confidence: 'estimated',
        source: 'RSS feed analysis',
        value: `${enrichmentData.rss.sponsorCandidates.length} detected`
      });
    }
  } catch (error) {
    console.error('Enrichment failed during monetization processing:', error);
  }

  // ========================================================================
  // STEP 3: Fill Gaps with Conservative Defaults (UNKNOWN)
  // ========================================================================

  if (!metrics.downloadsPerEpisode) {
    metrics.downloadsPerEpisode = 1000;
    dataConfidence.push({
      field: 'downloadsPerEpisode',
      label: 'Downloads per Episode',
      confidence: 'unknown',
      source: 'Conservative baseline estimate',
      value: 1000
    });
  }

  if (!metrics.estimatedCPM) {
    metrics.estimatedCPM = 18;
    dataConfidence.push({
      field: 'estimatedCPM',
      label: 'Estimated CPM',
      confidence: 'unknown',
      source: 'Industry baseline for new shows',
      value: '$18'
    });
  }

  if (!metrics.completionRate) {
    metrics.completionRate = 60;
    dataConfidence.push({
      field: 'completionRate',
      label: 'Completion Rate',
      confidence: 'unknown',
      source: 'Industry average assumption',
      value: '60%'
    });
  }

  // ========================================================================
  // STEP 4: Calculate Overall Confidence
  // ========================================================================

  const verifiedCount = dataConfidence.filter(d => d.confidence === 'verified').length;
  const estimatedCount = dataConfidence.filter(d => d.confidence === 'estimated').length;
  const totalCount = dataConfidence.length;

  let overallConfidence: 'low' | 'medium' | 'high';
  if (verifiedCount >= totalCount * 0.6) {
    overallConfidence = 'high';
  } else if (verifiedCount >= totalCount * 0.3) {
    overallConfidence = 'medium';
  } else {
    overallConfidence = 'low';
  }

  // ========================================================================
  // STEP 5: Calculate Current Revenue
  // ========================================================================

  let currentRevenue = input.currentMonthlyRevenue || 0;

  // If user said "none" for monetization, revenue is 0
  if (input.monetizationMethods?.includes('none')) {
    currentRevenue = 0;
  }

  // If user didn't provide revenue but has sponsors, estimate it
  if (currentRevenue === 0 && metrics.hasSponsors && !input.monetizationMethods?.includes('none')) {
    // Conservative estimate: 1 sponsor read per episode, 4 episodes/month
    currentRevenue = (metrics.downloadsPerEpisode / 1000) * metrics.estimatedCPM * 4;
    dataConfidence.push({
      field: 'currentRevenue',
      label: 'Current Monthly Revenue',
      confidence: 'estimated',
      source: 'Calculated from detected sponsors',
      value: `$${Math.round(currentRevenue)}`
    });
  }

  // ========================================================================
  // STEP 6: Calculate Readiness Score
  // ========================================================================

  const readinessInput = {
    downloadsPerEpisode: metrics.downloadsPerEpisode,
    monthlyGrowthRate: input.metrics?.monthlyGrowthRate,
    completionRate: metrics.completionRate,
    emailListSize: metrics.emailListSize,
    totalEpisodes: metrics.totalEpisodes,
    episodesPerMonth: enrichmentData?.rss?.publishingConsistency?.episodesPerMonth,
    publishingConsistency: enrichmentData?.rss?.publishingConsistency?.score,
    hasSponsors: metrics.hasSponsors,
    currentRevenuePerEpisode: currentRevenue / 4, // Assuming 4 episodes per month
    hasMediaKit: false, // Would need to check
    hasWebsite: false, // Would need to check
    socialMediaFollowing: metrics.youtubeSubscribers
  };

  const readinessAnalysis = calculateReadinessScore(readinessInput);

  // Calculate strategy-specific readiness
  const strategyReadiness = {
    sponsorship: calculateStrategyReadiness(readinessInput, 'sponsorship'),
    product: calculateStrategyReadiness(readinessInput, 'product'),
    affiliate: calculateStrategyReadiness(readinessInput, 'affiliate'),
    membership: calculateStrategyReadiness(readinessInput, 'membership')
  };

  // ========================================================================
  // RETURN PROCESSED DATA
  // ========================================================================

  return {
    metrics,
    dataConfidence,
    overallConfidence,
    currentRevenue,
    revenueGoal: input.revenueGoal,
    timeline: input.timeline,
    monetizationMethods: input.monetizationMethods || [],
    enrichmentData,
    readinessAnalysis,
    strategyReadiness
  };
}
