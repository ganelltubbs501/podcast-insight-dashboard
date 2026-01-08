/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse and ensures fair usage
 * Uses different limits for different endpoint types
 */

import rateLimit from 'express-rate-limit';
import { backendEnv } from '../env.js';
import { captureMessage } from '../utils/sentry.js';

/**
 * General API rate limiter
 * Applies to all endpoints by default
 */
export const generalLimiter = rateLimit({
  windowMs: backendEnv.rateLimit.windowMs, // Default: 15 minutes
  max: backendEnv.rateLimit.maxRequests,   // Default: 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 'Check the Retry-After header for when you can retry.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  // Skip successful requests that don't hit the rate limit
  skipSuccessfulRequests: false,
  // Skip failed requests (4xx, 5xx)
  skipFailedRequests: false,
  handler: (req, res) => {
    // Log to Sentry for monitoring
    captureMessage(
      `Rate limit exceeded: ${req.ip} on ${req.path}`,
      'warning',
      {
        ip: req.ip,
        path: req.path,
        method: req.method
      }
    );

    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Strict rate limiter for AI analysis endpoints
 * More restrictive since these consume expensive AI API credits
 */
export const aiAnalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: backendEnv.isProduction ? 10 : 50, // 10 requests per 15 min in production, 50 in dev
  message: {
    error: 'Too many analysis requests. Please wait before analyzing more transcripts.',
    limit: backendEnv.isProduction ? 10 : 50,
    window: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Alert on AI analysis rate limits (higher priority)
    captureMessage(
      `AI Analysis rate limit exceeded: ${req.ip}`,
      'error', // Higher severity since this indicates potential abuse
      {
        ip: req.ip,
        path: req.path,
        limit: backendEnv.isProduction ? 10 : 50
      }
    );

    res.status(429).json({
      error: 'Analysis rate limit exceeded',
      message: `You can only analyze ${backendEnv.isProduction ? 10 : 50} transcripts per 15 minutes. This limit helps manage API costs.`,
      retryAfter: res.getHeader('Retry-After'),
      tip: 'Consider analyzing longer transcripts to maximize value per request.'
    });
  }
});

/**
 * Moderate rate limiter for repurposing endpoints
 * Less strict than analysis but still limited
 */
export const repurposingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: backendEnv.isProduction ? 20 : 100, // 20 requests per 10 min in production
  message: {
    error: 'Too many repurposing requests.',
    limit: backendEnv.isProduction ? 20 : 100
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Repurposing rate limit exceeded',
      message: `You can only generate ${backendEnv.isProduction ? 20 : 100} repurposed content pieces per 10 minutes.`,
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Very lenient rate limiter for health checks and static endpoints
 */
export const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * IP-based rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'Too many authentication attempts.',
    limit: 5
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Custom rate limiter factory
 * Use this to create custom rate limiters for specific endpoints
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests',
      limit: options.max
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests. Please try again later.',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
}

/**
 * Rate limit bypass for trusted IPs (optional)
 * Use with caution in production
 */
export function createTrustedIpLimiter(trustedIps: string[]) {
  return rateLimit({
    windowMs: backendEnv.rateLimit.windowMs,
    max: backendEnv.rateLimit.maxRequests,
    skip: (req) => {
      const clientIp = req.ip || req.socket.remoteAddress;
      return trustedIps.includes(clientIp || '');
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}
