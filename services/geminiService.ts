import { AnalysisResult, Guest, SponsorshipInsights, AnalysisSettings, RepurposedContent } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
console.log("API_BASE_URL =", API_BASE_URL);

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
  throw new Error("Not wired yet. Next step will add /api/guests endpoint.");
};

export const generateOutreachEmail = async (
  _guestName: string,
  _guestBio: string,
  _context: string
): Promise<{ subject: string; body: string }> => {
  throw new Error("Not wired yet. Next step will add /api/outreach endpoint.");
};

export const generateSponsorshipInsights = async (_context: string): Promise<SponsorshipInsights> => {
  throw new Error("Not wired yet. Next step will add /api/sponsorship endpoint.");
};

export const generateRepurposedContent = async (
  _type: "email_series" | "social_calendar" | "linkedin_article" | "image_prompts",
  _context: string
): Promise<Partial<RepurposedContent>> => {
  throw new Error("Not wired yet. Next step will add /api/repurpose endpoint.");
};
