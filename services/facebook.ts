/**
 * Facebook Integration Service
 * Handles OAuth connection and posting to Facebook Pages
 */

import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface FacebookStatus {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
  selectedPage?: {
    id: string;
    name: string;
  } | null;
}

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPostResult {
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
 * Get Facebook OAuth authorization URL
 * Redirects user to Facebook to grant access
 */
export async function getFacebookAuthUrl(): Promise<string> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/facebook/auth-url`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get Facebook auth URL');
  }

  const data = await response.json();
  return data.authUrl;
}

/**
 * Check Facebook connection status
 */
export async function getFacebookStatus(): Promise<FacebookStatus> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/facebook/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check Facebook status');
  }

  return response.json();
}

/**
 * Get list of Facebook Pages the user manages
 */
export async function getFacebookPages(): Promise<FacebookPage[]> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/facebook/pages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch Facebook pages');
  }

  const data = await response.json();
  return data.pages;
}

/**
 * Select a Facebook Page for posting
 */
export async function selectFacebookPage(pageId: string): Promise<{ id: string; name: string }> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/facebook/select-page`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to select Facebook page');
  }

  const data = await response.json();
  return data.selectedPage;
}

/**
 * Disconnect Facebook account
 */
export async function disconnectFacebook(): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/facebook/disconnect`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect Facebook');
  }
}

/**
 * Post content to Facebook Page
 */
export async function postToFacebook(
  content: string,
  options?: {
    link?: string;
  }
): Promise<FacebookPostResult> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/integrations/facebook/post`, {
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
      error: data.error || 'Failed to post to Facebook',
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
 * Start Facebook OAuth flow
 * Opens Facebook authorization and redirects
 */
export async function connectFacebook(): Promise<void> {
  const authUrl = await getFacebookAuthUrl();

  // Redirect to Facebook OAuth
  window.location.href = authUrl;
}
