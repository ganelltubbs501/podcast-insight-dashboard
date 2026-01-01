import { AnalysisResult, Guest, SponsorshipInsights, AnalysisSettings, RepurposedContent } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
// If API_BASE_URL is not configured, provide local dev stubs so UI actions don't throw.
const isStub = !API_BASE_URL;

/**
 * POST helper with good error messages
 */
async function postJSON<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export const analyzeTranscript = async (
  contentInput: string | { inlineData: { mimeType: string; data: string } },
  settings?: AnalysisSettings
): Promise<AnalysisResult> => {
  return postJSON<AnalysisResult>("/api/analyze", { contentInput, settings });
};

/**
 * The following functions are still implemented as "not wired yet".
 * We'll wire them after we confirm the analysis path is stable.
 */
export const suggestGuests = async (_context: string): Promise<Guest[]> => {
  if (isStub) {
    // Return a few friendly mock guests for local dev
    return [
      { id: 'g1', name: 'Alex Rivera', title: 'Founder, AudioTech', bio: 'Host & creator focused on podcast growth', expertise: ['audio', 'growth'], status: 'Suggested', matchReason: 'Topical overlap' },
      { id: 'g2', name: 'Jamie Lopez', title: 'CMO, PodCo', bio: 'Marketing leader, audience building', expertise: ['marketing', 'audience'], status: 'Suggested', matchReason: 'Sponsor-friendly' },
    ];
  }
  return postJSON<Guest[]>('/api/guests', { context: _context });
};

export const generateOutreachEmail = async (
  _guestName: string,
  _guestBio: string,
  _context: string
): Promise<{ subject: string; body: string }> => {
  if (isStub) {
    return {
      subject: `Invitation to be a guest on our podcast`,
      body: `Hi ${_guestName},\n\nI loved your work on ${_guestBio}. Would you be interested in joining us to discuss ${_context.split('\n')[0]}?\n\nBest,\nPodcast Team`
    };
  }
  return postJSON('/api/outreach', { guestName: _guestName, guestBio: _guestBio, context: _context });
};

export const generateSponsorshipInsights = async (_context: string): Promise<SponsorshipInsights> => {
  if (isStub) {
    return {
      score: 68,
      reasoning: 'This episode covers topics attractive to tech-savvy creators and startup founders, with clear mid-roll spot opportunities.',
      suggestedSponsors: [
        { industry: 'Audio Tools', brands: ['ClearMic', 'MixPro'], matchReason: 'Product fits creator workflow' },
        { industry: 'Hosting Platforms', brands: ['PodHost', 'Streamline'], matchReason: 'Audience likely interested in hosting & analytics' }
      ],
      targetAudienceProfile: 'Creators and indie podcasters interested in monetization and audience growth.',
      potentialAdSpots: ['Pre-roll: Quick intro sponsor plug', 'Mid-roll: Host-read product segment']
    } as SponsorshipInsights;
  }
  return postJSON<SponsorshipInsights>('/api/sponsorship', { context: _context });
};

export const generateRepurposedContent = async (
  _type: "email_series" | "social_calendar" | "linkedin_article" | "image_prompts",
  _context: string
): Promise<Partial<RepurposedContent>> => {
  if (isStub) {
    if (_type === 'email_series') {
      return {
        emailSeries: [
          { day: 1, subject: 'Quick takeaways', body: 'Here are the highlights...', goal: 'Engage' },
          { day: 3, subject: 'Deep dive', body: 'A deeper look at topic X...', goal: 'Educate' }
        ]
      };
    }
    if (_type === 'social_calendar') {
      return {
        socialCalendar: [
          { day: 1, platform: 'LinkedIn', type: 'Insight', content: 'Key takeaway: ...' },
          { day: 3, platform: 'Twitter', type: 'Quote', content: 'Memorable quote: ...' }
        ]
      };
    }
    if (_type === 'linkedin_article') {
      return { linkedinArticle: 'Draft LinkedIn article based on episode highlights.' };
    }
    return { imagePrompts: [{ quote: 'Great quote', prompt: 'A modern flat illustration with bold typography' }] };
  }

  return postJSON<Partial<RepurposedContent>>('/api/repurpose', { type: _type, context: _context });
};
