/**
 * Sentry Error Tracking - Backend Configuration
 *
 * Initializes Sentry for server-side error tracking,
 * performance monitoring, and request tracing.
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { backendEnv } from '../env.js';

/**
 * Initialize Sentry for backend error tracking
 */
export function initSentry(): void {
  // Only initialize if DSN is provided
  if (!backendEnv.sentry.dsn) {
    console.log('Sentry error tracking is disabled (no DSN configured)');
    return;
  }

  Sentry.init({
    dsn: backendEnv.sentry.dsn,

    // Environment
    environment: backendEnv.nodeEnv,

    // Integrations
    integrations: [
      // Performance profiling
      nodeProfilingIntegration(),
    ],

    // Performance monitoring
    tracesSampleRate: backendEnv.isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling sample rate
    profilesSampleRate: backendEnv.isProduction ? 0.1 : 1.0,

    // Release tracking
    release: process.env.npm_package_version || 'unknown',

    // Ignore specific errors
    ignoreErrors: [
      // Expected user errors
      'Missing contentInput',
      'Missing type',
      'Missing context',
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove authorization headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Remove sensitive query params
      if (event.request?.query_string) {
        // Implement if needed
      }

      // Don't send events in development unless explicitly enabled
      if (backendEnv.isDevelopment && !backendEnv.sentry.dsn) {
        return null;
      }

      return event;
    },
  });

  console.log('✅ Sentry error tracking initialized (backend)');
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, {
    contexts: context ? { extra: context } : undefined,
  });
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: Record<string, any>
): void {
  Sentry.captureMessage(message, {
    level,
    contexts: context ? { extra: context } : undefined,
  });
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; ip?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      ip_address: user.ip,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Express error handler middleware
 * Must be registered AFTER all routes
 */
export const errorHandler = Sentry.expressErrorHandler();

/**
 * Express request handler middleware
 * Must be registered BEFORE all routes
 */
export const requestHandler = Sentry.setupExpressErrorHandler;

/**
 * Export Sentry instance
 */
export { Sentry };
