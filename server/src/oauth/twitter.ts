// ============================================================================
// X OAUTH: Post content to X on behalf of users
// Uses OAuth 2.0 with PKCE (Proof Key for Code Exchange)
// ============================================================================

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export interface TwitterOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  scope: string;
}

export interface TwitterProfile {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
}

export interface TwitterConnection {
  userId: string;
  provider: 'twitter';
  accountId: string;
  accountName: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  scopes: string[];
}

// X OAuth 2.0 endpoints (formerly Twitter)
const TWITTER_AUTH_URL = 'https://x.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const TWITTER_API_URL = 'https://api.x.com/2';

// Scopes for posting tweets
const TWITTER_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access', // Required for refresh tokens
];

/**
 * Generate PKCE code verifier (random string)
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier (SHA256 hash)
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

/**
 * Generate authorization URL for Twitter OAuth 2.0 with PKCE
 * User visits this URL to grant access to post on their behalf
 */
export function getTwitterAuthUrl(
  config: TwitterOAuthConfig,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: TWITTER_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TWITTER_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens using PKCE
 */
export async function exchangeTwitterCode(
  config: TwitterOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<TwitterTokens> {
  // Twitter requires Basic auth with client_id:client_secret
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twitter token exchange failed:', error);
    throw new Error(`Twitter token exchange failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope || TWITTER_SCOPES.join(' '),
  };
}

/**
 * Refresh expired access token
 */
export async function refreshTwitterToken(
  config: TwitterOAuthConfig,
  refreshToken: string
): Promise<TwitterTokens> {
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twitter token refresh failed:', error);
    throw new Error(`Twitter token refresh failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope || TWITTER_SCOPES.join(' '),
  };
}

/**
 * Get Twitter user profile
 */
export async function getTwitterProfile(accessToken: string): Promise<TwitterProfile> {
  const response = await fetch(`${TWITTER_API_URL}/users/me?user.fields=profile_image_url`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twitter profile fetch failed:', error);
    throw new Error(`Twitter profile fetch failed: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    id: data.data.id,
    name: data.data.name,
    username: data.data.username,
    profileImageUrl: data.data.profile_image_url,
  };
}

/**
 * Post a tweet on behalf of the user
 */
export async function postTweet(
  accessToken: string,
  text: string,
  options?: {
    replyToTweetId?: string;
    quoteTweetId?: string;
  }
): Promise<{ tweetId: string; tweetUrl: string }> {
  const body: any = {
    text,
  };

  if (options?.replyToTweetId) {
    body.reply = {
      in_reply_to_tweet_id: options.replyToTweetId,
    };
  }

  if (options?.quoteTweetId) {
    body.quote_tweet_id = options.quoteTweetId;
  }

  const response = await fetch(`${TWITTER_API_URL}/tweets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twitter post failed:', error);
    throw new Error(`Twitter post failed: ${response.status} - ${error}`);
  }

  const data: any = await response.json();
  const tweetId = data.data.id;

  return {
    tweetId,
    tweetUrl: `https://twitter.com/i/web/status/${tweetId}`,
  };
}

/**
 * Create Supabase client for storing connections
 */
function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for Twitter integration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Store OAuth state and code verifier for PKCE flow
 */
export async function storeOAuthState(
  userId: string,
  state: string,
  codeVerifier: string
): Promise<void> {
  const supabase = createSupabaseAdmin();

  // State expires in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('oauth_state')
    .upsert({
      user_id: userId,
      provider: 'twitter',
      state,
      code_verifier: codeVerifier,
      expires_at: expiresAt,
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store OAuth state:', error);
    throw new Error(`Failed to store OAuth state: ${error.message}`);
  }
}

/**
 * Get and validate OAuth state, return code verifier
 */
export async function getOAuthState(
  state: string
): Promise<{ userId: string; codeVerifier: string } | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('oauth_state')
    .select('*')
    .eq('state', state)
    .eq('provider', 'twitter')
    .single();

  if (error || !data) {
    return null;
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    // Clean up expired state
    await supabase.from('oauth_state').delete().eq('state', state);
    return null;
  }

  // Clean up used state
  await supabase.from('oauth_state').delete().eq('state', state);

  return {
    userId: data.user_id,
    codeVerifier: data.code_verifier,
  };
}

/**
 * Store Twitter connection in database
 */
export async function storeTwitterConnection(
  userId: string,
  tokens: TwitterTokens,
  profile: TwitterProfile
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .upsert({
      user_id: userId,
      provider: 'twitter',
      provider_user_id: profile.id,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || null,
      expires_at: new Date(tokens.expiresAt).toISOString(),
      scopes: tokens.scope.split(' '),
      profile: {
        name: profile.name,
        username: profile.username,
        picture: profile.profileImageUrl,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store Twitter connection:', error);
    throw new Error(`Failed to store Twitter connection: ${error.message}`);
  }
}

/**
 * Get Twitter connection from database
 */
export async function getTwitterConnection(userId: string): Promise<TwitterConnection | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'twitter')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to get Twitter connection:', error);
    throw new Error(`Failed to get Twitter connection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at) : new Date(0);

  return {
    userId: data.user_id,
    provider: 'twitter',
    accountId: data.provider_user_id,
    accountName: data.profile?.name || '',
    username: data.profile?.username || '',
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: expiresAt,
    scopes: data.scopes || [],
  };
}

/**
 * Remove Twitter connection from database
 */
export async function removeTwitterConnection(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'twitter');

  if (error) {
    console.error('Failed to remove Twitter connection:', error);
    throw new Error(`Failed to remove Twitter connection: ${error.message}`);
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
export async function getValidTwitterToken(
  config: TwitterOAuthConfig,
  connection: TwitterConnection
): Promise<string> {
  if (!isTokenExpired(connection.tokenExpiresAt)) {
    return connection.accessToken;
  }

  // Token is expired, try to refresh
  if (!connection.refreshToken) {
    throw new Error('Twitter token expired and no refresh token available. User must reconnect.');
  }

  const newTokens = await refreshTwitterToken(config, connection.refreshToken);

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
    .eq('user_id', connection.userId)
    .eq('provider', 'twitter');

  return newTokens.accessToken;
}
