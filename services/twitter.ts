/**
 * X Integration Service
 * Handles OAuth connection and posting to X
 */

import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface TwitterStatus {
  connected: boolean;
  accountName?: string;
  username?: string;
  accountId?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
}

export interface TwitterPostResult {
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
 * Get Twitter OAuth authorization URL
 * Redirects user to Twitter to grant access
 */
export async function getTwitterAuthUrl(): Promise<string> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/twitter/auth-url`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get Twitter auth URL');
  }

  const data = await response.json();
  return data.authUrl;
}

/**
 * Check Twitter connection status
 */
export async function getTwitterStatus(): Promise<TwitterStatus> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/twitter/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check Twitter status');
  }

  return response.json();
}

/**
 * Disconnect Twitter account
 */
export async function disconnectTwitter(): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/twitter/disconnect`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect Twitter');
  }
}

/**
 * Post content to Twitter
 */
export async function postToTwitter(
  content: string,
  options?: {
    replyToTweetId?: string;
    quoteTweetId?: string;
  }
): Promise<TwitterPostResult> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/twitter/post`, {
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
      error: data.error || 'Failed to post to Twitter',
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
 * Start Twitter OAuth flow
 * Opens Twitter authorization and redirects
 */
export async function connectTwitter(): Promise<void> {
  const authUrl = await getTwitterAuthUrl();

  // Redirect to Twitter OAuth
  window.location.href = authUrl;
}
