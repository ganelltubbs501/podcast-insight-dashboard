/**
 * Sentry Error Tracking - Frontend Configuration
 *
 * Initializes Sentry for error tracking, performance monitoring,
 * and user feedback in the browser.
 */

import * as Sentry from '@sentry/react';
import { env } from './env';

/**
 * Initialize Sentry for error tracking
 * Only enables in production or when explicitly configured
 */
export function initSentry(): void {
  // Only initialize if DSN is provided and feature is enabled
  if (!env.sentry.dsn || !env.features.errorTracking) {
    console.log('Sentry error tracking is disabled');
    return;
  }

  Sentry.init({
    dsn: env.sentry.dsn,

    // Environment
    environment: env.app.env,

    // Integration configuration
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration(),

      // Replay sessions for debugging
      Sentry.replayIntegration({
        // Only record sessions with errors
        maskAllText: true,
        blockAllMedia: true,
      }),

      // Breadcrumb tracking
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
    ],

    // Performance monitoring
    tracesSampleRate: env.app.isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Release tracking
    release: `loquihq@${env.app.env}`,

    // Ignore common errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',

      // Network errors (handled by UI)
      'NetworkError',
      'Failed to fetch',
      'Network request failed',

      // User cancelled actions
      'AbortError',
      'User cancelled',
    ],

    // PII filtering
    beforeSend(event, hint) {
      // Remove sensitive data from events
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Don't send events in development unless explicitly enabled
      if (env.app.isDevelopment && !env.features.errorTracking) {
        return null;
      }

      return event;
    },
  });

  console.log('✅ Sentry error tracking initialized');
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!env.features.errorTracking) {
    console.error('Sentry disabled - Error:', error, context);
    return;
  }

  Sentry.captureException(error, {
    contexts: context ? { extra: context } : undefined,
  });
}

/**
 * Capture a message (non-error logging)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void {
  if (!env.features.errorTracking) {
    console.log(`Sentry disabled - ${level}:`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: context ? { extra: context } : undefined,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; name?: string } | null): void {
  if (!env.features.errorTracking) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb (manual tracking)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  if (!env.features.errorTracking) return;

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Create a custom error boundary
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Higher-order component to profile React components
 */
export const withProfiler = Sentry.withProfiler;

/**
 * Export Sentry instance for advanced usage
 */
export { Sentry };
