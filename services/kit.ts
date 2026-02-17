// Kit (ConvertKit) Integration Service
// OAuth-based integration

import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Get the auth token from Supabase session
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return session.access_token;
}

export interface KitStatus {
  connected: boolean;
  accountName?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
  lastSyncAt?: string;
}

/**
 * Get Kit connection status
 */
export async function getKitStatus(): Promise<KitStatus> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/kit/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { connected: false };
    }

    const data = await response.json();
    return data || { connected: false };
  } catch (error) {
    console.error('Failed to fetch Kit status:', error);
    return { connected: false };
  }
}

/**
 * Get Kit OAuth URL to start connection
 */
export async function getKitAuthUrl(): Promise<string> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/api/integrations/kit/auth-url`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Kit auth URL');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Connect Kit - redirects to OAuth
 */
export async function connectKit(): Promise<void> {
  const authUrl = await getKitAuthUrl();
  window.location.href = authUrl;
}

/**
 * Disconnect Kit account
 */
/**
 * Send an email via Kit
 */
export async function sendKitEmail(to: string, subject: string, body: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/api/integrations/kit/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, body }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send email via Kit');
  }
}

export async function disconnectKit(): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/kit/disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to disconnect Kit',
      };
    }

    return {
      success: true,
      message: 'Kit disconnected successfully',
    };
  } catch (error) {
    console.error('Failed to disconnect Kit:', error);
    return {
      success: false,
      message: 'Failed to disconnect Kit',
    };
  }
}
