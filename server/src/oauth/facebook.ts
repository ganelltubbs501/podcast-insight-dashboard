// ============================================================================
// FACEBOOK OAUTH: Post content to Facebook Pages on behalf of users
// ============================================================================

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export interface FacebookOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface FacebookTokens {
  accessToken: string;
  expiresAt: number; // Unix timestamp
  tokenType: string;
}

export interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  category?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookConnection {
  userId: string;
  provider: 'facebook';
  accountId: string;
  accountName: string;
  accessToken: string;
  tokenExpiresAt: Date;
  selectedPage?: {
    id: string;
    name: string;
    accessToken: string;
  };
}

// Facebook Graph API endpoints
const FACEBOOK_GRAPH_VERSION = 'v18.0';
const FACEBOOK_AUTH_URL = `https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`;
const FACEBOOK_TOKEN_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/oauth/access_token`;
const FACEBOOK_API_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`;

// Scopes for posting to pages
const FACEBOOK_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'public_profile',
  'email'
];

/**
 * Generate authorization URL for Facebook OAuth
 * User visits this URL to grant access to post on their pages
 */
export function getFacebookAuthUrl(config: FacebookOAuthConfig, state?: string): string {
  const authState = state || crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: FACEBOOK_SCOPES.join(','),
    response_type: 'code',
    state: authState,
  });

  return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeFacebookCode(
  config: FacebookOAuthConfig,
  code: string
): Promise<FacebookTokens> {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.text();
    console.error('Facebook token exchange failed:', error);
    throw new Error(`Facebook token exchange failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    tokenType: data.token_type || 'bearer',
  };
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function exchangeForLongLivedToken(
  config: FacebookOAuthConfig,
  shortLivedToken: string
): Promise<FacebookTokens> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.text();
    console.error('Facebook long-lived token exchange failed:', error);
    throw new Error(`Facebook long-lived token exchange failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    // Long-lived tokens typically last 60 days
    expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 60 * 24 * 60 * 60 * 1000),
    tokenType: data.token_type || 'bearer',
  };
}

/**
 * Get Facebook user profile
 */
export async function getFacebookProfile(accessToken: string): Promise<FacebookProfile> {
  const params = new URLSearchParams({
    fields: 'id,name,email,picture',
    access_token: accessToken,
  });

  const response = await fetch(`${FACEBOOK_API_URL}/me?${params.toString()}`);

  if (!response.ok) {
    const error = await response.text();
    console.error('Facebook profile fetch failed:', error);
    throw new Error(`Facebook profile fetch failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    picture: data.picture,
  };
}

/**
 * Get list of Facebook Pages the user manages
 */
export async function getFacebookPages(accessToken: string): Promise<FacebookPage[]> {
  const params = new URLSearchParams({
    fields: 'id,name,access_token,category,picture',
    access_token: accessToken,
  });

  const response = await fetch(`${FACEBOOK_API_URL}/me/accounts?${params.toString()}`);

  if (!response.ok) {
    const error = await response.text();
    console.error('Facebook pages fetch failed:', error);
    throw new Error(`Facebook pages fetch failed: ${response.status}`);
  }

  const data: any = await response.json();

  return (data.data || []).map((page: any) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    category: page.category,
    picture: page.picture,
  }));
}

/**
 * Post content to a Facebook Page
 */
export async function postToFacebookPage(
  pageAccessToken: string,
  pageId: string,
  content: string,
  options?: {
    link?: string;
    published?: boolean;
    scheduledPublishTime?: number; // Unix timestamp
  }
): Promise<{ postId: string; postUrl: string }> {
  const body: any = {
    message: content,
    access_token: pageAccessToken,
  };

  if (options?.link) {
    body.link = options.link;
  }

  if (options?.published !== undefined) {
    body.published = options.published;
  }

  if (options?.scheduledPublishTime) {
    body.scheduled_publish_time = options.scheduledPublishTime;
    body.published = false;
  }

  const response = await fetch(`${FACEBOOK_API_URL}/${pageId}/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Facebook post failed:', error);
    throw new Error(`Facebook post failed: ${response.status} - ${error}`);
  }

  const data: any = await response.json();
  const postId = data.id;

  // Construct the post URL
  const postUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

  return {
    postId,
    postUrl,
  };
}

/**
 * Create Supabase client for storing connections
 */
function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for Facebook integration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Store Facebook connection in database
 */
export async function storeFacebookConnection(
  userId: string,
  tokens: FacebookTokens,
  profile: FacebookProfile,
  selectedPage?: FacebookPage
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const connectionData: any = {
    user_id: userId,
    provider: 'facebook',
    provider_user_id: profile.id,
    access_token: tokens.accessToken,
    refresh_token: null, // Facebook doesn't use refresh tokens the same way
    expires_at: new Date(tokens.expiresAt).toISOString(),
    scopes: FACEBOOK_SCOPES,
    profile: {
      name: profile.name,
      email: profile.email,
      picture: profile.picture?.data?.url,
    },
    updated_at: new Date().toISOString(),
  };

  // Store selected page in metadata if provided
  if (selectedPage) {
    connectionData.metadata = {
      selectedPage: {
        id: selectedPage.id,
        name: selectedPage.name,
        accessToken: selectedPage.accessToken,
      },
    };
  }

  const { error } = await supabase
    .from('connected_accounts')
    .upsert(connectionData, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store Facebook connection:', error);
    throw new Error(`Failed to store Facebook connection: ${error.message}`);
  }
}

/**
 * Update selected Facebook page
 */
export async function updateSelectedFacebookPage(
  userId: string,
  page: FacebookPage
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .update({
      metadata: {
        selectedPage: {
          id: page.id,
          name: page.name,
          accessToken: page.accessToken,
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'facebook');

  if (error) {
    console.error('Failed to update selected Facebook page:', error);
    throw new Error(`Failed to update selected Facebook page: ${error.message}`);
  }
}

/**
 * Get Facebook connection from database
 */
export async function getFacebookConnection(userId: string): Promise<FacebookConnection | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'facebook')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Failed to get Facebook connection:', error);
    throw new Error(`Failed to get Facebook connection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at) : new Date(0);

  return {
    userId: data.user_id,
    provider: 'facebook',
    accountId: data.provider_user_id,
    accountName: data.profile?.name || '',
    accessToken: data.access_token,
    tokenExpiresAt: expiresAt,
    selectedPage: data.metadata?.selectedPage,
  };
}

/**
 * Remove Facebook connection from database
 */
export async function removeFacebookConnection(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'facebook');

  if (error) {
    console.error('Failed to remove Facebook connection:', error);
    throw new Error(`Failed to remove Facebook connection: ${error.message}`);
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
 * Get valid page access token for posting
 * Page access tokens don't expire if obtained from a long-lived user token
 */
export async function getValidFacebookPageToken(
  connection: FacebookConnection
): Promise<{ pageId: string; pageAccessToken: string }> {
  if (!connection.selectedPage) {
    throw new Error('No Facebook page selected. User must select a page to post to.');
  }

  // Check if user token is expired
  if (isTokenExpired(connection.tokenExpiresAt)) {
    throw new Error('Facebook token expired. User must reconnect.');
  }

  return {
    pageId: connection.selectedPage.id,
    pageAccessToken: connection.selectedPage.accessToken,
  };
}
