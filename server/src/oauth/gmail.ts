// ============================================================================
// GMAIL OAUTH: Send emails on behalf of users via Gmail API
// ============================================================================

import { createClient } from '@supabase/supabase-js';

export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface GmailProfile {
  email: string;
  name?: string;
  picture?: string;
}

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

// Scopes needed for sending email
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Generate authorization URL for Gmail OAuth
 */
export function getGmailAuthUrl(config: GmailOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: GMAIL_SCOPES.join(' '),
    state: state,
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGmailCode(
  config: GmailOAuthConfig,
  code: string
): Promise<GmailTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gmail token exchange failed:', error);
    throw new Error(`Gmail token exchange failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope,
  };
}

/**
 * Refresh expired access token
 */
export async function refreshGmailToken(
  config: GmailOAuthConfig,
  refreshToken: string
): Promise<GmailTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gmail token refresh failed:', error);
    throw new Error(`Gmail token refresh failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Google doesn't always return a new refresh token
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope || GMAIL_SCOPES.join(' '),
  };
}

/**
 * Get user's Gmail profile
 */
export async function getGmailProfile(accessToken: string): Promise<GmailProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gmail profile fetch failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Send email via Gmail API
 */
export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  fromName?: string
): Promise<{ messageId: string; threadId: string }> {
  // Create RFC 2822 formatted email
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ];

  const email = emailLines.join('\r\n');

  // Base64url encode the email
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedEmail,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gmail send failed:', error);
    throw new Error(`Gmail send failed: ${response.status} - ${error}`);
  }

  const data: any = await response.json();

  return {
    messageId: data.id,
    threadId: data.threadId,
  };
}

/**
 * Create Supabase client for storing connections
 */
function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Store Gmail connection in database
 */
export async function storeGmailConnection(
  userId: string,
  tokens: GmailTokens,
  profile: GmailProfile
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .upsert({
      user_id: userId,
      provider: 'gmail',
      provider_user_id: profile.email,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: new Date(tokens.expiresAt).toISOString(),
      scopes: tokens.scope.split(' '),
      profile: {
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store Gmail connection:', error);
    throw new Error(`Failed to store Gmail connection: ${error.message}`);
  }
}

/**
 * Get Gmail connection from database
 */
export async function getGmailConnection(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
  name?: string;
} | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get Gmail connection: ${error.message}`);
  }

  if (!data) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ? new Date(data.expires_at) : new Date(0),
    email: data.provider_user_id,
    name: data.profile?.name,
  };
}

/**
 * Remove Gmail connection from database
 */
export async function removeGmailConnection(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'gmail');

  if (error) {
    throw new Error(`Failed to remove Gmail connection: ${error.message}`);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidGmailToken(
  config: GmailOAuthConfig,
  userId: string
): Promise<string> {
  const connection = await getGmailConnection(userId);

  if (!connection) {
    throw new Error('Gmail not connected. Please connect your Gmail account first.');
  }

  // Check if token is expired or will expire soon (within 5 minutes)
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  if (connection.expiresAt.getTime() > fiveMinutesFromNow) {
    return connection.accessToken;
  }

  // Token is expired, refresh it
  console.log('Gmail token expired, refreshing...');
  const newTokens = await refreshGmailToken(config, connection.refreshToken);

  // Update stored tokens
  const supabase = createSupabaseAdmin();
  await supabase
    .from('connected_accounts')
    .update({
      access_token: newTokens.accessToken,
      refresh_token: newTokens.refreshToken,
      expires_at: new Date(newTokens.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'gmail');

  return newTokens.accessToken;
}
