import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthRequest } from './auth.js';

// ============================================================================
// TYPES
// ============================================================================

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamPermissions {
  canViewAnalytics: boolean;
  canSchedule: boolean;
  canPublishNow: boolean;
  canConnectAccounts: boolean;
  canManageMembers: boolean;
  canBilling: boolean;
}

export interface TeamAuthRequest extends AuthRequest {
  teamMembership?: {
    teamId: string;
    role: TeamRole;
    permissions: TeamPermissions;
  };
}

// ============================================================================
// ROLE PERMISSIONS
// ============================================================================

export const ROLE_PERMISSIONS: Record<TeamRole, TeamPermissions> = {
  viewer: {
    canViewAnalytics: true,
    canSchedule: false,
    canPublishNow: false,
    canConnectAccounts: false,
    canManageMembers: false,
    canBilling: false,
  },
  editor: {
    canViewAnalytics: true,
    canSchedule: true,
    canPublishNow: false,
    canConnectAccounts: false,
    canManageMembers: false,
    canBilling: false,
  },
  admin: {
    canViewAnalytics: true,
    canSchedule: true,
    canPublishNow: true,
    canConnectAccounts: true,
    canManageMembers: true,
    canBilling: false,
  },
  owner: {
    canViewAnalytics: true,
    canSchedule: true,
    canPublishNow: true,
    canConnectAccounts: true,
    canManageMembers: true,
    canBilling: true,
  },
};

// Role hierarchy for comparison (higher index = more permissions)
const ROLE_HIERARCHY: TeamRole[] = ['viewer', 'editor', 'admin', 'owner'];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all roles at or above a given minimum role
 */
function getRolesAtOrAbove(minRole: TeamRole): TeamRole[] {
  const minIndex = ROLE_HIERARCHY.indexOf(minRole);
  return ROLE_HIERARCHY.slice(minIndex);
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: TeamRole): TeamPermissions {
  return ROLE_PERMISSIONS[role];
}

// Supabase admin client for server-side queries
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null;

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware factory to require team membership with minimum role
 *
 * Usage:
 *   app.get('/api/team/:teamId/members', requireAuth, requireTeamRole('viewer'), handler)
 *   app.patch('/api/team/:teamId', requireAuth, requireTeamRole('admin'), handler)
 *   app.delete('/api/team/:teamId', requireAuth, requireTeamRole(['owner']), handler)
 *
 * @param minRole - Minimum required role, or array of allowed roles
 */
export function requireTeamRole(minRole: TeamRole | TeamRole[]) {
  const allowedRoles = Array.isArray(minRole) ? minRole : getRolesAtOrAbove(minRole);

  return async (req: TeamAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const teamId = req.params.teamId;
    const userId = req.user?.id;

    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not initialized');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!teamId) {
      res.status(400).json({ error: 'Team ID required' });
      return;
    }

    try {
      // Query team_members for user's role in this team
      const { data: membership, error } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (error || !membership) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this team'
        });
        return;
      }

      const userRole = membership.role as TeamRole;

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires ${Array.isArray(minRole) ? minRole.join(' or ') : minRole} role or higher`,
          requiredRole: minRole,
          currentRole: userRole
        });
        return;
      }

      // Attach team membership info to request
      req.teamMembership = {
        teamId,
        role: userRole,
        permissions: getPermissionsForRole(userRole),
      };

      next();
    } catch (err: any) {
      console.error('❌ Team auth error:', err);
      res.status(500).json({ error: 'Failed to verify team membership' });
      return;
    }
  };
}

/**
 * Helper to check if user has a specific permission
 * Use after requireTeamRole middleware
 */
export function hasPermission(
  req: TeamAuthRequest,
  permission: keyof TeamPermissions
): boolean {
  return req.teamMembership?.permissions[permission] ?? false;
}

/**
 * Get team membership from request (for use in handlers)
 */
export function getTeamMembership(req: TeamAuthRequest) {
  if (!req.teamMembership) {
    throw new Error('Team membership not found. Use requireTeamRole middleware first.');
  }
  return req.teamMembership;
}
