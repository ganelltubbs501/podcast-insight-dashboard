// ============================================================================
// READINESS SCORE ALGORITHM: Can they actually execute monetization strategies?
// ============================================================================

interface ReadinessFactors {
  // Audience factors
  audienceSize: number; // 0-30 points
  audienceGrowth: number; // 0-10 points
  audienceEngagement: number; // 0-15 points

  // Content factors
  contentConsistency: number; // 0-15 points
  contentQuality: number; // 0-10 points

  // Infrastructure factors
  monetizationInfra: number; // 0-10 points
  professionalAssets: number; // 0-10 points

  total: number; // 0-100
}

interface ReadinessInput {
  // Audience metrics
  downloadsPerEpisode?: number;
  monthlyGrowthRate?: number;
  completionRate?: number;
  emailListSize?: number;

  // Content metrics
  totalEpisodes?: number;
  episodesPerMonth?: number;
  publishingConsistency?: number; // From RSS analysis (0-100)

  // Current monetization
  hasSponsors?: boolean;
  currentRevenuePerEpisode?: number;

  // Professional assets
  hasWebsite?: boolean;
  hasMediaKit?: boolean;
  socialMediaFollowing?: number;
}

export function calculateReadinessScore(input: ReadinessInput): {
  score: number;
  factors: ReadinessFactors;
  blockers: string[];
  strengths: string[];
  recommendations: string[];
} {
  const factors: ReadinessFactors = {
    audienceSize: 0,
    audienceGrowth: 0,
    audienceEngagement: 0,
    contentConsistency: 0,
    contentQuality: 0,
    monetizationInfra: 0,
    professionalAssets: 0,
    total: 0
  };

  const blockers: string[] = [];
  const strengths: string[] = [];
  const recommendations: string[] = [];

  // ========================================================================
  // AUDIENCE SIZE (0-30 points) - Can you reach enough people?
  // ========================================================================
  const downloads = input.downloadsPerEpisode || 0;

  if (downloads >= 10000) {
    factors.audienceSize = 30;
    strengths.push('Premium audience size (10k+ downloads)');
  } else if (downloads >= 5000) {
    factors.audienceSize = 25;
    strengths.push('Strong audience size (5k+ downloads)');
  } else if (downloads >= 2500) {
    factors.audienceSize = 20;
    strengths.push('Solid audience size (2.5k+ downloads)');
  } else if (downloads >= 1000) {
    factors.audienceSize = 15;
  } else if (downloads >= 500) {
    factors.audienceSize = 10;
    recommendations.push('Grow to 1,000+ downloads for better sponsor rates');
  } else if (downloads >= 100) {
    factors.audienceSize = 5;
    blockers.push('Audience size too small for direct sponsorships (<500 downloads)');
    recommendations.push('Focus on affiliate marketing and products while building audience');
  } else {
    factors.audienceSize = 0;
    blockers.push('Critical: Audience too small for monetization (<100 downloads)');
    recommendations.push('Focus 100% on audience growth before monetization');
  }

  // ========================================================================
  // AUDIENCE GROWTH (0-10 points) - Are you gaining momentum?
  // ========================================================================
  const growthRate = input.monthlyGrowthRate || 0;

  if (growthRate >= 20) {
    factors.audienceGrowth = 10;
    strengths.push('Rapid growth (20%+ monthly)');
  } else if (growthRate >= 10) {
    factors.audienceGrowth = 8;
    strengths.push('Strong growth (10%+ monthly)');
  } else if (growthRate >= 5) {
    factors.audienceGrowth = 6;
  } else if (growthRate >= 0) {
    factors.audienceGrowth = 4;
  } else {
    factors.audienceGrowth = 0;
    blockers.push('Declining audience - fix this before monetizing');
    recommendations.push('Investigate why you\'re losing listeners');
  }

  // ========================================================================
  // AUDIENCE ENGAGEMENT (0-15 points) - Do they actually listen?
  // ========================================================================
  const completionRate = input.completionRate || 0;
  const emailList = input.emailListSize || 0;

  // Completion rate (0-10 points)
  if (completionRate >= 80) {
    factors.audienceEngagement = 10;
    strengths.push('Exceptional engagement (80%+ completion)');
  } else if (completionRate >= 70) {
    factors.audienceEngagement = 8;
    strengths.push('Strong engagement (70%+ completion)');
  } else if (completionRate >= 60) {
    factors.audienceEngagement = 6;
  } else if (completionRate >= 50) {
    factors.audienceEngagement = 4;
  } else if (completionRate >= 40) {
    factors.audienceEngagement = 2;
    recommendations.push('Improve content engagement (completion rate below 50%)');
  } else {
    factors.audienceEngagement = 0;
    blockers.push('Very low engagement - listeners aren\'t finishing episodes');
  }

  // Email list bonus (+5 points max)
  const emailRatio = downloads > 0 ? emailList / downloads : 0;
  if (emailRatio >= 0.15) {
    factors.audienceEngagement += 5;
    strengths.push('Excellent email conversion (15%+ of audience)');
  } else if (emailRatio >= 0.10) {
    factors.audienceEngagement += 4;
  } else if (emailRatio >= 0.05) {
    factors.audienceEngagement += 2;
  } else if (emailList > 100) {
    factors.audienceEngagement += 1;
  } else {
    recommendations.push('Build an email list - sponsors value owned channels');
  }

  // Cap at 15
  factors.audienceEngagement = Math.min(15, factors.audienceEngagement);

  // ========================================================================
  // CONTENT CONSISTENCY (0-15 points) - Can sponsors rely on you?
  // ========================================================================
  const totalEpisodes = input.totalEpisodes || 0;
  const episodesPerMonth = input.episodesPerMonth || 0;
  const consistency = input.publishingConsistency || 0;

  // Track record (0-8 points)
  if (totalEpisodes >= 100) {
    factors.contentConsistency = 8;
    strengths.push('Proven track record (100+ episodes)');
  } else if (totalEpisodes >= 50) {
    factors.contentConsistency = 6;
    strengths.push('Established show (50+ episodes)');
  } else if (totalEpisodes >= 25) {
    factors.contentConsistency = 4;
  } else if (totalEpisodes >= 12) {
    factors.contentConsistency = 2;
  } else {
    factors.contentConsistency = 0;
    blockers.push('Not enough episodes to demonstrate consistency (<12 episodes)');
    recommendations.push('Publish consistently for 3+ months before approaching sponsors');
  }

  // Publishing frequency (+4 points max)
  if (episodesPerMonth >= 4) {
    factors.contentConsistency += 4;
  } else if (episodesPerMonth >= 2) {
    factors.contentConsistency += 3;
  } else if (episodesPerMonth >= 1) {
    factors.contentConsistency += 2;
  } else {
    recommendations.push('Publish at least monthly to maintain sponsor relationships');
  }

  // Publishing consistency (+3 points max)
  if (consistency >= 90) {
    factors.contentConsistency += 3;
    strengths.push('Highly consistent publishing schedule');
  } else if (consistency >= 75) {
    factors.contentConsistency += 2;
  } else if (consistency >= 60) {
    factors.contentConsistency += 1;
  } else {
    recommendations.push('Improve publishing consistency - sponsors need reliability');
  }

  // Cap at 15
  factors.contentConsistency = Math.min(15, factors.contentConsistency);

  // ========================================================================
  // CONTENT QUALITY (0-10 points) - Is the content sponsor-ready?
  // ========================================================================
  // This is inferred from engagement + external signals
  if (completionRate >= 70 && downloads >= 1000) {
    factors.contentQuality = 10;
  } else if (completionRate >= 60 && downloads >= 500) {
    factors.contentQuality = 8;
  } else if (completionRate >= 50) {
    factors.contentQuality = 6;
  } else if (completionRate >= 40) {
    factors.contentQuality = 4;
  } else {
    factors.contentQuality = 2;
    recommendations.push('Focus on content quality - low completion suggests issues');
  }

  // ========================================================================
  // MONETIZATION INFRASTRUCTURE (0-10 points) - Do you have the basics?
  // ========================================================================
  if (input.hasSponsors) {
    factors.monetizationInfra = 10;
    strengths.push('Already monetizing - proven capability');
  } else if (input.currentRevenuePerEpisode && input.currentRevenuePerEpisode > 0) {
    factors.monetizationInfra = 7;
    strengths.push('Generating revenue');
  } else {
    factors.monetizationInfra = 0;
    recommendations.push('Set up payment processing and rate card before pitching');
  }

  // ========================================================================
  // PROFESSIONAL ASSETS (0-10 points) - Can you pitch professionally?
  // ========================================================================
  let assetScore = 0;

  if (input.hasMediaKit) {
    assetScore += 5;
    strengths.push('Has professional media kit');
  } else {
    recommendations.push('Create a one-page media kit with stats and audience profile');
  }

  if (input.hasWebsite) {
    assetScore += 3;
  } else {
    recommendations.push('Set up a basic website (even a simple landing page)');
  }

  if (input.socialMediaFollowing && input.socialMediaFollowing > 1000) {
    assetScore += 2;
  }

  factors.professionalAssets = assetScore;

  // ========================================================================
  // CALCULATE TOTAL SCORE
  // ========================================================================
  factors.total =
    factors.audienceSize +
    factors.audienceGrowth +
    factors.audienceEngagement +
    factors.contentConsistency +
    factors.contentQuality +
    factors.monetizationInfra +
    factors.professionalAssets;

  // ========================================================================
  // STRATEGY-SPECIFIC READINESS
  // ========================================================================
  // Return overall score + context
  return {
    score: factors.total,
    factors,
    blockers,
    strengths,
    recommendations
  };
}

/**
 * Calculate readiness for specific monetization strategies
 */
export function calculateStrategyReadiness(
  input: ReadinessInput,
  strategy: 'sponsorship' | 'product' | 'affiliate' | 'membership'
): number {
  const overall = calculateReadinessScore(input);
  const downloads = input.downloadsPerEpisode || 0;
  const engagement = input.completionRate || 0;
  const emailList = input.emailListSize || 0;

  switch (strategy) {
    case 'sponsorship':
      // Needs audience size + consistency
      if (downloads < 500) return 0;
      if (downloads < 1000) return Math.min(overall.score - 20, 40);
      if (downloads < 2500) return Math.min(overall.score - 10, 60);
      return overall.score;

    case 'product':
      // Needs engagement + email list
      const productScore = Math.min(
        (engagement / 70) * 50 + // 50 points from engagement
        (emailList / (downloads * 0.1)) * 50, // 50 points from email list
        100
      );
      return Math.round(productScore);

    case 'affiliate':
      // Easiest - just needs engaged audience
      if (downloads < 100) return 20;
      if (engagement < 40) return 30;
      return Math.min(overall.score + 15, 95); // Boost affiliate readiness

    case 'membership':
      // Hardest - needs everything
      if (downloads < 1000) return Math.min(overall.score - 30, 30);
      if (emailList < downloads * 0.05) return Math.min(overall.score - 20, 50);
      return Math.min(overall.score, 85); // Cap membership at 85 (it's hard)

    default:
      return overall.score;
  }
}
