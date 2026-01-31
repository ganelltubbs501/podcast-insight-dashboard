import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getTeams,
  getMyPermissions,
  Team,
  TeamPermissions
} from '../services/backend';

// ============================================================================
// TYPES
// ============================================================================

interface TeamContextValue {
  // State
  currentTeam: Team | null;
  teams: Team[];
  permissions: TeamPermissions;
  isLoading: boolean;
  error: string | null;

  // Actions
  switchTeam: (teamId: string | null) => void;
  refreshTeams: () => Promise<void>;
  clearTeamContext: () => void;
}

// Default permissions for personal workspace (no team)
const DEFAULT_PERMISSIONS: TeamPermissions = {
  canViewAnalytics: true,
  canSchedule: true,
  canPublishNow: true,
  canConnectAccounts: true,
  canManageMembers: false,
  canBilling: true,
};

// ============================================================================
// CONTEXT
// ============================================================================

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [permissions, setPermissions] = useState<TeamPermissions>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load teams on mount
  const refreshTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedTeams = await getTeams();
      setTeams(loadedTeams);

      // Restore previously selected team from localStorage
      const savedTeamId = localStorage.getItem('currentTeamId');
      if (savedTeamId) {
        const savedTeam = loadedTeams.find(t => t.id === savedTeamId);
        if (savedTeam) {
          setCurrentTeam(savedTeam);
          // Load permissions for this team
          try {
            const perms = await getMyPermissions(savedTeam.id);
            setPermissions(perms.permissions);
          } catch (e) {
            console.error('Failed to load team permissions:', e);
            setPermissions(DEFAULT_PERMISSIONS);
          }
        } else {
          // Saved team no longer exists
          localStorage.removeItem('currentTeamId');
          setCurrentTeam(null);
          setPermissions(DEFAULT_PERMISSIONS);
        }
      } else {
        setCurrentTeam(null);
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } catch (err: any) {
      console.error('Failed to load teams:', err);
      setError(err.message || 'Failed to load teams');
      setTeams([]);
      setCurrentTeam(null);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  // Switch to a different team
  const switchTeam = useCallback(async (teamId: string | null) => {
    if (teamId === null) {
      // Switch to personal workspace
      localStorage.removeItem('currentTeamId');
      setCurrentTeam(null);
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      console.error('Team not found:', teamId);
      return;
    }

    // Save selection
    localStorage.setItem('currentTeamId', teamId);
    setCurrentTeam(team);

    // Load permissions for this team
    try {
      const perms = await getMyPermissions(teamId);
      setPermissions(perms.permissions);
    } catch (e) {
      console.error('Failed to load team permissions:', e);
      // Use role-based default permissions
      setPermissions(getRoleBasedPermissions(team.role));
    }
  }, [teams]);

  // Clear team context (for logout)
  const clearTeamContext = useCallback(() => {
    localStorage.removeItem('currentTeamId');
    setTeams([]);
    setCurrentTeam(null);
    setPermissions(DEFAULT_PERMISSIONS);
    setError(null);
  }, []);

  const value: TeamContextValue = {
    currentTeam,
    teams,
    permissions,
    isLoading,
    error,
    switchTeam,
    refreshTeams,
    clearTeamContext,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useTeam(): TeamContextValue {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRoleBasedPermissions(role: Team['role']): TeamPermissions {
  switch (role) {
    case 'owner':
      return {
        canViewAnalytics: true,
        canSchedule: true,
        canPublishNow: true,
        canConnectAccounts: true,
        canManageMembers: true,
        canBilling: true,
      };
    case 'admin':
      return {
        canViewAnalytics: true,
        canSchedule: true,
        canPublishNow: true,
        canConnectAccounts: true,
        canManageMembers: true,
        canBilling: false,
      };
    case 'editor':
      return {
        canViewAnalytics: true,
        canSchedule: true,
        canPublishNow: false,
        canConnectAccounts: false,
        canManageMembers: false,
        canBilling: false,
      };
    case 'viewer':
    default:
      return {
        canViewAnalytics: true,
        canSchedule: false,
        canPublishNow: false,
        canConnectAccounts: false,
        canManageMembers: false,
        canBilling: false,
      };
  }
}

// Export helper for checking specific permissions
export function usePermission(permission: keyof TeamPermissions): boolean {
  const { permissions } = useTeam();
  return permissions[permission];
}

// Export helper for checking if user can perform team actions
export function useCanManageTeam(): boolean {
  const { permissions } = useTeam();
  return permissions.canManageMembers;
}

export function useCanSchedule(): boolean {
  const { permissions } = useTeam();
  return permissions.canSchedule;
}

export function useCanConnectAccounts(): boolean {
  const { permissions } = useTeam();
  return permissions.canConnectAccounts;
}
