import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
console.log("API_BASE =", API_BASE);
function requireApi() {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');
}

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Get auth headers
 */
async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
  const headers = await getHeaders();

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

// Guests
export async function getGuests() {
  return getJSON('/api/guests');
}
export async function addGuest(guest: any) {
  return postJSON('/api/guests', guest);
}
export async function updateGuest(id: string, updates: any) {
  return postJSON(`/api/guests/${id}`, updates);
}
export async function deleteGuest(id: string) {
  return postJSON(`/api/guests/${id}/delete`, {});
}

// API Keys & Webhooks
export async function getApiKeys() { return getJSON('/api/keys'); }
export async function generateApiKey(name: string) { return postJSON('/api/keys', { name }); }
export async function revokeApiKey(id: string) { return postJSON(`/api/keys/${id}/revoke`, {}); }

export async function getWebhooks() { return getJSON('/api/webhooks'); }
export async function addWebhook(payload: any) { return postJSON('/api/webhooks', payload); }
export async function deleteWebhook(id: string) { return postJSON(`/api/webhooks/${id}/delete`, {}); }
export async function testWebhook(id: string) { return postJSON(`/api/webhooks/${id}/test`, {}); }

// Help
export async function getHelpArticles() { return getJSON('/api/help/articles'); }
export async function getTutorials() { return getJSON('/api/help/tutorials'); }
export async function sendSupportTicket(subject: string, message: string) { return postJSON('/api/help/ticket', { subject, message }); }

// Branding / Account

// Team
export async function getTeamMembers() { return getJSON('/api/team/members'); }
export async function inviteTeamMember(email: string, role: string) { return postJSON('/api/team/invite', { email, role }); }
export async function removeTeamMember(id: string) { return postJSON(`/api/team/${id}/remove`, {}); }
export async function getActivityLog() { return getJSON('/api/team/activity'); }

// Fallback exports for other pages to import in a production setup
export default {
  getGuests, addGuest, updateGuest, deleteGuest,
  getApiKeys, generateApiKey, revokeApiKey, getWebhooks, addWebhook, deleteWebhook, testWebhook,
  getHelpArticles, getTutorials, sendSupportTicket,
  getTeamMembers, inviteTeamMember, removeTeamMember, getActivityLog,
};
