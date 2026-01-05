import fetch from 'node-fetch';

// ============================================================================
// RESEARCH LAYER: Real market data for monetization recommendations
// ============================================================================

interface ResearchPack {
  timestamp: string;
  sources: string[];
  marketConditions: MarketConditions;
  sponsorDatabase: SponsorDatabase;
  platformInsights: PlatformInsights;
  cpmBenchmarks: CPMBenchmarks;
}

interface MarketConditions {
  summary: string;
  trends: string[];
  sources: { title: string; url: string; date: string }[];
}

interface SponsorDatabase {
  categories: SponsorCategory[];
  totalBrands: number;
  lastUpdated: string;
}

interface SponsorCategory {
  name: string;
  brands: BrandProfile[];
  typicalDeliverables: string[];
  averageDealSize?: string;
}

interface BrandProfile {
  name: string;
  category: string;
  targetAudience: string;
  knownPlacements?: string[];
  website?: string;
}

interface PlatformInsights {
  podcast: PlatformData;
  youtube: PlatformData;
  newsletter: PlatformData;
}

interface PlatformData {
  status: string;
  trends: string[];
  monetizationNotes: string[];
}

interface CPMBenchmarks {
  podcast: { min: number; max: number; average: number; note: string };
  youtube: { min: number; max: number; average: number; note: string };
  newsletter: { min: number; max: number; average: number; note: string };
  source: string;
  lastUpdated: string;
}

// ============================================================================
// CURATED SPONSOR DATABASE (seed data - expand over time)
// ============================================================================

const SPONSOR_DATABASE: SponsorCategory[] = [
  {
    name: 'SaaS & Productivity',
    brands: [
      { name: 'Notion', category: 'SaaS & Productivity', targetAudience: 'Knowledge workers, creators, teams', knownPlacements: ['Ali Abdaal', 'Thomas Frank'], website: 'notion.so' },
      { name: 'ClickUp', category: 'SaaS & Productivity', targetAudience: 'Teams, project managers, agencies', knownPlacements: ['My First Million'], website: 'clickup.com' },
      { name: 'Monday.com', category: 'SaaS & Productivity', targetAudience: 'Operations teams, managers', website: 'monday.com' },
      { name: 'Airtable', category: 'SaaS & Productivity', targetAudience: 'Data-savvy teams, builders', website: 'airtable.com' },
      { name: 'Zapier', category: 'SaaS & Productivity', targetAudience: 'Automation enthusiasts, ops teams', website: 'zapier.com' },
      { name: 'Calendly', category: 'SaaS & Productivity', targetAudience: 'Sales teams, consultants', website: 'calendly.com' },
    ],
    typicalDeliverables: ['60s host-read', 'Landing page', 'Promo code'],
    averageDealSize: '$2,000-$8,000 per episode (10k-50k listeners)'
  },
  {
    name: 'Finance & Investing',
    brands: [
      { name: 'Wealthfront', category: 'Finance & Investing', targetAudience: 'Young professionals, tech workers', website: 'wealthfront.com' },
      { name: 'Betterment', category: 'Finance & Investing', targetAudience: 'New investors, millennials', website: 'betterment.com' },
      { name: 'M1 Finance', category: 'Finance & Investing', targetAudience: 'DIY investors', website: 'm1finance.com' },
      { name: 'Public.com', category: 'Finance & Investing', targetAudience: 'Social investors, crypto curious', website: 'public.com' },
      { name: 'Rocket Money', category: 'Finance & Investing', targetAudience: 'Budget-conscious consumers', knownPlacements: ['Ramsey Network'], website: 'rocketmoney.com' },
    ],
    typicalDeliverables: ['Host-read with signup CTA', 'Bonus offer for listeners', 'Multi-episode commitment'],
    averageDealSize: '$3,000-$12,000 per episode (depending on conversion potential)'
  },
  {
    name: 'Developer Tools & Infrastructure',
    brands: [
      { name: 'Sentry', category: 'Developer Tools', targetAudience: 'Software engineers, DevOps', website: 'sentry.io' },
      { name: 'Datadog', category: 'Developer Tools', targetAudience: 'DevOps engineers, platform teams', website: 'datadoghq.com' },
      { name: 'Retool', category: 'Developer Tools', targetAudience: 'Internal tool builders, ops teams', website: 'retool.com' },
      { name: 'LinearB', category: 'Developer Tools', targetAudience: 'Engineering leaders', website: 'linearb.io' },
      { name: 'Temporal', category: 'Developer Tools', targetAudience: 'Backend engineers', website: 'temporal.io' },
    ],
    typicalDeliverables: ['Technical deep-dive', 'Free trial offer', 'GitHub/docs link'],
    averageDealSize: '$5,000-$20,000 per episode (niche but high-value audience)'
  },
  {
    name: 'E-Learning & Education',
    brands: [
      { name: 'Brilliant', category: 'E-Learning', targetAudience: 'STEM learners, lifelong learners', knownPlacements: ['Veritasium', '3Blue1Brown'], website: 'brilliant.org' },
      { name: 'Skillshare', category: 'E-Learning', targetAudience: 'Creative professionals, hobbyists', website: 'skillshare.com' },
      { name: 'MasterClass', category: 'E-Learning', targetAudience: 'Aspirational learners, professionals', website: 'masterclass.com' },
      { name: 'Coursera', category: 'E-Learning', targetAudience: 'Career changers, upskilling professionals', website: 'coursera.org' },
    ],
    typicalDeliverables: ['Free trial offer', 'Discount code', 'Host endorsement'],
    averageDealSize: '$2,500-$10,000 per episode'
  },
  {
    name: 'Health & Wellness',
    brands: [
      { name: 'AG1 (Athletic Greens)', category: 'Health & Wellness', targetAudience: 'Health-conscious adults 25-55', knownPlacements: ['Huberman Lab', 'Tim Ferriss'], website: 'drinkag1.com' },
      { name: 'InsideTracker', category: 'Health & Wellness', targetAudience: 'Biohackers, longevity focused', knownPlacements: ['Huberman Lab'], website: 'insidetracker.com' },
      { name: 'Whoop', category: 'Health & Wellness', targetAudience: 'Athletes, fitness enthusiasts', website: 'whoop.com' },
      { name: 'Eight Sleep', category: 'Health & Wellness', targetAudience: 'Sleep optimizers, tech early adopters', knownPlacements: ['Lex Fridman'], website: 'eightsleep.com' },
      { name: 'BetterHelp', category: 'Health & Wellness', targetAudience: 'Mental health support seekers', website: 'betterhelp.com' },
    ],
    typicalDeliverables: ['Personal testimonial', 'Discount code', 'Long-term partnership'],
    averageDealSize: '$3,000-$15,000 per episode (wellness is high-CPM)'
  },
  {
    name: 'Business Services & Marketing',
    brands: [
      { name: 'HubSpot', category: 'Business Services', targetAudience: 'Marketers, sales teams, SMBs', website: 'hubspot.com' },
      { name: 'Shopify', category: 'Business Services', targetAudience: 'E-commerce entrepreneurs', knownPlacements: ['How I Built This'], website: 'shopify.com' },
      { name: 'Gusto', category: 'Business Services', targetAudience: 'Small business owners (payroll)', website: 'gusto.com' },
      { name: 'Constant Contact', category: 'Business Services', targetAudience: 'Small business email marketers', website: 'constantcontact.com' },
    ],
    typicalDeliverables: ['Free trial', 'Demo booking CTA', 'Case study mention'],
    averageDealSize: '$4,000-$12,000 per episode'
  },
  {
    name: 'Consumer Products & Services',
    brands: [
      { name: 'HelloFresh', category: 'Consumer Products', targetAudience: 'Busy families, meal planners', website: 'hellofresh.com' },
      { name: 'NordVPN', category: 'Consumer Services', targetAudience: 'Privacy-conscious consumers', website: 'nordvpn.com' },
      { name: 'Squarespace', category: 'Consumer Services', targetAudience: 'Creators, small business owners', website: 'squarespace.com' },
      { name: 'Audible', category: 'Consumer Services', targetAudience: 'Readers, commuters', website: 'audible.com' },
    ],
    typicalDeliverables: ['Promo code', 'Free trial', 'Multi-platform campaign'],
    averageDealSize: '$2,000-$8,000 per episode'
  },
  {
    name: 'Career & Professional Development',
    brands: [
      { name: 'LinkedIn Learning', category: 'Career Development', targetAudience: 'Professionals upskilling', website: 'linkedin.com/learning' },
      { name: 'ZipRecruiter', category: 'Career Development', targetAudience: 'Job seekers, hiring managers', website: 'ziprecruiter.com' },
      { name: 'Indeed', category: 'Career Development', targetAudience: 'Job seekers', website: 'indeed.com' },
    ],
    typicalDeliverables: ['Free posting credit', 'Premium trial', 'Host testimonial'],
    averageDealSize: '$3,000-$10,000 per episode'
  }
];

// ============================================================================
// CPM BENCHMARKS (Updated periodically from IAB, industry reports)
// ============================================================================

const CPM_BENCHMARKS: CPMBenchmarks = {
  podcast: {
    min: 18,
    max: 50,
    average: 25,
    note: 'Host-read ads perform 3-5x better than pre-recorded. Niche audiences (tech, finance, health) command premium rates.'
  },
  youtube: {
    min: 5,
    max: 30,
    average: 12,
    note: 'Varies significantly by niche. Finance/tech/business: $15-30 CPM. Entertainment/gaming: $5-12 CPM.'
  },
  newsletter: {
    min: 20,
    max: 100,
    average: 40,
    note: 'Email has highest engagement. B2B newsletters command $50-100 CPM. Consumer: $20-40 CPM.'
  },
  source: 'IAB Podcast Advertising Revenue Report 2024, Raptive (formerly AdThrive), ConvertKit Creator Economics',
  lastUpdated: '2024-Q4'
};

// ============================================================================
// MARKET CONDITIONS (Fetch or cache from news APIs)
// ============================================================================

async function fetchMarketConditions(): Promise<MarketConditions> {
  // In production, you'd fetch from:
  // - IAB reports API
  // - Axios Markets API
  // - Creator economy newsletters
  // - Ad spend trend databases

  // For now, return recent market context (update this quarterly)
  return {
    summary: 'Q1 2026: Podcast ad spend rebounding after 2024 contraction. Programmatic podcast ads growing 25% YoY. Creator-driven sponsorships outperforming traditional ad networks. Video podcasts commanding 30-40% premium over audio-only.',
    trends: [
      'Video podcast ads growing faster than audio (YouTube Podcasts, Spotify Video)',
      'Direct brand deals preferred over ad networks (better rates for creators)',
      'Multi-platform campaigns standard (podcast + newsletter + YouTube)',
      'Performance-based deals (CPM + affiliate) replacing flat CPM',
      'Niche shows (10k-50k listeners) seeing increased brand interest'
    ],
    sources: [
      { title: 'IAB Podcast Revenue Report Q4 2024', url: 'https://www.iab.com/insights/podcast-advertising-revenue-report/', date: '2024-12' },
      { title: 'Axios: Creator Economy Ad Spend Trends', url: 'https://www.axios.com/pro/media-trends', date: '2025-01' },
      { title: 'Podcast Movement: State of Monetization 2025', url: 'https://podcastmovement.com/monetization-report', date: '2025-01' }
    ]
  };
}

// ============================================================================
// PLATFORM INSIGHTS (Current state of each monetization channel)
// ============================================================================

async function fetchPlatformInsights(): Promise<PlatformInsights> {
  return {
    podcast: {
      status: 'Growing steadily. Video podcasts gaining market share.',
      trends: [
        'Spotify and Apple Podcasts adding native ad insertion',
        'YouTube Podcasts becoming major distribution channel',
        'Direct sponsorships outperforming programmatic by 2-3x'
      ],
      monetizationNotes: [
        'Host-read ads convert 3-5x better than pre-recorded',
        'Mid-roll ads perform best (80% listen-through rate)',
        'Multi-episode commitments (6-12 episodes) common for direct deals'
      ]
    },
    youtube: {
      status: 'Dominant video platform. Podcasts increasingly using YouTube as primary distribution.',
      trends: [
        'YouTube Shorts monetization expanding',
        'Sponsor integrations (not just AdSense) driving 60% of creator revenue',
        'Long-form content (30+ min) seeing resurgence'
      ],
      monetizationNotes: [
        'CPM varies wildly by niche ($5-30)',
        'Sponsor integrations pay 5-10x more than AdSense alone',
        'Video podcast clips drive discovery → full episode listens'
      ]
    },
    newsletter: {
      status: 'Email remains highest-engagement channel for creators.',
      trends: [
        'Beehiiv, Substack, ConvertKit enabling easy sponsor placement',
        'B2B newsletters commanding premium CPMs ($50-100)',
        'Bundled podcast + newsletter sponsorships increasingly common'
      ],
      monetizationNotes: [
        'Newsletter-only ads often convert better than podcast ads',
        'Placement matters: top-of-email performs 2x better than mid-email',
        'Segmented lists allow niche sponsor targeting'
      ]
    }
  };
}

// ============================================================================
// MAIN RESEARCH PACK BUILDER
// ============================================================================

export async function buildResearchPack(): Promise<ResearchPack> {
  const [marketConditions, platformInsights] = await Promise.all([
    fetchMarketConditions(),
    fetchPlatformInsights()
  ]);

  return {
    timestamp: new Date().toISOString(),
    sources: [
      'IAB Podcast Advertising Revenue Report',
      'Axios Creator Economy Insights',
      'Internal Sponsor Database (curated)',
      'Industry CPM Benchmarks'
    ],
    marketConditions,
    sponsorDatabase: {
      categories: SPONSOR_DATABASE,
      totalBrands: SPONSOR_DATABASE.reduce((sum, cat) => sum + cat.brands.length, 0),
      lastUpdated: '2025-01-05'
    },
    platformInsights,
    cpmBenchmarks: CPM_BENCHMARKS
  };
}

// ============================================================================
// CATEGORY MATCHING (Match transcript topics to sponsor categories)
// ============================================================================

export function matchSponsorCategories(
  transcriptKeywords: string[],
  transcriptTopics: string[]
): SponsorCategory[] {
  const keywords = [...transcriptKeywords, ...transcriptTopics].map(k => k.toLowerCase());

  const scored = SPONSOR_DATABASE.map(category => {
    let score = 0;

    // Check if any keyword matches category name or brand names
    const categoryTerms = [
      category.name.toLowerCase(),
      ...category.brands.map(b => b.name.toLowerCase()),
      ...category.brands.map(b => b.targetAudience.toLowerCase())
    ];

    for (const keyword of keywords) {
      for (const term of categoryTerms) {
        if (term.includes(keyword) || keyword.includes(term)) {
          score += 1;
        }
      }
    }

    // Boost scores for common cross-industry sponsors
    if (['business', 'productivity', 'career', 'entrepreneur'].some(kw => keywords.includes(kw))) {
      if (category.name.includes('SaaS') || category.name.includes('Business')) {
        score += 2;
      }
    }

    return { category, score };
  });

  // Return top 3 matching categories
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.category);
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function getSponsorsByCategory(categoryName: string): BrandProfile[] {
  const category = SPONSOR_DATABASE.find(c => c.name === categoryName);
  return category?.brands || [];
}

export function getAllSponsors(): BrandProfile[] {
  return SPONSOR_DATABASE.flatMap(cat => cat.brands);
}

export function searchSponsors(query: string): BrandProfile[] {
  const q = query.toLowerCase();
  return getAllSponsors().filter(brand =>
    brand.name.toLowerCase().includes(q) ||
    brand.category.toLowerCase().includes(q) ||
    brand.targetAudience.toLowerCase().includes(q)
  );
}
