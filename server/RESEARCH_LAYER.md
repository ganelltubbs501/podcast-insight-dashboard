# Research Layer Documentation

## Overview

The **Research Layer** is a market intelligence system that grounds AI-generated monetization recommendations in real data. Instead of letting Gemini hallucinate sponsor names and CPM ranges, we provide it with:

1. **Curated sponsor database** (70+ real brands actively sponsoring podcasts)
2. **CPM benchmarks** from IAB, Raptive, and ConvertKit reports
3. **Market conditions** (Q1 2026 ad spend trends, creator economy dynamics)
4. **Platform insights** (podcast vs YouTube vs newsletter monetization)

## Architecture

```
User clicks "Generate Sponsorship Analysis"
         ↓
Frontend → POST /api/sponsorship { context, useLiveData }
         ↓
Backend builds Research Pack:
  1. Load curated sponsor database (research.ts)
  2. Fetch market conditions (IAB/Axios data)
  3. Load CPM benchmarks (podcast: $18-50, YT: $5-30, newsletter: $20-100)
  4. Optionally: Enrich with live podcast data (enrichment.ts)
         ↓
Backend sends Research Pack + Transcript → Gemini
         ↓
Gemini generates monetization insights grounded in research pack
         ↓
Backend attaches metadata (sources, brand count, categories matched)
         ↓
Frontend displays:
  - Sponsor recommendations with real brand names
  - Estimated CPM ranges per platform
  - Actionable next steps
  - Data sources for transparency
```

## Files

### `server/src/research.ts`

**Core research layer implementation**

Key functions:

- `buildResearchPack()` - Assembles market data, sponsor database, CPM benchmarks
- `matchSponsorCategories(keywords, topics)` - Matches transcript topics to sponsor categories
- `searchSponsors(query)` - Search sponsor database by keyword
- `getAllSponsors()` - Get all 70+ sponsor brands

Sponsor categories (8 total):
1. SaaS & Productivity (Notion, ClickUp, Airtable, Zapier, Monday, Calendly)
2. Finance & Investing (Wealthfront, Betterment, Public, Rocket Money)
3. Developer Tools (Sentry, Datadog, Retool, LinearB, Temporal)
4. E-Learning (Brilliant, Skillshare, MasterClass, Coursera)
5. Health & Wellness (AG1, InsideTracker, Whoop, Eight Sleep, BetterHelp)
6. Business Services (HubSpot, Shopify, Gusto, Constant Contact)
7. Consumer Products (HelloFresh, NordVPN, Squarespace, Audible)
8. Career Development (LinkedIn Learning, ZipRecruiter, Indeed)

### `server/src/gemini.ts`

**AI generation with research grounding**

New function: `generateSponsorshipWithGemini(transcriptContext, researchPack)`

System instruction emphasizes:
- Base recommendations on PROVIDED research pack, not generic knowledge
- Cite specific sponsors from the database
- Use CPM benchmarks from IAB/industry reports
- Cite data sources in output

Response schema includes:
- `suggestedSponsors[]` with `category`, `brands`, `estimatedCPM`, `typicalDeal`
- `platformRecommendations` (podcast/youtube/newsletter with priority + CPM)
- `actionableNextSteps[]` (specific tasks like "Create media kit")
- `dataSources[]` (transparent sourcing)

### `server/src/index.ts`

**API endpoint: POST /api/sponsorship**

Flow:
1. Build research pack via `buildResearchPack()`
2. (Optional) Enrich with live podcast data via `enrichForSponsorship()`
3. Match sponsor categories via `matchSponsorCategories()`
4. Generate insights via `generateSponsorshipWithGemini()`
5. Attach `researchMetadata` for transparency
6. Return JSON to frontend

### `types.ts`

**Updated TypeScript interfaces**

```typescript
interface SponsorRecommendation {
  category: string;
  brands: string[];
  matchReason: string;
  estimatedCPM?: string;  // NEW
  typicalDeal?: string;    // NEW
}

interface SponsorshipInsights {
  score: number;
  reasoning: string;
  suggestedSponsors: SponsorRecommendation[];
  targetAudienceProfile: string;
  potentialAdSpots: string[];

  // NEW research-backed fields
  platformRecommendations?: {
    podcast: { priority, cpmRange, notes };
    youtube: { priority, cpmRange, notes };
    newsletter: { priority, cpmRange, notes };
  };
  actionableNextSteps?: string[];
  dataSources?: string[];

  // Metadata for transparency
  researchMetadata?: {
    researchPackVersion: string;
    totalSponsorBrands: number;
    marketDataSources: string[];
    liveDataUsed: boolean;
    categoriesMatched: number;
  };
}
```

## Data Sources

### CPM Benchmarks

| Platform   | Min CPM | Max CPM | Avg CPM | Note                                        |
|------------|---------|---------|---------|---------------------------------------------|
| Podcast    | $18     | $50     | $25     | Host-read ads perform 3-5x better          |
| YouTube    | $5      | $30     | $12     | Finance/tech: $15-30; Gaming: $5-12        |
| Newsletter | $20     | $100    | $40     | B2B newsletters command $50-100 CPM        |

**Sources:**
- IAB Podcast Advertising Revenue Report 2024
- Raptive (formerly AdThrive) 2024 benchmarks
- ConvertKit Creator Economics Report

### Market Conditions (Q1 2026)

- Podcast ad spend rebounding after 2024 contraction
- Programmatic podcast ads growing 25% YoY
- Video podcasts commanding 30-40% premium over audio-only
- Niche shows (10k-50k listeners) seeing increased brand interest
- Multi-platform campaigns (podcast + newsletter + YouTube) now standard

**Sources:**
- IAB Podcast Revenue Report Q4 2024
- Axios: Creator Economy Ad Spend Trends
- Podcast Movement: State of Monetization 2025

## Sponsor Database

**Current scale:** 70+ brands across 8 categories

Each brand includes:
- `name` - Brand name
- `category` - Primary category
- `targetAudience` - Who they target (e.g., "Knowledge workers, creators, teams")
- `knownPlacements` - Podcasts/creators they've sponsored (if known)
- `website` - Brand website

**Example:**
```typescript
{
  name: 'Notion',
  category: 'SaaS & Productivity',
  targetAudience: 'Knowledge workers, creators, teams',
  knownPlacements: ['Ali Abdaal', 'Thomas Frank'],
  website: 'notion.so'
}
```

## Expanding the Database

To add more sponsors:

1. Research recent podcast ads (listen to top podcasts in your niche)
2. Check sponsor marketplaces (Gumball, Podcorn, AdvertiseCast)
3. Review public brand partnership pages
4. Add to `SPONSOR_DATABASE` array in `research.ts`

Format:
```typescript
{
  name: 'BrandName',
  category: 'Category Name',
  brands: [
    {
      name: 'Brand',
      category: 'Category Name',
      targetAudience: 'Who they target',
      knownPlacements?: ['Podcast A', 'Podcast B'],
      website?: 'brand.com'
    }
  ],
  typicalDeliverables: ['60s host-read', 'Landing page', 'Promo code'],
  averageDealSize?: '$X,000-$Y,000 per episode (audience size)'
}
```

## Live Enrichment (Optional)

When `useLiveData: true`, the system fetches real-time podcast data:

- **iTunes/Apple Podcasts**: Show metadata, feed URL
- **RSS Feed**: Show notes, episode titles, sponsor mentions
- **YouTube**: Subscriber count, view count (requires `YOUTUBE_API_KEY`)
- **Spotify**: Show metadata, episode count (requires `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`)
- **Reddit**: Community mentions, sentiment
- **Google Trends**: Interest over time

This enriches the research pack with podcast-specific signals (e.g., "This show has 100k+ YouTube subscribers → premium CPM").

## Frontend Display

The ResultsPage now shows:

1. **Sponsor recommendations** with real brand names (up to 8 brands per category)
2. **Estimated CPM** per category (e.g., "$25-40 CPM")
3. **Typical deal structure** (e.g., "60s host-read, multi-episode commitment")
4. **Platform recommendations** (High/Medium/Low priority for podcast/YouTube/newsletter)
5. **Actionable next steps** (numbered list of specific tasks)
6. **Data sources** (transparent sourcing badges)
7. **Research metadata** (70+ brands analyzed, X categories matched, live data used)

## Maintenance Schedule

### Weekly
- Check for new sponsor announcements in podcast newsletters
- Add 2-3 new brands to database

### Monthly
- Review CPM benchmarks from industry reports
- Update market conditions summary

### Quarterly
- Major database expansion (20-30 new brands)
- Update all market data sources
- Review and prune outdated sponsors

## API Keys (Optional)

For live enrichment:

```bash
# .env
YOUTUBE_API_KEY=your_key_here          # YouTube Data API v3
SPOTIFY_CLIENT_ID=your_id_here         # Spotify for Developers
SPOTIFY_CLIENT_SECRET=your_secret_here # Spotify for Developers
```

If not provided, system falls back to research pack only (still highly effective).

## Example Output

```json
{
  "score": 78,
  "reasoning": "This episode covers productivity and time management for knowledge workers, aligning with SaaS/productivity sponsors. Based on Q1 2026 market data, this niche is experiencing 15% YoY ad spend growth.",
  "suggestedSponsors": [
    {
      "category": "SaaS & Productivity",
      "brands": ["Notion", "ClickUp", "Airtable", "Zapier", "Monday.com"],
      "matchReason": "Episode discusses workflow optimization and team collaboration, directly matching Notion/ClickUp's target audience of knowledge workers and project managers.",
      "estimatedCPM": "$25-35 CPM",
      "typicalDeal": "60s host-read mid-roll, 6-12 episode commitment, landing page with promo code"
    }
  ],
  "targetAudienceProfile": "Knowledge workers aged 25-40, interested in productivity systems, likely use project management tools, engaged with self-improvement content.",
  "potentialAdSpots": [
    "5:30 - After discussing email overwhelm (natural transition to productivity tools)",
    "18:45 - Mid-episode discussing calendar blocking (perfect for Calendly/scheduling tools)",
    "32:00 - Conclusion discussing implementation (strong CTA moment)"
  ],
  "platformRecommendations": {
    "podcast": {
      "priority": "High",
      "cpmRange": "$25-35",
      "notes": "Host-read ads perform best for SaaS products. Mid-roll placement recommended."
    },
    "youtube": {
      "priority": "Medium",
      "cpmRange": "$15-25",
      "notes": "Video demonstrations of tools could work well. Consider sponsor integration segments."
    },
    "newsletter": {
      "priority": "High",
      "cpmRange": "$40-60",
      "notes": "Email newsletter to productivity-focused audience has excellent conversion potential."
    }
  },
  "actionableNextSteps": [
    "Create a one-page media kit with audience demographics and download stats",
    "Reach out to Notion and ClickUp via their brand partnerships pages",
    "Join Gumball marketplace to access automated sponsor matching",
    "Prepare 3 sample host-read ad scripts demonstrating your style",
    "Set up tracking links to demonstrate conversion rates to sponsors"
  ],
  "dataSources": [
    "IAB Podcast Advertising Revenue Report 2024",
    "Internal Sponsor Database (70+ brands)",
    "Axios Creator Economy Insights",
    "Industry CPM Benchmarks"
  ],
  "researchMetadata": {
    "researchPackVersion": "2026-01-05T...",
    "totalSponsorBrands": 70,
    "marketDataSources": ["IAB", "Axios", "Sponsor Database", "CPM Benchmarks"],
    "liveDataUsed": false,
    "categoriesMatched": 2
  }
}
```

## Why This Works

**Before (hallucinated):**
- Generic sponsor names ("Tool A", "Service X")
- Vague CPM ranges ("mid-market rates")
- No sourcing or transparency

**After (research-grounded):**
- Real brands actively sponsoring podcasts (Notion, ClickUp, AG1)
- Specific CPM ranges from IAB reports ("$25-35 CPM for podcast, $40-60 for newsletter")
- Transparent sourcing ("Based on IAB 2024 Report + 70-brand database")
- Actionable next steps ("Join Gumball marketplace", "Create media kit")

The AI now acts as an **analyst synthesizing real data**, not a creative writer inventing plausible-sounding recommendations.
