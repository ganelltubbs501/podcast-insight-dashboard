// Medium Integration Service
// Token-based API (no OAuth - user generates integration token from Medium settings)

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

export interface MediumStatus {
  connected: boolean;
  accountName?: string;
  userId?: string;
  username?: string;
  tokenExpired?: boolean;
}

export interface MediumProfile {
  id: string;
  username: string;
  name: string;
  imageUrl?: string;
}

/**
 * Get Medium auth URL - returns instructions page
 * Medium doesn't use OAuth, so we return a helper URL
 */
export function getMediumAuthUrl(): string {
  return 'https://medium.com/me/settings/security';
}

/**
 * Get Medium connection status
 */
export async function getMediumStatus(): Promise<MediumStatus> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/medium/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { connected: false };
    }

    const data = await response.json();
    return data.status || { connected: false };
  } catch (error) {
    console.error('Failed to fetch Medium status:', error);
    return { connected: false };
  }
}

/**
 * Connect Medium account with integration token
 */
export async function connectMedium(integrationToken: string): Promise<{ success: boolean; message: string; profile?: MediumProfile }> {
  try {
    const authToken = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/medium/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: integrationToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to connect Medium account',
      };
    }

    return {
      success: true,
      message: 'Medium connected successfully!',
      profile: data.profile,
    };
  } catch (error) {
    console.error('Failed to connect Medium:', error);
    return {
      success: false,
      message: 'Failed to connect Medium account. Please try again.',
    };
  }
}

/**
 * Disconnect Medium account
 */
export async function disconnectMedium(): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/medium/disconnect`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to disconnect Medium',
      };
    }

    return {
      success: true,
      message: 'Medium disconnected successfully',
    };
  } catch (error) {
    console.error('Failed to disconnect Medium:', error);
    return {
      success: false,
      message: 'Failed to disconnect Medium',
    };
  }
}

/**
 * Publish a post to Medium
 */
export async function publishToMedium(title: string, content: string, contentFormat: 'markdown' | 'html' = 'markdown'): Promise<{ success: boolean; message: string; postUrl?: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/medium/post`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        contentFormat,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to publish to Medium',
      };
    }

    return {
      success: true,
      message: 'Published to Medium successfully!',
      postUrl: data.postUrl,
    };
  } catch (error) {
    console.error('Failed to publish to Medium:', error);
    return {
      success: false,
      message: 'Failed to publish to Medium',
    };
  }
}
