import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { backendEnv } from '../env.js';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    plan?: string;
    betaExpiresAt?: string | null;
    graceExpiresAt?: string | null;
  };
}

// Create Supabase client with service role key for auth verification
// Note: SUPABASE_SERVICE_ROLE_KEY should be added to env.ts validation
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn('⚠️  SUPABASE_URL not configured - authentication will fail');
}

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not configured - using anon key (not recommended for production)');
}

// Use service role key if available, otherwise fall back to anon key (development only)
const supabaseKey = supabaseServiceKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Authentication middleware
 * Validates JWT token from Authorization header and attaches user to request
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!supabase) {
    console.error('❌ Supabase client not initialized - check environment variables');
    res.status(500).json({ error: 'Authentication service not configured' });
    return;
  }

  const authHeader = req.headers.authorization;

  // Check for Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or invalid Authorization header. Expected format: "Bearer <token>"'
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.warn('🔒 Auth verification failed:', error.message);
      res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please log in again'
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Continue to next middleware/route handler
    next();
  } catch (err: any) {
    console.error('❌ Authentication error:', err);
    res.status(500).json({
      error: 'Authentication failed',
      message: backendEnv.isDevelopment ? err.message : 'Internal server error'
    });
    return;
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block if missing
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!supabase) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(); // No token provided, continue without user
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
  } catch (err) {
    // Silently fail for optional auth
    console.debug('Optional auth failed:', err);
  }

  next();
}

/**
 * Helper to get user ID from request (for use in route handlers)
 */
export function getUserId(req: AuthRequest): string {
  if (!req.user?.id) {
    throw new Error('User not authenticated. Use requireAuth middleware first.');
  }
  return req.user.id;
}
