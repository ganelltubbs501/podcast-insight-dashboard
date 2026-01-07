import fetch from 'node-fetch';

// Simple in-memory cache with TTL
const cache = new Map<string, { expiresAt: number; value: any }>();
const DEFAULT_TTL = 60 * 60; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached(key: string, value: any, ttl = DEFAULT_TTL) {
  cache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

// A small curated list of well-known SaaS brands to detect in transcript/context text.
const KNOWN_SAAS_BRANDS = [
  'Canva','Notion','Zapier','Airtable','Calendly','HubSpot','Asana','Trello','Slack','Monday','Figma','Miro','Todoist','Notion'
];

/** Extract known brand names (case-insensitive) from free text context. */
export function extractBrandsFromText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const b of KNOWN_SAAS_BRANDS) {
    if (lower.includes(b.toLowerCase())) found.add(b);
  }
  return Array.from(found);
}

/** Search iTunes/Apple Podcast for a show matching `term` */
export async function searchItunes(term: string): Promise<any> {
  const key = `itunes:${term}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=podcast&limit=5`;
    const res = await fetch(url);
    const json: any = await res.json();

    const results = (json.results || []).map((r: any) => ({
      collectionName: r.collectionName,
      artistName: r.artistName,
      feedUrl: r.feedUrl,
      collectionViewUrl: r.collectionViewUrl,
    }));

    setCached(key, results);
    return results;
  } catch (e) {
    console.error('iTunes search failed', e);
    return null;
  }
}

/** Fetch a podcast RSS feed and extract simple metadata and recent episodes.
 *  Uses `rss-parser` when available and falls back to a tolerant regex parser.
 */
export async function fetchRSSSummary(feedUrl: string): Promise<any> {
  const key = `rss:${feedUrl}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(feedUrl, { headers: { 'User-Agent': 'podcast-insight/1.0 (+https://podcastinsight.example)' } });
    if (!res.ok) throw new Error(`Failed to fetch feed ${res.status}`);
    const text = await res.text();

    // Prefer using the rss-parser package when available for robust parsing
    try {
      const RSSParser = (await import('rss-parser')).default;
      const parser = new RSSParser();
      const parsed: any = await parser.parseString(text);

      const items = (parsed.items || []).slice(0, 5).map((it: any) => ({
        title: it.title,
        link: it.link,
        pubDate: it.pubDate,
        contentSnippet: it.contentSnippet || it.content || undefined,
      }));

      const combined = `${parsed.title || ''} ${parsed.description || ''} ${items.map((i: any) => (i.title || '') + ' ' + (i.contentSnippet || '')).join(' ')}`;
      const sponsorMatches = (combined.match(/sponsor|sponsored|partner|brought to you by/gi) || []).length;

      // Try to extract explicit sponsor names from parsed content
      const sponsorCandidates: any[] = [];
      try {
        // Pattern: 'sponsored by <Name>' or 'brought to you by <Name>'
        const sponsorRegex = /(?:sponsored by|brought to you by|presented by)\s+([A-Z][^\n<,]{2,120})/ig;
        let m: RegExpExecArray | null;
        while ((m = sponsorRegex.exec(combined))) {
          const name = m[1].trim().replace(/\.$/, '');
          sponsorCandidates.push({ name });
        }

        // Pattern: anchor text after sponsorship phrases: 'sponsored by <a>Brand</a>'
        const anchorRegex = /(?:sponsored by|brought to you by|presented by)[\s\S]{0,80}<a[^>]*>([^<]+)<\/a>/ig;
        while ((m = anchorRegex.exec(text))) {
          const name = m[1].trim();
          sponsorCandidates.push({ name });
        }

        // Additional heuristic: look for 'use code' lines which often include brand references
        const codeRegex = /use code\s*[:\-]?\s*([A-Z0-9_-]{3,15})/ig;
        while ((m = codeRegex.exec(text))) {
          sponsorCandidates.push({ promoCode: m[1] });
        }
      } catch (e) {
        console.warn('Sponsor extraction heuristics failed', e);
      }

      const summary = { feedUrl, title: parsed.title, description: parsed.description, itemCount: parsed.items?.length || items.length, recent: items, sponsorMentions: sponsorMatches, sponsorCandidates };
      setCached(key, summary);
      return summary;
    } catch (e) {
      // If rss-parser isn't available or parsing failed, fall back to a tolerant regex-based parser
      console.warn('rss-parser not available or parsing failed, using fallback parser', e);

      const items: { title?: string; link?: string }[] = [];
      const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || [];
      for (const item of itemMatches.slice(0, 5)) {
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
        items.push({ title: titleMatch?.[1]?.trim(), link: linkMatch?.[1]?.trim() });
      }

      const sponsorMatches = (text.match(/sponsor|sponsored|partner|brought to you by/gi) || []).length;

      // Attempt simple sponsor extraction from raw feed text
      const sponsorCandidates: any[] = [];
      try {
        const sponsorRegex = /(?:sponsored by|brought to you by|presented by)\s+([A-Z][^\n<,]{2,120})/ig;
        let m: RegExpExecArray | null;
        while ((m = sponsorRegex.exec(text))) {
          const name = m[1].trim().replace(/\.$/, '');
          sponsorCandidates.push({ name });
        }

        const anchorRegex = /(?:sponsored by|brought to you by|presented by)[\s\S]{0,80}<a[^>]*>([^<]+)<\/a>/ig;
        while ((m = anchorRegex.exec(text))) {
          sponsorCandidates.push({ name: m[1].trim() });
        }
      } catch (e) {
        console.warn('Sponsor extraction heuristics failed', e);
      }

      const summary = { feedUrl, itemCount: itemMatches.length, recent: items, sponsorMentions: sponsorMatches, sponsorCandidates };
      setCached(key, summary);
      return summary;
    }
  } catch (e) {
    console.error('RSS fetch failed', e);
    return null;
  }
}

/** Get YouTube channel stats using the YouTube Data API. Accepts channelId or search term */
export async function getYouTubeStats(query: string, apiKey?: string): Promise<any> {
  if (!apiKey) return null;
  const key = `youtube:${query}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    // First, try to treat query as a channel ID
    let channelId = null;
    // If looks like UC... assume channel id
    if (/^UC[0-9A-Za-z_-]{22}$/.test(query)) {
      channelId = query;
    } else {
      // Search for a channel by query
      const sUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=1`;
      const sRes = await fetch(sUrl);
      const sJson: any = await sRes.json();
      channelId = sJson.items?.[0]?.snippet?.channelId;
    }

    if (!channelId) return null;
    const cUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
    const cRes = await fetch(cUrl);
    const cJson: any = await cRes.json();
    const ch = cJson.items?.[0];
    if (!ch) return null;

    const stats = {
      id: channelId,
      title: ch.snippet.title,
      description: ch.snippet.description,
      subscribers: ch.statistics.subscriberCount ? Number(ch.statistics.subscriberCount) : null,
      viewCount: ch.statistics.viewCount ? Number(ch.statistics.viewCount) : null,
      videoCount: ch.statistics.videoCount ? Number(ch.statistics.videoCount) : null,
    };

    setCached(key, stats);
    return stats;
  } catch (e) {
    console.error('YouTube lookup failed', e);
    return null;
  }
}

/** Search Reddit (public) for mentions of a query */
export async function searchReddit(query: string) {
  const key = `reddit:${query}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=5&sort=top&t=year`;
    const res = await fetch(url, { headers: { 'User-Agent': 'podcast-insight/1.0' } });
    if (!res.ok) return null;
    const json: any = await res.json();
    const posts = (json.data?.children || []).map((p: any) => ({ title: p.data.title, subreddit: p.data.subreddit, score: p.data.score, url: `https://reddit.com${p.data.permalink}` }));
    setCached(key, posts);
    return posts;
  } catch (e) {
    console.error('Reddit search failed', e);
    return null;
  }
}

/** Check the Internet Archive (Wayback) for snapshots of a URL */
export async function checkWayback(url: string) {
  const key = `wayback:${url}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const api = `http://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const res = await fetch(api);
    const json: any = await res.json();
    setCached(key, json);
    return json;
  } catch (e) {
    console.error('Wayback check failed', e);
    return null;
  }
}

/** Spotify connector: Client Credentials flow + show search */
async function getSpotifyToken(): Promise<any> {
  const cached = getCached<string>('spotify:token');
  if (cached) return cached;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const json: any = await res.json();
    if (!json.access_token) return null;
    setCached('spotify:token', json.access_token, json.expires_in ? Math.floor(json.expires_in / 2) : 3500);
    return json.access_token;
  } catch (e) {
    console.error('Spotify token fetch failed', e);
    return null;
  }
}

export async function getSpotifyShow(query: string): Promise<any> {
  const key = `spotify:${query}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const token = await getSpotifyToken();
    if (!token) return null;
    const sUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=show&limit=1`;
    const sRes = await fetch(sUrl, { headers: { Authorization: `Bearer ${token}` } });
    const sJson: any = await sRes.json();
    const show = sJson.shows?.items?.[0];
    if (!show) return null;

    const data = {
      id: show.id,
      name: show.name,
      publisher: show.publisher,
      total_episodes: show.total_episodes,
      description: show.description,
      link: show.external_urls?.spotify,
    };

    setCached(key, data);
    return data;
  } catch (e) {
    console.error('Spotify lookup failed', e);
    return null;
  }
}

/** Google Trends lightweight connector (best-effort) */
export async function getGoogleTrends(query: string): Promise<any> {
  const key = `trends:${query}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    // Use the explore API; note this is an undocumented endpoint and may fail if Google blocks requests
    const req = { comparisonItem: [{ keyword: query, geo: '', time: 'today 12-m' }], category: 0, property: '' };
    const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(req))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'podcast-insight/1.0' } });
    if (!res.ok) throw new Error(`Trends API returned ${res.status}`);
    let text = await res.text();

    // The API sometimes prefixes with ")]}',\n"
    // strip that prefix if present
    text = text.replace(/^\)\]\}'\,\n/, '');
    const json: any = JSON.parse(text);
    setCached(key, json);
    return json;
  } catch (e) {
    console.error('Google Trends fetch failed', e);
    return null;
  }
}

/**
 * Estimate realistic podcast metrics based on available data
 * Returns estimates for downloads per episode and appropriate CPM rates
 */
export function estimatePodcastMetrics(enrichmentData: any): {
  estimatedDownloads: number;
  estimatedCPM: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
} {
  let downloads = 1000; // Conservative default
  let cpm = 18; // Lower end of podcast CPM range
  let confidence: 'low' | 'medium' | 'high' = 'low';
  const reasons: string[] = [];

  // Check Spotify data for episode count (indicator of show maturity)
  if (enrichmentData?.spotify?.total_episodes) {
    const episodes = enrichmentData.spotify.total_episodes;
    if (episodes > 100) {
      downloads = 3000;
      reasons.push('Established show (100+ episodes)');
      confidence = 'medium';
    } else if (episodes > 50) {
      downloads = 2000;
      reasons.push('Growing show (50+ episodes)');
    } else {
      downloads = 1200;
      reasons.push('Newer show (<50 episodes)');
    }
  }

  // Check YouTube stats if available
  if (enrichmentData?.youtube?.subscriberCount) {
    const subs = enrichmentData.youtube.subscriberCount;
    // Rough conversion: 10-20% of YouTube subscribers listen to podcast
    const estimatedFromYT = Math.floor(subs * 0.15);
    if (estimatedFromYT > downloads) {
      downloads = Math.min(estimatedFromYT, 50000); // Cap at 50k for realism
      reasons.push(`YouTube audience: ${subs.toLocaleString()} subscribers`);
      confidence = 'high';
    }
  }

  // Check for sponsor presence (indicates monetization tier)
  if (enrichmentData?.rss?.sponsorCandidates?.length > 0) {
    // Shows with active sponsors typically have decent audience
    if (downloads < 2500) downloads = 2500;
    cpm = 25; // Mid-tier CPM
    reasons.push('Has active sponsors');
    confidence = 'medium';
  }

  // Check iTunes/RSS feed data
  if (enrichmentData?.rss?.itemCount > 50) {
    if (downloads < 2000) downloads = 2000;
    reasons.push('Consistent publishing (50+ episodes in feed)');
  }

  // Adjust CPM based on niche indicators
  if (enrichmentData?.contextBrands?.length > 0) {
    // SaaS/Tech brands mentioned = likely tech/business niche
    cpm = 30; // Tech/business podcasts command premium CPM
    reasons.push('Tech/business niche (premium CPM)');
  }

  // Reddit mentions indicate community engagement
  if (enrichmentData?.reddit?.totalResults > 5) {
    if (downloads < 3000) downloads = 3000;
    reasons.push('Active community discussion');
    confidence = 'medium';
  }

  return {
    estimatedDownloads: downloads,
    estimatedCPM: cpm,
    confidence,
    reasoning: reasons.join('; ') || 'Using conservative baseline estimates'
  };
}

/** High-level enrichment pipeline for sponsorship candidate generation */
export async function enrichForSponsorship(context: string, options: { youtubeApiKey?: string } = {}): Promise<any> {
  // Derive a short term to search for shows/hosts
  const term = (context?.split('\n')?.[0] || context || '').substring(0, 120).trim();

  // Extract explicit brand mentions from the provided context (transcript or notes)
  const contextBrands = extractBrandsFromText(context || '');

  const [itunes, youtube, reddit, spotify, trends] = await Promise.all([
    searchItunes(term),
    getYouTubeStats(term, options.youtubeApiKey),
    searchReddit(term),
    getSpotifyShow(term),
    getGoogleTrends(term),
  ]);

  // If iTunes gave us a feed, fetch its RSS summary
  let rss = null;
  if (Array.isArray(itunes) && itunes.length > 0 && itunes[0].feedUrl) {
    try {
      rss = await fetchRSSSummary(itunes[0].feedUrl);
    } catch (e) {
      console.error('RSS summary failed', e);
    }
  }

  // Wayback for the show's feed or website
  let wayback = null;
  if (rss?.feedUrl) {
    wayback = await checkWayback(rss.feedUrl);
  }

  const sources = ['itunes', 'rss', 'youtube', 'reddit', 'wayback'];
  if (spotify) sources.push('spotify');
  if (trends) sources.push('trends');

  const enrichmentData = {
    term,
    itunes,
    rss,
    youtube,
    reddit,
    wayback,
    spotify,
    trends,
    contextBrands,
    sources,
  };

  // Calculate realistic metrics based on available data
  const metrics = estimatePodcastMetrics(enrichmentData);

  return {
    ...enrichmentData,
    metrics,
  };
}
