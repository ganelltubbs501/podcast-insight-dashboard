// ============================================================================
// SENDGRID INTEGRATION: Send emails via SendGrid on behalf of users
// Uses API Keys (user-generated, not OAuth)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3';

export interface SendGridProfile {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface SendGridConnection {
  userId: string;
  provider: 'sendgrid';
  email: string;
  username: string;
  accessToken: string; // The API key
}

export interface SendGridEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: { email: string; name?: string };
  replyTo?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
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

/**
 * Create Supabase client for storing connections
 */
function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for SendGrid integration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Validate SendGrid API Key by fetching user account info
 */
export async function validateSendGridApiKey(apiKey: string): Promise<SendGridProfile> {
  // Validate the API key by getting user account
  const accountResponse = await fetch(`${SENDGRID_API_URL}/user/account`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!accountResponse.ok) {
    const error = await accountResponse.text();
    console.error('SendGrid API key validation failed:', error);
    if (accountResponse.status === 401 || accountResponse.status === 403) {
      throw new Error('Invalid SendGrid API Key. Please check your key and try again.');
    }
    throw new Error(`SendGrid API error: ${accountResponse.status}`);
  }

  const accountData: any = await accountResponse.json();

  // Also get user profile for additional details
  let firstName = '';
  let lastName = '';
  try {
    const profileResponse = await fetch(`${SENDGRID_API_URL}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (profileResponse.ok) {
      const profileData: any = await profileResponse.json();
      firstName = profileData.first_name || '';
      lastName = profileData.last_name || '';
    }
  } catch (e) {
    // Profile fetch is optional
  }

  // Get the account email
  let email = '';
  try {
    const emailResponse = await fetch(`${SENDGRID_API_URL}/user/email`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (emailResponse.ok) {
      const emailData: any = await emailResponse.json();
      email = emailData.email || '';
    }
  } catch (e) {
    // Email fetch is optional
  }

  return {
    username: accountData.username || '',
    email: email,
    firstName: firstName,
    lastName: lastName,
  };
}

/**
 * Store SendGrid connection in database
 * Fetches and stores: senders, templates, mailing lists
 */
export async function storeSendGridConnection(
  userId: string,
  apiKey: string,
  profile: SendGridProfile
): Promise<{
  senders: Array<{ id: number; email: string; name: string; verified: boolean }>;
  templates: SendGridTemplate[];
  lists: SendGridList[];
}> {
  const supabase = createSupabaseAdmin();

  // Fetch all resources in parallel
  const [senders, templates, lists] = await Promise.all([
    getSendGridSenders(apiKey),
    getSendGridTemplates(apiKey),
    getSendGridLists(apiKey),
  ]);

  // Auto-select first verified sender as default if available
  const defaultSender = senders.find(s => s.verified) || senders[0] || null;

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('connected_accounts')
    .upsert({
      user_id: userId,
      provider: 'sendgrid',
      provider_user_id: profile.username,
      access_token: apiKey,
      refresh_token: null, // API keys don't refresh
      expires_at: null, // No expiration
      scopes: ['mail.send', 'marketing.read', 'templates.read'],
      profile: {
        username: profile.username,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      },
      status: 'connected',
      metadata: {
        senders: senders,
        defaultSender: defaultSender ? { email: defaultSender.email, name: defaultSender.name } : null,
        templates: templates,
        lists: lists,
        lastVerifiedAt: now,
      },
      last_sync_at: now,
      updated_at: now,
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store SendGrid connection:', error);
    throw new Error(`Failed to store SendGrid connection: ${error.message}`);
  }

  return { senders, templates, lists };
}

export interface SendGridConnectionFull {
  userId: string;
  provider: 'sendgrid';
  email: string;
  username: string;
  accessToken: string;
  senders: Array<{ id: number; email: string; name: string; verified: boolean }>;
  defaultSender: { email: string; name: string } | null;
  templates: SendGridTemplate[];
  lists: SendGridList[];
  lastVerifiedAt?: string;
}

/**
 * Get SendGrid connection from database
 */
export async function getSendGridConnection(userId: string): Promise<SendGridConnection | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'sendgrid')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to get SendGrid connection:', error);
    throw new Error(`Failed to get SendGrid connection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    provider: 'sendgrid',
    email: data.profile?.email || '',
    username: data.profile?.username || data.provider_user_id || '',
    accessToken: data.access_token,
  };
}

/**
 * Get SendGrid connection with full metadata (senders, templates, lists)
 */
export async function getSendGridConnectionFull(userId: string): Promise<SendGridConnectionFull | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'sendgrid')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to get SendGrid connection:', error);
    throw new Error(`Failed to get SendGrid connection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    provider: 'sendgrid',
    email: data.profile?.email || '',
    username: data.profile?.username || data.provider_user_id || '',
    accessToken: data.access_token,
    senders: data.metadata?.senders || [],
    defaultSender: data.metadata?.defaultSender || null,
    templates: data.metadata?.templates || [],
    lists: data.metadata?.lists || [],
    lastVerifiedAt: data.metadata?.lastVerifiedAt,
  };
}

/**
 * Update the default sender for a SendGrid connection
 */
export async function updateSendGridDefaultSender(
  userId: string,
  sender: { email: string; name: string }
): Promise<void> {
  const supabase = createSupabaseAdmin();

  // First get the current metadata
  const { data, error: fetchError } = await supabase
    .from('connected_accounts')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'sendgrid')
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch SendGrid connection: ${fetchError.message}`);
  }

  const currentMetadata = data?.metadata || {};

  const { error } = await supabase
    .from('connected_accounts')
    .update({
      metadata: {
        ...currentMetadata,
        defaultSender: sender,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'sendgrid');

  if (error) {
    console.error('Failed to update SendGrid default sender:', error);
    throw new Error(`Failed to update default sender: ${error.message}`);
  }
}

/**
 * Refresh senders list from SendGrid API
 */
export async function refreshSendGridSenders(userId: string): Promise<Array<{ id: number; email: string; name: string; verified: boolean }>> {
  const supabase = createSupabaseAdmin();

  // Get the connection to get the API key
  const connection = await getSendGridConnection(userId);
  if (!connection) {
    throw new Error('SendGrid not connected');
  }

  // Fetch fresh senders from API
  const senders = await getSendGridSenders(connection.accessToken);

  // Get current metadata
  const { data, error: fetchError } = await supabase
    .from('connected_accounts')
    .select('metadata')
    .eq('user_id', userId)
    .eq('provider', 'sendgrid')
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch SendGrid connection: ${fetchError.message}`);
  }

  const currentMetadata = data?.metadata || {};

  // Update metadata with new senders list
  const { error } = await supabase
    .from('connected_accounts')
    .update({
      metadata: {
        ...currentMetadata,
        senders: senders,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'sendgrid');

  if (error) {
    console.error('Failed to update SendGrid senders:', error);
    throw new Error(`Failed to refresh senders: ${error.message}`);
  }

  return senders;
}

/**
 * Remove SendGrid connection from database
 */
export async function removeSendGridConnection(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'sendgrid');

  if (error) {
    console.error('Failed to remove SendGrid connection:', error);
    throw new Error(`Failed to remove SendGrid connection: ${error.message}`);
  }
}

/**
 * Send an email via SendGrid
 */
export async function sendSendGridEmail(
  apiKey: string,
  options: SendGridEmailOptions
): Promise<{ success: boolean; messageId?: string }> {
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  const payload: any = {
    personalizations: [{
      to: toAddresses.map(email => ({ email })),
    }],
    from: options.from || { email: 'noreply@loquihq.com', name: 'LoquiHQ' },
    subject: options.subject,
  };

  // Add reply-to if provided
  if (options.replyTo) {
    payload.reply_to = { email: options.replyTo };
  }

  // Use template or content
  if (options.templateId) {
    payload.template_id = options.templateId;
    if (options.dynamicTemplateData) {
      payload.personalizations[0].dynamic_template_data = options.dynamicTemplateData;
    }
  } else {
    payload.content = [];
    if (options.text) {
      payload.content.push({ type: 'text/plain', value: options.text });
    }
    if (options.html) {
      payload.content.push({ type: 'text/html', value: options.html });
    }
    // Ensure at least one content type
    if (payload.content.length === 0) {
      payload.content.push({ type: 'text/plain', value: '' });
    }
  }

  const response = await fetch(`${SENDGRID_API_URL}/mail/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('SendGrid send failed:', error);
    if (response.status === 401 || response.status === 403) {
      throw new Error('SendGrid API key invalid or expired. Please reconnect your account.');
    }
    throw new Error(`Failed to send email: ${response.status} - ${error}`);
  }

  // SendGrid returns 202 Accepted with X-Message-Id header
  const messageId = response.headers.get('X-Message-Id') || undefined;

  return { success: true, messageId };
}

/**
 * Get SendGrid contact lists (for marketing emails)
 */
export async function getSendGridLists(apiKey: string): Promise<SendGridList[]> {
  try {
    const response = await fetch(`${SENDGRID_API_URL}/marketing/lists`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return empty array if marketing is not enabled or any error
      if (response.status === 404 || response.status === 403) {
        return [];
      }
      const error = await response.text();
      console.error('Failed to fetch SendGrid lists:', error);
      return [];
    }

    const data: any = await response.json();

    return (data.result || []).map((list: any) => ({
      id: list.id,
      name: list.name,
      contactCount: list.contact_count || 0,
    }));
  } catch (e) {
    console.error('Error fetching SendGrid lists:', e);
    return [];
  }
}

/**
 * Get SendGrid dynamic templates
 */
export async function getSendGridTemplates(apiKey: string): Promise<SendGridTemplate[]> {
  try {
    const response = await fetch(`${SENDGRID_API_URL}/templates?generations=dynamic&page_size=100`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return empty array if templates endpoint not accessible
      if (response.status === 404 || response.status === 403) {
        return [];
      }
      const error = await response.text();
      console.error('Failed to fetch SendGrid templates:', error);
      return [];
    }

    const data: any = await response.json();

    return (data.templates || data.result || []).map((template: any) => ({
      id: template.id,
      name: template.name,
      generation: template.generation || 'dynamic',
      updatedAt: template.updated_at || undefined,
    }));
  } catch (e) {
    console.error('Error fetching SendGrid templates:', e);
    return [];
  }
}

/**
 * Get verified sender identities
 */
export async function getSendGridSenders(apiKey: string): Promise<Array<{ id: number; email: string; name: string; verified: boolean }>> {
  const response = await fetch(`${SENDGRID_API_URL}/verified_senders`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to fetch SendGrid senders:', error);
    return [];
  }

  const data: any = await response.json();

  return (data.results || []).map((sender: any) => ({
    id: sender.id,
    email: sender.from_email,
    name: sender.from_name || sender.nickname || '',
    verified: sender.verified || false,
  }));
}
