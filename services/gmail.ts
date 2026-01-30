// Gmail API Service for sending emails
import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface GmailStatus {
  connected: boolean;
  email?: string;
  name?: string;
}

export interface GmailSendResult {
  success: boolean;
  messageId: string;
  threadId: string;
}

/**
 * Get Gmail OAuth URL to start connection flow
 */
export async function getGmailAuthUrl(): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/integrations/gmail/auth-url`, { headers });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to get Gmail auth URL');
  }

  const data = await res.json();
  return data.authUrl;
}

/**
 * Get Gmail connection status
 */
export async function getGmailStatus(): Promise<GmailStatus> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/integrations/gmail/status`, { headers });

  if (!res.ok) {
    throw new Error('Failed to get Gmail status');
  }

  return res.json();
}

/**
 * Disconnect Gmail
 */
export async function disconnectGmail(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/integrations/gmail/disconnect`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to disconnect Gmail');
  }
}

/**
 * Send email via Gmail
 */
export async function sendGmailEmail(
  to: string,
  subject: string,
  body: string
): Promise<GmailSendResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/integrations/gmail/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, subject, body }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to send email');
  }

  return res.json();
}
