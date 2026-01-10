import { AnalysisResult, Guest, SponsorshipInsights, AnalysisSettings, RepurposedContent } from "../types";
import { MonetizationInput, MonetizationInsights } from "../types/monetization";
import { supabase } from "../lib/supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not configured");

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * POST helper with authentication and good error messages
 */
async function postJSON<T>(path: string, body: any): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Handle 401 Unauthorized
    if (res.status === 401) {
      throw new Error("Authentication required. Please log in again.");
    }

    const text = await res.text().catch(() => "");
    let errorMessage = text || res.statusText;

    // Try to parse JSON error response
    try {
      const errorData = JSON.parse(text);
      if (errorData.error) {
        errorMessage = errorData.error;
        if (errorData.details && Array.isArray(errorData.details)) {
          errorMessage += ": " + errorData.details.join(", ");
        }
      }
    } catch {
      // Not JSON, use text as-is
    }

    throw new Error(`API ${res.status}: ${errorMessage}`);
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

export const generateSponsorshipInsights = async (_context: string, useLiveData: boolean = false): Promise<SponsorshipInsights> => {
  return postJSON<SponsorshipInsights>('/api/sponsorship', { context: _context, useLiveData });
};

export const generateRepurposedContent = async (
  _type: "email_series" | "social_calendar" | "linkedin_article" | "image_prompts",
  _context: string
): Promise<Partial<RepurposedContent>> => {
  return postJSON<Partial<RepurposedContent>>('/api/repurpose', { type: _type, context: _context });
};

export const generateTruthBasedMonetization = async (
  _context: string,
  monetizationInput: MonetizationInput
): Promise<MonetizationInsights> => {
  return postJSON<MonetizationInsights>('/api/monetization', { context: _context, monetizationInput });
};
