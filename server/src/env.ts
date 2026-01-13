/**
 * Backend Environment Variable Validation
 *
 * Validates required backend environment variables
 * Throws descriptive errors if critical variables are missing
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface BackendEnvConfig {
  // Required
  GEMINI_API_KEY: string;
  PORT: string;
  NODE_ENV: string;

  // Optional
  GEMINI_MODEL?: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;

  // External APIs
  YOUTUBE_API_KEY?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;

  // Email
  SENDGRID_API_KEY?: string;
  FROM_EMAIL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;

  // Security
  ENCRYPTION_KEY?: string;

  // Monitoring
  SENTRY_DSN?: string;
}

/**
 * Get environment variable with validation
 */
function getEnv(key: keyof BackendEnvConfig, required: boolean = true, defaultValue?: string): string {
  const value = process.env[key];

  if (required && !value && !defaultValue) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your server/.env file.\n` +
      `See .env.example for required variables.`
    );
  }

  return value || defaultValue || '';
}

/**
 * Validate all required environment variables
 */
export function validateBackendEnv(): void {
  const missing: string[] = [];

  // Check required variables
  const required: (keyof BackendEnvConfig)[] = [
    'GEMINI_API_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required backend environment variables:\n` +
      missing.map(k => `  - ${k}`).join('\n') +
      `\n\nPlease create server/.env file based on .env.example`
    );

    console.error('❌ Backend Environment Validation Failed:', error.message);
    throw error;
  }

  console.log('✅ Backend environment variables validated');
}

/**
 * Parse allowed origins
 */
function parseOrigins(origins: string): string[] {
  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

/**
 * Export validated environment configuration
 */
export const backendEnv = {
  // Server
  port: parseInt(getEnv('PORT', false, '8080'), 10),
  nodeEnv: getEnv('NODE_ENV', false, 'development'),
  isDevelopment: getEnv('NODE_ENV', false, 'development') === 'development',
  isProduction: getEnv('NODE_ENV', false, 'development') === 'production',

  // Gemini AI
  gemini: {
    apiKey: getEnv('GEMINI_API_KEY'),
    model: getEnv('GEMINI_MODEL', false, 'gemini-2.5-flash'),
  },

  // CORS
  cors: {
    allowedOrigins: parseOrigins(
      getEnv('ALLOWED_ORIGINS', false, 'https://loquihq-beta.web.app,http://localhost:3000,http://localhost:5173')
    ),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', false, '900000'), 10),
    maxRequests: parseInt(getEnv('RATE_LIMIT_MAX_REQUESTS', false, '100'), 10),
  },

  // External APIs
  youtube: {
    apiKey: getEnv('YOUTUBE_API_KEY', false),
  },

  spotify: {
    clientId: getEnv('SPOTIFY_CLIENT_ID', false),
    clientSecret: getEnv('SPOTIFY_CLIENT_SECRET', false),
  },

  // Email
  email: {
    sendgrid: {
      apiKey: getEnv('SENDGRID_API_KEY', false),
      fromEmail: getEnv('FROM_EMAIL', false),
    },
    smtp: {
      host: getEnv('SMTP_HOST', false),
      port: parseInt(getEnv('SMTP_PORT', false, '587'), 10),
      user: getEnv('SMTP_USER', false),
      pass: getEnv('SMTP_PASS', false),
      from: getEnv('SMTP_FROM', false),
    },
  },

  // Security
  security: {
    encryptionKey: getEnv('ENCRYPTION_KEY', false),
  },

  // Monitoring
  sentry: {
    dsn: getEnv('SENTRY_DSN', false),
  },
} as const;

export type BackendEnv = typeof backendEnv;
