/**
 * Error message utilities for better UX
 */

export interface ErrorContext {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class UserFriendlyError extends Error {
  public userMessage: string;
  public action?: string;
  public code?: string;

  constructor(userMessage: string, action?: string, code?: string) {
    super(userMessage);
    this.userMessage = userMessage;
    this.action = action;
    this.code = code;
    this.name = 'UserFriendlyError';
  }
}

/**
 * Convert technical errors to user-friendly messages
 */
export function getUserFriendlyError(error: any): UserFriendlyError {
  const message = error?.message || error?.toString() || 'An unexpected error occurred';

  // Beta full errors
  if (message.includes('beta') && (message.includes('full') || message.includes('capacity'))) {
    return new UserFriendlyError(
      'Beta is currently full. Join our waitlist to get notified when spots open up.',
      'Join Waitlist',
      'BETA_FULL'
    );
  }

  // RSS URL validation errors
  if (message.includes('rss') || message.includes('feed')) {
    if (message.includes('invalid') || message.includes('not found') || message.includes('404')) {
      return new UserFriendlyError(
        'Invalid RSS URL. Please paste the feed URL, not the website URL. Usually ends with .xml or /feed',
        'Find RSS URL',
        'INVALID_RSS'
      );
    }
  }

  // Rate limiting errors
  if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
    const match = message.match(/(\d+)\s*minute/i);
    const minutes = match ? parseInt(match[1]) : 5;
    return new UserFriendlyError(
      `Rate limit reached. Please try again in ${minutes} minutes.`,
      'Try Again Later',
      'RATE_LIMIT'
    );
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
    return new UserFriendlyError(
      'Session expired. Please sign in again.',
      'Sign In',
      'AUTH_ERROR'
    );
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return new UserFriendlyError(
      'Connection error. Please check your internet and try again.',
      'Retry',
      'NETWORK_ERROR'
    );
  }

  // Default fallback
  return new UserFriendlyError(
    'Something went wrong. Please try again or contact support if the issue persists.',
    'Report Issue',
    'UNKNOWN_ERROR'
  );
}

/**
 * Get debug info for error reporting
 */
export async function getDebugInfo(lastError?: any): Promise<string> {
  // Try to get user ID from Supabase
  let userId = 'anonymous';
  try {
    // This is a simple way - in a real app you'd import supabase client
    const { data } = await (window as any).supabase?.auth?.getUser();
    if (data?.user?.id) {
      userId = data.user.id.substring(0, 8) + '...'; // Only first 8 chars for privacy
    }
  } catch (err) {
    // Ignore errors when getting user ID
  }

  const debug = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    appVersion: '0.0.0', // From package.json
    userId,
    lastError: lastError ? {
      message: lastError.message,
      stack: lastError.stack,
      code: lastError.code
    } : null
  };

  return JSON.stringify(debug, null, 2);
}

/**
 * Copy debug info to clipboard
 */
export async function copyDebugInfo(lastError?: any): Promise<boolean> {
  try {
    const debugInfo = await getDebugInfo(lastError);
    await navigator.clipboard.writeText(debugInfo);
    return true;
  } catch (err) {
    console.error('Failed to copy debug info:', err);
    return false;
  }
}