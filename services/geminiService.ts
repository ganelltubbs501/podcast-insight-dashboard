import { AnalysisResult, Guest, SponsorshipInsights, AnalysisSettings, RepurposedContent } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

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
  return postJSON<Guest[]>('/api/guests', { context: _context });
};

export const generateOutreachEmail = async (
  _guestName: string,
  _guestBio: string,
  _context: string
): Promise<{ subject: string; body: string }> => {
  return postJSON('/api/outreach', { guestName: _guestName, guestBio: _guestBio, context: _context });
};

export const generateSponsorshipInsights = async (_context: string): Promise<SponsorshipInsights> => {
  return postJSON<SponsorshipInsights>('/api/sponsorship', { context: _context });
};

export const generateRepurposedContent = async (
  _type: "email_series" | "social_calendar" | "linkedin_article" | "image_prompts",
  _context: string
): Promise<Partial<RepurposedContent>> => {
  return postJSON<Partial<RepurposedContent>>('/api/repurpose', { type: _type, context: _context });
};
