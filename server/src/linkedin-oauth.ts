// ============================================================================
// LINKEDIN OAUTH: Post content to LinkedIn on behalf of users
// ============================================================================

import crypto from 'crypto';

export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface LinkedInTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: string;
}

export interface LinkedInConnection {
  userId: string;
  provider: 'linkedin';
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  scopes: string[];
}

// LinkedIn OAuth endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

// Scopes for posting as a person (OpenID Connect format)
const LINKEDIN_SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

/**
 * Generate authorization URL for LinkedIn OAuth
 * User visits this URL to grant access to post on their behalf
 */
export function getLinkedInAuthUrl(config: LinkedInOAuthConfig, state?: string): string {
  const authState = state || crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: LINKEDIN_SCOPES.join(' '),
    state: authState,
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeLinkedInCode(
  config: LinkedInOAuthConfig,
  code: string
): Promise<LinkedInTokens> {
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LinkedIn token exchange failed:', error);
    throw new Error(`LinkedIn token exchange failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token, // LinkedIn may not always provide this
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope || LINKEDIN_SCOPES.join(' '),
  };
}

/**
 * Refresh expired access token
 * Note: LinkedIn refresh tokens have limited availability
 */
export async function refreshLinkedInToken(
  config: LinkedInOAuthConfig,
  refreshToken: string
): Promise<LinkedInTokens> {
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LinkedIn token refresh failed:', error);
    throw new Error(`LinkedIn token refresh failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope || LINKEDIN_SCOPES.join(' '),
  };
}

/**
 * Get LinkedIn user profile using OpenID Connect userinfo endpoint
 */
export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LinkedIn profile fetch failed:', error);
    throw new Error(`LinkedIn profile fetch failed: ${response.status}`);
  }

  const data: any = await response.json();

  // OpenID Connect userinfo returns: sub, name, given_name, family_name, picture, email
  return {
    id: data.sub,
    localizedFirstName: data.given_name || data.name?.split(' ')[0] || '',
    localizedLastName: data.family_name || data.name?.split(' ').slice(1).join(' ') || '',
    profilePicture: data.picture,
  };
}

/**
 * Post content to LinkedIn on behalf of the user
 * Uses the LinkedIn Posts API (UGC Posts)
 */
export async function postToLinkedIn(
  accessToken: string,
  personUrn: string, // format: "urn:li:person:{id}"
  content: string,
  options?: {
    mediaUrl?: string;
    mediaTitle?: string;
    mediaDescription?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  }
): Promise<{ postId: string; postUrl: string }> {
  const visibility = options?.visibility || 'PUBLIC';

  // Build the post body
  const postBody: any = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: options?.mediaUrl ? 'ARTICLE' : 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };

  // Add media if provided
  if (options?.mediaUrl) {
    postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
      {
        status: 'READY',
        originalUrl: options.mediaUrl,
        title: {
          text: options.mediaTitle || '',
        },
        description: {
          text: options.mediaDescription || '',
        },
      },
    ];
  }

  const response = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LinkedIn post failed:', error);
    throw new Error(`LinkedIn post failed: ${response.status} - ${error}`);
  }

  // Get the post ID from the response header
  const postId = response.headers.get('x-restli-id') || '';

  // Construct the post URL
  // Format: https://www.linkedin.com/feed/update/{activityUrn}
  const activityUrn = `urn:li:activity:${postId}`;
  const postUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(activityUrn)}`;

  return {
    postId,
    postUrl,
  };
}

/**
 * Create Supabase client for storing connections
 */
function createSupabaseAdmin() {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for LinkedIn integration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Store LinkedIn connection in database
 */
export async function storeLinkedInConnection(
  userId: string,
  tokens: LinkedInTokens,
  profile: LinkedInProfile
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .upsert({
      user_id: userId,
      provider: 'linkedin',
      account_id: profile.id,
      account_name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || null,
      token_expires_at: new Date(tokens.expiresAt).toISOString(),
      scopes: tokens.scope.split(' '),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store LinkedIn connection:', error);
    throw new Error(`Failed to store LinkedIn connection: ${error.message}`);
  }
}

/**
 * Get LinkedIn connection from database
 */
export async function getLinkedInConnection(userId: string): Promise<LinkedInConnection | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'linkedin')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Failed to get LinkedIn connection:', error);
    throw new Error(`Failed to get LinkedIn connection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    provider: 'linkedin',
    accountId: data.account_id,
    accountName: data.account_name,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: new Date(data.token_expires_at),
    scopes: data.scopes || [],
  };
}

/**
 * Remove LinkedIn connection from database
 */
export async function removeLinkedInConnection(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'linkedin');

  if (error) {
    console.error('Failed to remove LinkedIn connection:', error);
    throw new Error(`Failed to remove LinkedIn connection: ${error.message}`);
  }
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  return expiresAt.getTime() < fiveMinutesFromNow;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidLinkedInToken(
  config: LinkedInOAuthConfig,
  connection: LinkedInConnection
): Promise<string> {
  if (!isTokenExpired(connection.tokenExpiresAt)) {
    return connection.accessToken;
  }

  // Token is expired, try to refresh
  if (!connection.refreshToken) {
    throw new Error('LinkedIn token expired and no refresh token available. User must reconnect.');
  }

  const newTokens = await refreshLinkedInToken(config, connection.refreshToken);

  // Update stored tokens
  const supabase = createSupabaseAdmin();
  await supabase
    .from('connected_accounts')
    .update({
      access_token: newTokens.accessToken,
      refresh_token: newTokens.refreshToken,
      token_expires_at: new Date(newTokens.expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.userId)
    .eq('provider', 'linkedin');

  return newTokens.accessToken;
}
