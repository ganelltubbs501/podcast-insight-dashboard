import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthRequest } from './auth.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = supabaseServiceKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Plan check middleware — runs after requireAuth.
 * Computes the effective plan dynamically from stored columns.
 * Never writes to the DB — the cron job handles beta → free transitions.
 *
 * Truth table (when stored plan = 'beta'):
 *   now <= beta_expires_at            → effective = 'beta'       (full access)
 *   beta_expires_at < now <= grace_expires_at → effective = 'beta_grace' (full access + warning)
 *   now > grace_expires_at            → effective = 'free'       (cron will catch up)
 *
 * For any other stored plan value, the effective plan = stored plan.
 */
export async function attachPlan(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!supabase || !req.user?.id) {
    next();
    return;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, beta_expires_at, grace_expires_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error || !profile) {
      req.user.plan = 'free';
      req.user.betaExpiresAt = null;
      req.user.graceExpiresAt = null;
      next();
      return;
    }

    req.user.betaExpiresAt = profile.beta_expires_at ?? null;
    req.user.graceExpiresAt = profile.grace_expires_at ?? null;

    if (profile.plan !== 'beta') {
      // Non-beta plans use stored value as-is
      req.user.plan = profile.plan;
      next();
      return;
    }

    // Compute effective plan for beta users
    const now = Date.now();
    const betaEnd = profile.beta_expires_at ? new Date(profile.beta_expires_at).getTime() : Infinity;
    const graceEnd = profile.grace_expires_at ? new Date(profile.grace_expires_at).getTime() : betaEnd;

    if (now <= betaEnd) {
      req.user.plan = 'beta';
    } else if (now <= graceEnd) {
      req.user.plan = 'beta_grace';
    } else {
      // Grace expired — treat as free until cron flips the DB
      req.user.plan = 'free';
    }

    next();
  } catch (err) {
    console.error('Plan check error:', err);
    req.user.plan = 'free';
    req.user.betaExpiresAt = null;
    req.user.graceExpiresAt = null;
    next();
  }
}
