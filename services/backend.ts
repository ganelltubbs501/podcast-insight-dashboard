const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
function requireApi() {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');
}

async function getJSON<T>(path: string): Promise<T> {
  requireApi();
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

async function postJSON<T>(path: string, body: any): Promise<T> {
  requireApi();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
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

// Calendar / Scheduling
export async function getScheduledPosts() { return getJSON('/api/schedule'); }
export async function schedulePost(post: any) { return postJSON('/api/schedule', post); }
export async function deleteScheduledPost(id: string) { return postJSON(`/api/schedule/${id}/delete`, {}); }

// Help
export async function getHelpArticles() { return getJSON('/api/help/articles'); }
export async function getTutorials() { return getJSON('/api/help/tutorials'); }
export async function sendSupportTicket(subject: string, message: string) { return postJSON('/api/help/ticket', { subject, message }); }

// Branding / Account
export async function updateBrandingSettings(settings: any) { return postJSON('/api/account/branding', settings); }

// Team
export async function getTeamMembers() { return getJSON('/api/team/members'); }
export async function inviteTeamMember(email: string, role: string) { return postJSON('/api/team/invite', { email, role }); }
export async function removeTeamMember(id: string) { return postJSON(`/api/team/${id}/remove`, {}); }
export async function getActivityLog() { return getJSON('/api/team/activity'); }

// Fallback exports for other pages to import in a production setup
export default {
  getGuests, addGuest, updateGuest, deleteGuest,
  getApiKeys, generateApiKey, revokeApiKey, getWebhooks, addWebhook, deleteWebhook, testWebhook,
  getScheduledPosts, schedulePost, deleteScheduledPost,
  getHelpArticles, getTutorials, sendSupportTicket,
  updateBrandingSettings,
  getTeamMembers, inviteTeamMember, removeTeamMember, getActivityLog,
};
