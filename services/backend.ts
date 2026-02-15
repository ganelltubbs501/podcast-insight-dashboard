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

// User / Plan
export interface MeResponse {
  id: string;
  email: string | null;
  plan: string;
  betaExpiresAt: string | null;
  graceExpiresAt: string | null;
  daysRemaining: number | null;
  graceDaysRemaining: number | null;
}
export async function getMe(): Promise<MeResponse> {
  return getJSON<MeResponse>('/api/me');
}

export interface UsageResponse {
  plan: string;
  usage: { analyses: number; scheduledPosts: number; activeAutomations: number };
  limits: { analysesPerCycle: number | null; scheduledPostsPerCycle: number | null; activeAutomations: number | null };
  nearLimit: { analyses: boolean; scheduledPosts: boolean; automations: boolean } | null;
  isUnlimited: boolean;
  cycleStart: string;
  cycleEnd: string;
}
export async function getUsage(): Promise<UsageResponse> {
  return getJSON<UsageResponse>('/api/me/usage');
}

// Billing
export async function createCheckoutSession(plan: string, interval: string) {
  return postJSON<{ url: string }>('/api/billing/checkout', { plan, interval });
}
export async function createPortalSession() {
  return postJSON<{ url: string }>('/api/billing/portal', {});
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

// ============================================================================
// TEAM COLLABORATION
// ============================================================================

// Helper for PATCH requests
async function patchJSON<T>(path: string, body: any): Promise<T> {
  requireApi();
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
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

// Helper for DELETE requests
async function deleteJSON<T>(path: string): Promise<T> {
  requireApi();
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
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

// Team Types
export interface Team {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  isOwner: boolean;
  pricingTier: string;
  maxMembers: number;
  joinedAt: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  email: string;
  name: string;
  joinedAt: string;
}

export interface TeamPermissions {
  canViewAnalytics: boolean;
  canSchedule: boolean;
  canPublishNow: boolean;
  canConnectAccounts: boolean;
  canManageMembers: boolean;
  canBilling: boolean;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  inviteUrl?: string;
  teamName?: string;
  emailSent?: boolean;
}

export interface IntegrationStatus {
  connected: boolean;
  accountName?: string;
  scopes?: string[];
  tokenExpired?: boolean;
  expiresAt?: string;
}

// Teams
export async function createTeam(name: string): Promise<Team> {
  return postJSON('/api/team', { name });
}

export async function getTeams(): Promise<Team[]> {
  return getJSON('/api/team');
}

export async function getTeamDetails(teamId: string) {
  return getJSON(`/api/team/${teamId}`);
}

export async function updateTeam(teamId: string, updates: { name?: string }) {
  return patchJSON(`/api/team/${teamId}`, updates);
}

// Members
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return getJSON(`/api/team/${teamId}/members`);
}

export async function updateMemberRole(teamId: string, userId: string, role: string) {
  return patchJSON(`/api/team/${teamId}/members/${userId}`, { role });
}

export async function removeMember(teamId: string, userId: string) {
  return deleteJSON(`/api/team/${teamId}/members/${userId}`);
}

// Invites
export async function createInvite(teamId: string, email: string, role: string): Promise<TeamInvite> {
  return postJSON(`/api/team/${teamId}/invites`, { email, role });
}

export async function getInvites(teamId: string): Promise<TeamInvite[]> {
  return getJSON(`/api/team/${teamId}/invites`);
}

export async function acceptInvite(token: string): Promise<{ success: boolean; teamId: string; teamName: string; role: string }> {
  return postJSON('/api/team/invites/accept', { token });
}

export async function revokeInvite(teamId: string, inviteId: string) {
  return postJSON(`/api/team/${teamId}/invites/${inviteId}/revoke`, {});
}

// Permissions
export async function getMyPermissions(teamId: string): Promise<{ teamId: string; role: string; permissions: TeamPermissions }> {
  return getJSON(`/api/team/${teamId}/me`);
}

// Integrations
export async function getTeamIntegrationStatus(teamId: string): Promise<Record<string, IntegrationStatus>> {
  return getJSON(`/api/team/${teamId}/integrations/status`);
}

// Legacy exports (for backward compatibility)
export async function getActivityLog() { return getJSON('/api/team/activity'); }

// Fallback exports for other pages to import in a production setup
export default {
  getGuests, addGuest, updateGuest, deleteGuest,
  getApiKeys, generateApiKey, revokeApiKey, getWebhooks, addWebhook, deleteWebhook, testWebhook,
  getHelpArticles, getTutorials, sendSupportTicket,
  createTeam, getTeams, getTeamDetails, updateTeam,
  getTeamMembers, updateMemberRole, removeMember,
  createInvite, getInvites, acceptInvite, revokeInvite,
  getMyPermissions, getTeamIntegrationStatus, getActivityLog,
};
