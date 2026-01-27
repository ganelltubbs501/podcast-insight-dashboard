import Parser from 'rss-parser';

// Types for parsed RSS data
export interface ParsedPodcastFeed {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  language?: string;
  author?: string;
  categories: string[];
  explicit: boolean;
  items: ParsedEpisode[];
}

export interface ParsedEpisode {
  guid: string;
  title: string;
  publishedAt?: Date;
  durationSec?: number;
  audioUrl?: string;
  description?: string;
  episodeNumber?: number;
  seasonNumber?: number;
}

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

// Standard rss-parser instance
const parser = new Parser({
  customFields: {
    feed: ['itunes:author', 'itunes:explicit', 'itunes:image', 'itunes:category'],
    item: ['itunes:duration', 'itunes:episode', 'itunes:season'],
  },
});

/**
 * Fetch and parse an RSS feed URL
 */
export async function fetchAndParseRss(url: string): Promise<ParsedPodcastFeed> {
  console.log(`🎙️ Fetching RSS feed: ${url}`);

  const feed = await parser.parseURL(url);

  // Validate it's a podcast feed
  if (!validatePodcastFeed(feed)) {
    throw new Error('Invalid podcast feed: missing required iTunes tags or audio enclosures');
  }

  return extractPodcastData(feed);
}

/**
 * Validate that the feed is a podcast (has iTunes tags and audio enclosures)
 */
export function validatePodcastFeed(feed: any): boolean {
  // Check for iTunes namespace (most podcasts have this)
  const hasItunesTags = !!(
    feed['itunes:author'] ||
    feed['itunes:explicit'] ||
    feed['itunes:image'] ||
    feed['itunes:category']
  );

  // Check for at least one audio enclosure
  const hasAudioEnclosure = feed.items?.some(
    (item: any) =>
      item.enclosure?.url &&
      (item.enclosure.type?.startsWith('audio/') ||
        item.enclosure.url.match(/\.(mp3|m4a|wav|ogg|aac)$/i))
  );

  // Require at least one indicator
  return hasItunesTags || hasAudioEnclosure;
}

/**
 * Extract normalized podcast data from parsed feed
 */
function extractPodcastData(feed: any): ParsedPodcastFeed {
  // Extract categories from iTunes
  const categories: string[] = [];
  const itunesCategories = feed['itunes:category'];
  if (itunesCategories) {
    if (Array.isArray(itunesCategories)) {
      for (const cat of itunesCategories) {
        if (typeof cat === 'object' && cat.$?.text) {
          categories.push(cat.$.text);
        } else if (typeof cat === 'string') {
          categories.push(cat);
        }
      }
    } else if (typeof itunesCategories === 'object' && itunesCategories.$?.text) {
      categories.push(itunesCategories.$.text);
    }
  }

  // Get image URL (prefer iTunes image)
  const itunesImage = feed['itunes:image'];
  let imageUrl: string | undefined;
  if (typeof itunesImage === 'string') {
    imageUrl = itunesImage;
  } else if (itunesImage?.$ && itunesImage.$.href) {
    imageUrl = itunesImage.$.href;
  } else if (feed.image?.url) {
    imageUrl = feed.image.url;
  }

  // Get explicit flag
  const explicitValue = feed['itunes:explicit'];
  const explicit = typeof explicitValue === 'string' && explicitValue.toLowerCase() === 'yes';

  return {
    title: feed.title || 'Untitled Podcast',
    description: feed.description,
    link: feed.link,
    imageUrl,
    language: feed.language,
    author: feed['itunes:author'] || feed.creator,
    categories,
    explicit,
    items: (feed.items || []).map(extractEpisodeData),
  };
}

/**
 * Extract normalized episode data from RSS item
 */
function extractEpisodeData(item: any): ParsedEpisode {
  return {
    guid: item.guid || item.enclosure?.url || `episode-${Date.now()}-${Math.random()}`,
    title: item.title || 'Untitled Episode',
    publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
    durationSec: parseDuration(item['itunes:duration']),
    audioUrl: item.enclosure?.url,
    description: item.contentSnippet || item.content,
    episodeNumber: item['itunes:episode'] ? parseInt(item['itunes:episode'], 10) : undefined,
    seasonNumber: item['itunes:season'] ? parseInt(item['itunes:season'], 10) : undefined,
  };
}

/**
 * Parse iTunes duration format (HH:MM:SS or seconds) to seconds
 */
function parseDuration(duration?: string): number | undefined {
  if (!duration) return undefined;

  // If it's just a number (seconds)
  if (/^\d+$/.test(duration)) {
    return parseInt(duration, 10);
  }

  // Parse HH:MM:SS or MM:SS format
  const parts = duration.split(':').map(Number);
  if (parts.some(isNaN)) return undefined;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return undefined;
}

/**
 * Detect hosting provider from RSS URL
 */
export function detectProvider(rssUrl: string): PodcastProvider {
  const url = rssUrl.toLowerCase();

  const patterns: Array<{ pattern: RegExp; provider: PodcastProvider }> = [
    { pattern: /buzzsprout\.com/i, provider: 'buzzsprout' },
    { pattern: /libsyn\.com/i, provider: 'libsyn' },
    { pattern: /anchor\.fm/i, provider: 'anchor' },
    { pattern: /podbean\.com/i, provider: 'podbean' },
    { pattern: /spreaker\.com/i, provider: 'spreaker' },
    { pattern: /transistor\.fm/i, provider: 'transistor' },
    { pattern: /captivate\.fm/i, provider: 'captivate' },
    { pattern: /simplecast\.com/i, provider: 'simplecast' },
    { pattern: /megaphone\.fm/i, provider: 'megaphone' },
    { pattern: /acast\.com/i, provider: 'acast' },
    { pattern: /spotify\.com/i, provider: 'spotify' },
    { pattern: /podcasts\.apple\.com/i, provider: 'apple' },
    { pattern: /feeds\.apple\.com/i, provider: 'apple' },
  ];

  for (const { pattern, provider } of patterns) {
    if (pattern.test(url)) {
      return provider;
    }
  }

  return 'unknown';
}

/**
 * Get supported providers that have API integration
 */
export function getSupportedProviders(): PodcastProvider[] {
  // Currently supported for API integration
  // (Start with manual only, expand later)
  return ['buzzsprout', 'transistor', 'spotify'];
}
