/**
 * LinkedIn Integration Service
 * Handles OAuth connection and posting to LinkedIn
 */

import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface LinkedInStatus {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
}

interface LinkedInPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  reconnectRequired?: boolean;
}

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

/**
 * Get LinkedIn OAuth authorization URL
 * Redirects user to LinkedIn to grant access
 */
export async function getLinkedInAuthUrl(): Promise<string> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/linkedin/auth-url`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get LinkedIn auth URL');
  }

  const data = await response.json();
  return data.authUrl;
}

/**
 * Check LinkedIn connection status
 */
export async function getLinkedInStatus(): Promise<LinkedInStatus> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/linkedin/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check LinkedIn status');
  }

  return response.json();
}

/**
 * Disconnect LinkedIn account
 */
export async function disconnectLinkedIn(): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/linkedin/disconnect`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect LinkedIn');
  }
}

/**
 * Post content to LinkedIn
 */
export async function postToLinkedIn(
  content: string,
  options?: {
    mediaUrl?: string;
    mediaTitle?: string;
    mediaDescription?: string;
  }
): Promise<LinkedInPostResult> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/linkedin/post`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      ...options,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Failed to post to LinkedIn',
      reconnectRequired: data.reconnectRequired,
    };
  }

  return {
    success: true,
    postId: data.postId,
    postUrl: data.postUrl,
  };
}

/**
 * Start LinkedIn OAuth flow
 * Opens LinkedIn authorization in a popup or redirects
 */
export async function connectLinkedIn(): Promise<void> {
  const authUrl = await getLinkedInAuthUrl();

  // Redirect to LinkedIn OAuth
  window.location.href = authUrl;
}
