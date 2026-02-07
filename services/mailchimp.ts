// Mailchimp Integration Service
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

export interface MailchimpStatus {
  connected: boolean;
  account?: {
    accountId?: string;
    accountName?: string;
    email?: string;
  };
  revoked?: boolean;
  tokenExpired?: boolean;
}

export interface MailchimpAudience {
  id: string;
  name: string;
  memberCount: number;
}

/**
 * Get Mailchimp connection status
 */
export async function getMailchimpStatus(): Promise<MailchimpStatus> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/mailchimp/status`, {
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
    console.error('Failed to fetch Mailchimp status:', error);
    return { connected: false };
  }
}

/**
 * Get Mailchimp OAuth URL to start connection
 */
export async function getMailchimpAuthUrl(): Promise<string> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/api/integrations/mailchimp/auth-url`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Mailchimp auth URL');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Connect Mailchimp - redirects to OAuth
 */
export async function connectMailchimp(): Promise<void> {
  const authUrl = await getMailchimpAuthUrl();
  window.location.href = authUrl;
}

/**
 * Disconnect Mailchimp account
 */
export async function disconnectMailchimp(): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/mailchimp/disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to disconnect Mailchimp',
      };
    }

    return {
      success: true,
      message: 'Mailchimp disconnected successfully',
    };
  } catch (error) {
    console.error('Failed to disconnect Mailchimp:', error);
    return {
      success: false,
      message: 'Failed to disconnect Mailchimp',
    };
  }
}

/**
 * Get Mailchimp audiences (lists)
 */
export async function getMailchimpAudiences(): Promise<MailchimpAudience[]> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/mailchimp/audiences`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.audiences || [];
  } catch (error) {
    console.error('Failed to fetch Mailchimp audiences:', error);
    return [];
  }
}
