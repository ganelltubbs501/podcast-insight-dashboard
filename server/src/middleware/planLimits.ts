import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthRequest } from './auth.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = supabaseServiceKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Per-plan limits (per 30-day billing cycle). null = unlimited.
const PLAN_LIMITS: Record<string, { analysesPerCycle: number | null; scheduledPostsPerCycle: number | null; activeAutomations: number | null; teamMembers: number }> = {
  free:        { analysesPerCycle: 3,    scheduledPostsPerCycle: 5,    activeAutomations: 1,    teamMembers: 0 },
  starter:     { analysesPerCycle: 10,   scheduledPostsPerCycle: 20,   activeAutomations: 3,    teamMembers: 0 },
  pro:         { analysesPerCycle: 30,   scheduledPostsPerCycle: 75,   activeAutomations: null, teamMembers: 3 },
  growth:      { analysesPerCycle: 150,  scheduledPostsPerCycle: 400,  activeAutomations: null, teamMembers: 10 },
  beta:        { analysesPerCycle: null, scheduledPostsPerCycle: null, activeAutomations: null, teamMembers: 10 },
  beta_grace:  { analysesPerCycle: null, scheduledPostsPerCycle: null, activeAutomations: null, teamMembers: 10 },
};

function getLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

// Keep FREE_LIMITS export for backward compat with /api/me/usage
const FREE_LIMITS = PLAN_LIMITS.free;

/**
 * Compute the current billing cycle window anchored to the user's signup date.
 * Cycles run monthly from the anchor day/time.
 * Example: anchor = Feb 14 3:12pm → cycles are Feb 14–Mar 14, Mar 14–Apr 14, etc.
 */
export function getCycleWindow(anchor: Date, now = new Date()): { start: Date; end: Date } {
  const start = new Date(anchor);

  // Advance start forward by whole months until the next month would exceed now
  while (true) {
    const next = new Date(start);
    next.setMonth(next.getMonth() + 1);
    if (next > now) break;
    start.setTime(next.getTime());
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}

/**
 * Fetch the user's cycle_anchor_at from profiles
 */
async function getUserAnchor(userId: string): Promise<Date> {
  if (!supabase) return new Date();

  const { data } = await supabase
    .from('profiles')
    .select('cycle_anchor_at, created_at')
    .eq('id', userId)
    .maybeSingle();

  // Fall back to created_at, then to now
  const anchor = data?.cycle_anchor_at || data?.created_at || new Date().toISOString();
  return new Date(anchor);
}

/**
 * Get current usage counts for a user within their current billing cycle
 */
export async function getUserUsage(userId: string) {
  if (!supabase) return { analyses: 0, scheduledPosts: 0, activeAutomations: 0, cycleStart: '', cycleEnd: '' };

  const anchor = await getUserAnchor(userId);
  const { start, end } = getCycleWindow(anchor);

  const [analysisResult, postsResult, automationResult] = await Promise.all([
    supabase
      .from('transcripts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()),
    supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()),
    supabase
      .from('email_automations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  return {
    analyses: analysisResult.count ?? 0,
    scheduledPosts: postsResult.count ?? 0,
    activeAutomations: automationResult.count ?? 0,
    cycleStart: start.toISOString(),
    cycleEnd: end.toISOString(),
  };
}

/**
 * Check if user has hit a specific limit. Returns null if allowed, error message if blocked.
 */
function checkLimit(plan: string, usage: number, limitKey: keyof typeof PLAN_LIMITS['free'], resourceName: string): string | null {
  const limits = getLimits(plan);
  const cap = limits[limitKey];
  if (cap === null) return null; // unlimited
  if (usage >= cap) {
    return `You've hit your ${plan === 'free' ? 'Free' : plan.charAt(0).toUpperCase() + plan.slice(1)} limit for ${resourceName} this cycle. Upgrade to continue.`;
  }
  return null;
}

/**
 * Middleware: block analysis if free user exceeded cycle limit
 */
export async function enforceAnalysisLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const plan = req.user?.plan ?? 'free';
  const limits = getLimits(plan);
  if (limits.analysesPerCycle === null) { next(); return; }
  if (!supabase || !req.user?.id) { next(); return; }

  try {
    const anchor = await getUserAnchor(req.user.id);
    const { start, end } = getCycleWindow(anchor);

    const { count } = await supabase
      .from('transcripts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());

    const error = checkLimit(plan, count ?? 0, 'analysesPerCycle', 'transcript analyses');
    if (error) {
      res.status(403).json({
        error,
        code: 'plan_limit_reached',
        limit: limits.analysesPerCycle,
        used: count ?? 0,
        cycleEnd: end.toISOString(),
        upgradeRequired: true,
      });
      return;
    }
    next();
  } catch (err) {
    console.error('Analysis limit check error:', err);
    next();
  }
}

/**
 * Middleware: block scheduling if free user exceeded cycle limit
 */
export async function enforceScheduleLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const plan = req.user?.plan ?? 'free';
  const limits = getLimits(plan);
  if (limits.scheduledPostsPerCycle === null) { next(); return; }
  if (!supabase || !req.user?.id) { next(); return; }

  try {
    const anchor = await getUserAnchor(req.user.id);
    const { start, end } = getCycleWindow(anchor);

    const { count } = await supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());

    const error = checkLimit(plan, count ?? 0, 'scheduledPostsPerCycle', 'scheduled posts');
    if (error) {
      res.status(403).json({
        error,
        code: 'plan_limit_reached',
        limit: limits.scheduledPostsPerCycle,
        used: count ?? 0,
        cycleEnd: end.toISOString(),
        upgradeRequired: true,
      });
      return;
    }
    next();
  } catch (err) {
    console.error('Schedule limit check error:', err);
    next();
  }
}

/**
 * Middleware: block new automation if free user exceeded limit
 */
export async function enforceAutomationLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const plan = req.user?.plan ?? 'free';
  const limits = getLimits(plan);
  if (limits.activeAutomations === null) { next(); return; }
  if (!supabase || !req.user?.id) { next(); return; }

  try {
    const { count } = await supabase
      .from('email_automations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    const error = checkLimit(plan, count ?? 0, 'activeAutomations', 'active automations');
    if (error) {
      res.status(403).json({
        error,
        code: 'plan_limit_reached',
        limit: limits.activeAutomations,
        used: count ?? 0,
        upgradeRequired: true,
      });
      return;
    }
    next();
  } catch (err) {
    console.error('Automation limit check error:', err);
    next();
  }
}

export function getTeamMemberLimit(plan: string): number {
  return getLimits(plan).teamMembers;
}

export { FREE_LIMITS, PLAN_LIMITS, getLimits };
