/**
 * Environment Variable Validation Utility
 *
 * Validates required environment variables at runtime
 * Throws descriptive errors if critical variables are missing
 */

interface EnvConfig {
  // Supabase (Required)
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;

  // Backend API
  VITE_API_BASE_URL: string;

  // Application
  VITE_APP_ENV?: string;

  // Optional Features
  VITE_ENABLE_ANALYTICS?: string;
  VITE_ENABLE_ERROR_TRACKING?: string;
  VITE_GA_MEASUREMENT_ID?: string;
  VITE_SENTRY_DSN?: string;
}

/**
 * Get environment variable with validation
 */
function getEnv(key: keyof EnvConfig, required: boolean = true): string {
  const value = import.meta.env[key];

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env.local file or environment configuration.\n` +
      `See .env.example for required variables.`
    );
  }

  return value || '';
}

/**
 * Validate all required environment variables
 * Call this early in the application lifecycle
 */
export function validateEnv(): void {
  const missing: string[] = [];

  // Check required variables
  const required: (keyof EnvConfig)[] = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_API_BASE_URL'
  ];

  for (const key of required) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables:\n` +
      missing.map(k => `  - ${k}`).join('\n') +
      `\n\nPlease create a .env.local file based on .env.example`
    );

    console.error('❌ Environment Validation Failed:', error.message);
    throw error;
  }

  console.log('✅ Environment variables validated successfully');
}

/**
 * Export validated environment variables
 */
export const env = {
  // Required
  supabase: {
    url: getEnv('VITE_SUPABASE_URL'),
    anonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
  },

  api: {
    baseUrl: getEnv('VITE_API_BASE_URL'),
  },

  app: {
    env: getEnv('VITE_APP_ENV', false) || 'development',
    isDevelopment: (getEnv('VITE_APP_ENV', false) || 'development') === 'development',
    isProduction: (getEnv('VITE_APP_ENV', false) || 'development') === 'production',
  },

  // Optional features
  features: {
    analytics: getEnv('VITE_ENABLE_ANALYTICS', false) === 'true',
    errorTracking: getEnv('VITE_ENABLE_ERROR_TRACKING', false) === 'true',
  },

  // Analytics
  analytics: {
    googleId: getEnv('VITE_GA_MEASUREMENT_ID', false),
  },

  // Error tracking
  sentry: {
    dsn: getEnv('VITE_SENTRY_DSN', false),
  },
} as const;

/**
 * Type-safe access to environment variables
 */
export type Env = typeof env;
