import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

function requireApi() {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function getJSON<T>(path: string): Promise<T> {
  requireApi();
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: 'include'
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

async function postJSON<T>(path: string, body: any): Promise<T> {
  requireApi();
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export const getKitAuthUrl = () => getJSON<{ url: string }>("/api/integrations/kit/auth-url");
export const getKitStatus = () => getJSON<{ connected: boolean; accountName?: string; tokenExpired?: boolean; expiresAt?: string; lastSyncAt?: string }>("/api/integrations/kit/status");
export const disconnectKit = () => postJSON<{ success: boolean; error?: string }>("/api/integrations/kit/disconnect", {});

export const getMailchimpAuthUrl = () => getJSON<{ url: string }>("/api/integrations/mailchimp/auth-url");
export const getMailchimpStatus = () => getJSON<{ connected: boolean; revoked?: boolean; tokenExpired?: boolean; status?: string; account?: any; lastSyncAt?: string }>("/api/integrations/mailchimp/status");
export const getMailchimpDestinations = () => getJSON<{ destinations: Array<{ id: string; name: string; audience_id: string }> }>("/api/integrations/mailchimp/destinations");
export const getMailchimpAutomations = (destinationId?: string) =>
  getJSON<{ automations: Array<{ id: string; name: string; destination_id: string; trigger_value: string }> }>(
    destinationId
      ? `/api/integrations/mailchimp/automations?destinationId=${encodeURIComponent(destinationId)}`
      : "/api/integrations/mailchimp/automations"
  );

export const triggerEpisodePublished = (payload: { transcriptId: string; episodeTitle: string }) =>
  postJSON<{ scheduled?: boolean; skipped?: boolean; reason?: string }>("/api/email/trigger/episode-published", payload);

export const scheduleNewsletterTrigger = (payload: {
  scheduledDate: string;
  content?: string;
  destinationId: string;
  automationId: string;
}) => postJSON<{ scheduled?: boolean; post?: any; error?: string }>("/api/email/schedule/newsletter", payload);
