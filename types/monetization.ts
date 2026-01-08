// Real podcast metrics that can be verified or manually entered

export interface PodcastMetrics {
  // Core audience data
  downloadsPerEpisode?: number;
  downloadsPerEpisodeLast30Days?: number;
  downloadsPerEpisodeLast90Days?: number;
  totalDownloads?: number;
  monthlyGrowthRate?: number; // percentage

  // Engagement quality
  completionRate?: number; // percentage
  averageListenTime?: number; // minutes
  subscriberCount?: number;
  emailListSize?: number;

  // Geographic & demographic
  topCountries?: string[];
  primaryDemographic?: string;

  // Publishing consistency
  episodesPerMonth?: number;
  totalEpisodes?: number;

  // Current monetization
  currentRevenuePerEpisode?: number;
  hasSponsors?: boolean;
  sponsorCount?: number;

  // Data source tracking
  dataSource?: 'spotify' | 'apple' | 'manual' | 'estimated';
  lastUpdated?: string;
  verifiedFields?: string[]; // Which fields are verified vs estimated
}

export interface MonetizationInput {
  // Step 1: Platform connection
  hasAnalyticsAccess: boolean;
  platform?: 'spotify' | 'apple' | 'buzzsprout' | 'libsyn' | 'anchor' | 'other';
  connected?: boolean;

  // Step 2: Manual metrics (if not connected)
  metrics?: Partial<PodcastMetrics>;

  // Step 3: Current monetization status
  monetizationMethods?: Array<'sponsorships' | 'products' | 'affiliates' | 'memberships' | 'none'>;
  currentMonthlyRevenue?: number;

  // Step 4: Goals
  revenueGoal?: number;
  timeline?: '1-month' | '3-months' | '6-months' | '12-months';
}

export interface DataConfidence {
  field: string;
  label: string;
  confidence: 'verified' | 'estimated' | 'unknown';
  source: string;
  value: any;
}

export interface MonetizationRecommendation {
  type: 'sponsorship' | 'product' | 'affiliate' | 'membership' | 'other';
  priority: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  estimatedRevenue: number;
  effort: 'low' | 'medium' | 'high';
  readiness: number; // 0-100
  reasoning: string;
  nextSteps: string[];
}

export interface MonetizationInsights {
  // Current status
  currentRevenue: number;
  potentialRevenue: number;
  underMonetizedBy: number; // dollars per episode
  readinessScore: number; // 0-100

  // Data confidence breakdown
  dataConfidence: DataConfidence[];
  overallConfidence: 'low' | 'medium' | 'high';

  // Recommendations ranked by readiness
  recommendations: MonetizationRecommendation[];

  // Truth statements
  truthStatement: string; // "You're under-monetized by $54/episode"
  nextBestMove: string; // "NOT more downloads. Start with ONE sponsor at $25 CPM"
  whyThisWorksNow: string[]; // Bullet points

  // Standard sponsorship data (existing)
  score?: number;
  reasoning?: string;
  estimatedMetrics?: any;
  suggestedSponsors?: any[];
  targetAudienceProfile?: string;
  potentialAdSpots?: string[];
  platformRecommendations?: any;
  actionableNextSteps?: string[];
  dataSources?: string[];
}
