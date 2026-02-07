// Twilio Integration Service
// OAuth-based integration for SMS and Email

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

export interface TwilioStatus {
  connected: boolean;
  accountSid?: string;
  accountName?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
  lastSyncAt?: string;
}

/**
 * Get Twilio connection status
 */
export async function getTwilioStatus(): Promise<TwilioStatus> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/twilio/status`, {
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
    console.error('Failed to fetch Twilio status:', error);
    return { connected: false };
  }
}

/**
 * Get Twilio OAuth URL to start connection
 */
export async function getTwilioAuthUrl(): Promise<string> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/api/integrations/twilio/auth-url`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Twilio auth URL');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Connect Twilio - redirects to OAuth
 */
export async function connectTwilio(): Promise<void> {
  const authUrl = await getTwilioAuthUrl();
  window.location.href = authUrl;
}

/**
 * Disconnect Twilio account
 */
export async function disconnectTwilio(): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/twilio/disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to disconnect Twilio',
      };
    }

    return {
      success: true,
      message: 'Twilio disconnected successfully',
    };
  } catch (error) {
    console.error('Failed to disconnect Twilio:', error);
    return {
      success: false,
      message: 'Failed to disconnect Twilio',
    };
  }
}

/**
 * Send SMS via Twilio
 */
export async function sendTwilioSMS(options: {
  from: string;
  to: string;
  body: string;
}): Promise<{ success: boolean; message: string; messageSid?: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/twilio/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Failed to send SMS',
      };
    }

    return {
      success: true,
      message: 'SMS sent successfully!',
      messageSid: data.messageSid,
    };
  } catch (error) {
    console.error('Failed to send SMS via Twilio:', error);
    return {
      success: false,
      message: 'Failed to send SMS',
    };
  }
}
