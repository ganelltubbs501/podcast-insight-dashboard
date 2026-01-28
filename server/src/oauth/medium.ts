// ============================================================================
// MEDIUM INTEGRATION: Post articles to Medium on behalf of users
// Uses Integration Tokens (user-generated API keys, not OAuth)
// ============================================================================

import { createClient } from '@supabase/supabase-js';

export interface MediumProfile {
  id: string;
  username: string;
  name: string;
  url: string;
  imageUrl?: string;
}

export interface MediumPublication {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
}

export interface MediumPostOptions {
  title: string;
  content: string; // HTML or Markdown
  contentFormat?: 'html' | 'markdown';
  tags?: string[];
  canonicalUrl?: string;
  publishStatus?: 'public' | 'draft' | 'unlisted';
  publicationId?: string; // If posting to a publication
}

export interface MediumPostResult {
  id: string;
  title: string;
  authorId: string;
  url: string;
  canonicalUrl?: string;
  publishStatus: string;
  publishedAt?: number;
  license: string;
  licenseUrl: string;
  tags: string[];
}

export interface MediumConnection {
  userId: string;
  provider: 'medium';
  accountId: string;
  accountName: string;
  username: string;
  accessToken: string;
  profileUrl?: string;
}

// Medium API base URL
const MEDIUM_API_URL = 'https://api.medium.com/v1';

/**
 * Validate Medium Integration Token by fetching user profile
 */
export async function validateMediumToken(token: string): Promise<MediumProfile> {
  const response = await fetch(`${MEDIUM_API_URL}/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Medium token validation failed:', error);
    if (response.status === 401) {
      throw new Error('Invalid Medium Integration Token. Please check your token and try again.');
    }
    throw new Error(`Medium API error: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
    url: data.data.url,
    imageUrl: data.data.imageUrl,
  };
}

/**
 * Get publications the user can post to
 */
export async function getMediumPublications(
  token: string,
  userId: string
): Promise<MediumPublication[]> {
  const response = await fetch(`${MEDIUM_API_URL}/users/${userId}/publications`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to fetch Medium publications:', error);
    throw new Error(`Failed to fetch publications: ${response.status}`);
  }

  const data: any = await response.json();

  return (data.data || []).map((pub: any) => ({
    id: pub.id,
    name: pub.name,
    description: pub.description,
    url: pub.url,
    imageUrl: pub.imageUrl,
  }));
}

/**
 * Create a post on Medium
 */
export async function createMediumPost(
  token: string,
  authorId: string,
  options: MediumPostOptions
): Promise<MediumPostResult> {
  // Determine the endpoint based on whether posting to a publication
  const endpoint = options.publicationId
    ? `${MEDIUM_API_URL}/publications/${options.publicationId}/posts`
    : `${MEDIUM_API_URL}/users/${authorId}/posts`;

  const body = {
    title: options.title,
    contentFormat: options.contentFormat || 'html',
    content: options.content,
    tags: options.tags || [],
    canonicalUrl: options.canonicalUrl,
    publishStatus: options.publishStatus || 'draft',
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Medium post creation failed:', error);
    if (response.status === 401) {
      throw new Error('Medium token expired or invalid. Please reconnect your account.');
    }
    throw new Error(`Failed to create Medium post: ${response.status} - ${error}`);
  }

  const data: any = await response.json();

  return {
    id: data.data.id,
    title: data.data.title,
    authorId: data.data.authorId,
    url: data.data.url,
    canonicalUrl: data.data.canonicalUrl,
    publishStatus: data.data.publishStatus,
    publishedAt: data.data.publishedAt,
    license: data.data.license,
    licenseUrl: data.data.licenseUrl,
    tags: data.data.tags || [],
  };
}

/**
 * Create Supabase client for storing connections
 */
function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for Medium integration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Store Medium connection in database
 */
export async function storeMediumConnection(
  userId: string,
  token: string,
  profile: MediumProfile
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .upsert({
      user_id: userId,
      provider: 'medium',
      provider_user_id: profile.id,
      access_token: token,
      refresh_token: null, // Medium tokens don't expire/refresh
      expires_at: null, // No expiration
      scopes: ['basicProfile', 'publishPost'],
      profile: {
        name: profile.name,
        username: profile.username,
        url: profile.url,
        picture: profile.imageUrl,
      },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

  if (error) {
    console.error('Failed to store Medium connection:', error);
    throw new Error(`Failed to store Medium connection: ${error.message}`);
  }
}

/**
 * Get Medium connection from database
 */
export async function getMediumConnection(userId: string): Promise<MediumConnection | null> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'medium')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to get Medium connection:', error);
    throw new Error(`Failed to get Medium connection: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.user_id,
    provider: 'medium',
    accountId: data.provider_user_id,
    accountName: data.profile?.name || '',
    username: data.profile?.username || '',
    accessToken: data.access_token,
    profileUrl: data.profile?.url,
  };
}

/**
 * Remove Medium connection from database
 */
export async function removeMediumConnection(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'medium');

  if (error) {
    console.error('Failed to remove Medium connection:', error);
    throw new Error(`Failed to remove Medium connection: ${error.message}`);
  }
}
