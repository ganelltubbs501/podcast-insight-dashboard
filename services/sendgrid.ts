// SendGrid Integration Service
// API Key-based (user provides their own SendGrid API key)

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

export interface SendGridStatus {
  connected: boolean;
  email?: string;
  username?: string;
  senders?: SendGridSender[];
  defaultSender?: { email: string; name: string } | null;
  templates?: SendGridTemplate[];
  lists?: SendGridList[];
  lastVerifiedAt?: string;
}

export interface SendGridList {
  id: string;
  name: string;
  contactCount: number;
}

export interface SendGridTemplate {
  id: string;
  name: string;
  generation: string;
  updatedAt?: string;
}

export interface SendGridSender {
  id: number;
  email: string;
  name: string;
  verified: boolean;
}

/**
 * Get SendGrid connection status
 */
export async function getSendGridStatus(): Promise<SendGridStatus> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/status`, {
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
    console.error('Failed to fetch SendGrid status:', error);
    return { connected: false };
  }
}

/**
 * Connect SendGrid account with API key
 */
export async function connectSendGrid(apiKey: string): Promise<{ success: boolean; message: string; profile?: { username: string; email: string } }> {
  try {
    const authToken = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to connect SendGrid account',
      };
    }

    return {
      success: true,
      message: 'SendGrid connected successfully!',
      profile: data.profile,
    };
  } catch (error) {
    console.error('Failed to connect SendGrid:', error);
    return {
      success: false,
      message: 'Failed to connect SendGrid account. Please try again.',
    };
  }
}

/**
 * Disconnect SendGrid account
 */
export async function disconnectSendGrid(): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/disconnect`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to disconnect SendGrid',
      };
    }

    return {
      success: true,
      message: 'SendGrid disconnected successfully',
    };
  } catch (error) {
    console.error('Failed to disconnect SendGrid:', error);
    return {
      success: false,
      message: 'Failed to disconnect SendGrid',
    };
  }
}

/**
 * Send an email via SendGrid
 */
export async function sendEmailViaSendGrid(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: { email: string; name?: string };
  replyTo?: string;
}): Promise<{ success: boolean; message: string; messageId?: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/send`, {
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
        message: data.error || 'Failed to send email',
      };
    }

    return {
      success: true,
      message: 'Email sent successfully!',
      messageId: data.messageId,
    };
  } catch (error) {
    console.error('Failed to send email via SendGrid:', error);
    return {
      success: false,
      message: 'Failed to send email',
    };
  }
}

/**
 * Get SendGrid contact lists
 */
export async function getSendGridLists(): Promise<SendGridList[]> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/lists`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.lists || [];
  } catch (error) {
    console.error('Failed to fetch SendGrid lists:', error);
    return [];
  }
}

/**
 * Get SendGrid dynamic templates (live from API)
 */
export async function getSendGridTemplates(): Promise<SendGridTemplate[]> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.templates || [];
  } catch (error) {
    console.error('Failed to fetch SendGrid templates:', error);
    return [];
  }
}

/**
 * Get SendGrid verified senders
 */
export async function getSendGridSenders(): Promise<SendGridSender[]> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/senders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.senders || [];
  } catch (error) {
    console.error('Failed to fetch SendGrid senders:', error);
    return [];
  }
}

/**
 * Update the default sender for SendGrid
 */
export async function updateSendGridDefaultSender(sender: { email: string; name: string }): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/default-sender`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sender),
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        message: data.error || 'Failed to update default sender',
      };
    }

    return {
      success: true,
      message: 'Default sender updated successfully',
    };
  } catch (error) {
    console.error('Failed to update SendGrid default sender:', error);
    return {
      success: false,
      message: 'Failed to update default sender',
    };
  }
}

/**
 * Refresh senders list from SendGrid
 */
export async function refreshSendGridSenders(): Promise<{ success: boolean; senders: SendGridSender[]; message?: string }> {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}/api/integrations/sendgrid/refresh-senders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        senders: [],
        message: data.error || 'Failed to refresh senders',
      };
    }

    return {
      success: true,
      senders: data.senders || [],
    };
  } catch (error) {
    console.error('Failed to refresh SendGrid senders:', error);
    return {
      success: false,
      senders: [],
      message: 'Failed to refresh senders',
    };
  }
}
