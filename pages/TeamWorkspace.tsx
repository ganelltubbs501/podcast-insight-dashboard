import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTeamMembers,
  removeMember,
  createInvite,
  getInvites,
  revokeInvite,
  updateMemberRole,
  TeamMember,
  TeamInvite
} from '../services/backend';
import { useTeam, useCanManageTeam } from '../contexts/TeamContext';
import {
  Users, UserPlus, Trash2, Clock, Mail, Shield, Copy, Check,
  ChevronDown, AlertCircle, Loader2, X as XIcon, Lock
} from 'lucide-react';
import { User } from '../types';

const TEAM_PLANS = ['beta', 'beta_grace', 'pro', 'growth'];

const TeamWorkspace: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const hasTeamAccess = TEAM_PLANS.includes(user.plan);
  const { currentTeam, teams, switchTeam, refreshTeams, permissions, isLoading: teamsLoading } = useTeam();
  const canManage = useCanManageTeam();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; teamName: string; emailSent?: boolean; email?: string } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Team selector state
  const [showTeamSelector, setShowTeamSelector] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      loadData();
    }
  }, [currentTeam]);

  const loadData = async () => {
    if (!currentTeam) return;

    setIsLoading(true);
    setError(null);

    try {
      const [membersData, invitesData] = await Promise.all([
        getTeamMembers(currentTeam.id),
        canManage ? getInvites(currentTeam.id) : Promise.resolve([])
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err: any) {
      console.error('Failed to load team data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!newEmail || !currentTeam) return;

    setIsInviting(true);
    setError(null);

    try {
      const result = await createInvite(currentTeam.id, newEmail, newRole);
      setInviteResult({ url: result.inviteUrl || '', teamName: result.teamName || currentTeam.name, emailSent: result.emailSent, email: result.email });
      setNewEmail('');
      loadData(); // Refresh invites list
    } catch (err: any) {
      console.error('Failed to send invite:', err);
      setError(err.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (inviteResult?.url) {
      navigator.clipboard.writeText(inviteResult.url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!currentTeam) return;

    if (window.confirm('Remove this member from the team?')) {
      try {
        await removeMember(currentTeam.id, userId);
        loadData();
      } catch (err: any) {
        console.error('Failed to remove member:', err);
        setError(err.message || 'Failed to remove member');
      }
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!currentTeam) return;

    if (window.confirm('Revoke this invite?')) {
      try {
        await revokeInvite(currentTeam.id, inviteId);
        loadData();
      } catch (err: any) {
        console.error('Failed to revoke invite:', err);
        setError(err.message || 'Failed to revoke invite');
      }
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!currentTeam) return;

    try {
      await updateMemberRole(currentTeam.id, userId, newRole);
      loadData();
    } catch (err: any) {
      console.error('Failed to update role:', err);
      setError(err.message || 'Failed to update role');
    }
  };

  const handleTeamSwitch = (teamId: string | null) => {
    switchTeam(teamId);
    setShowTeamSelector(false);
  };

  // Plan gate: require Pro, Growth, or Beta
  if (!hasTeamAccess) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center rounded-xl shadow-sm p-10" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <Lock className="h-16 w-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#111827' }}>Team Workspace</h2>
          <p className="text-lg mb-2" style={{ color: '#374151' }}>
            Collaborate with your team on podcast content.
          </p>
          <p className="mb-8" style={{ color: '#6B7280' }}>
            Team Workspace is available on Pro and Growth plans. Upgrade to invite team members and manage roles.
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition text-lg"
          >
            View Plans & Upgrade
          </button>
        </div>
      </div>
      </div>
    );
  }

  // No team selected state
  if (!currentTeam && !teamsLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <Users className="h-16 w-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>No Team Selected</h2>
          <p className="mb-6" style={{ color: '#6B7280' }}>
            {teams.length > 0
              ? 'Select a team to manage members and collaboration.'
              : 'Create a team in Settings to start collaborating.'}
          </p>
          {teams.length > 0 && (
            <div className="relative inline-block">
              <button
                onClick={() => setShowTeamSelector(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
              >
                Select Team
                <ChevronDown className="h-4 w-4" />
              </button>
              {showTeamSelector && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-lg shadow-xl z-50" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      className="w-full px-4 py-3 text-left first:rounded-t-lg last:rounded-b-lg"
                      style={{ backgroundColor: '#FFFFFF' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <div className="font-medium" style={{ color: '#111827' }}>{team.name}</div>
                      <div className="text-sm capitalize" style={{ color: '#6B7280' }}>{team.role}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Team Workspace</h1>
            {/* Team Selector */}
            <div className="relative">
              <button
                onClick={() => setShowTeamSelector(!showTeamSelector)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition"
                style={{ backgroundColor: '#F3F4F6', color: '#111827' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
              >
                <span className="font-medium">{currentTeam?.name}</span>
                <ChevronDown className="h-4 w-4" style={{ color: '#6B7280' }} />
              </button>
              {showTeamSelector && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-lg shadow-xl z-50" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div style={{ borderBottom: '1px solid #F3F4F6' }} className="p-2">
                    <button
                      onClick={() => handleTeamSwitch(null)}
                      className={`w-full px-3 py-2 text-left rounded-lg ${!currentTeam ? 'bg-primary/10' : ''}`}
                      style={{ backgroundColor: !currentTeam ? undefined : '#FFFFFF' }}
                      onMouseEnter={e => { if (currentTeam) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                      onMouseLeave={e => { if (currentTeam) e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                    >
                      <div className="font-medium" style={{ color: '#111827' }}>Personal Workspace</div>
                      <div className="text-sm" style={{ color: '#6B7280' }}>Your own content</div>
                    </button>
                  </div>
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      className={`w-full px-3 py-2 text-left ${currentTeam?.id === team.id ? 'bg-primary/10' : ''}`}
                      style={{ backgroundColor: currentTeam?.id === team.id ? undefined : '#FFFFFF' }}
                      onMouseEnter={e => { if (currentTeam?.id !== team.id) e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                      onMouseLeave={e => { if (currentTeam?.id !== team.id) e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                    >
                      <div className="font-medium" style={{ color: '#111827' }}>{team.name}</div>
                      <div className="text-sm capitalize" style={{ color: '#6B7280' }}>{team.role}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p style={{ color: '#6B7280' }}>
            Manage collaboration and permissions
            {currentTeam && <span className="ml-2 text-sm">({currentTeam.role})</span>}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg flex items-center gap-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members List */}
        <div className="lg:col-span-2">
          <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <h2 className="font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                <Users className="h-5 w-5" style={{ color: '#6B7280' }} />
                Team Members ({members.length})
              </h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center" style={{ color: '#6B7280' }}>
                No team members yet. Invite someone to get started!
              </div>
            ) : (
              <ul>
                {members.map((member, i) => (
                  <li key={member.id} className="p-6 flex items-center justify-between" style={{ borderTop: i > 0 ? '1px solid #E5E7EB' : undefined }}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold" style={{ color: '#111827' }}>{member.name}</h3>
                          {member.role === 'owner' && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8' }}>Owner</span>
                          )}
                          {member.role === 'admin' && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>Admin</span>
                          )}
                        </div>
                        <div className="flex items-center text-sm gap-4 mt-0.5" style={{ color: '#6B7280' }}>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" /> {member.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Role selector (for admins/owners editing non-owners) */}
                      {canManage && member.role !== 'owner' && (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                          className="text-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                          style={{ border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#FFFFFF' }}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                      {member.role !== 'owner' && canManage && (
                        <button
                          onClick={() => handleRemove(member.userId)}
                          className="p-2"
                          style={{ color: '#6B7280' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pending Invites */}
          {canManage && invites.length > 0 && (
            <div className="rounded-xl shadow-sm overflow-hidden mt-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFBEB' }}>
                <h2 className="font-bold flex items-center gap-2" style={{ color: '#111827' }}>
                  <Clock className="h-5 w-5" style={{ color: '#D97706' }} />
                  Pending Invites ({invites.length})
                </h2>
              </div>
              <ul>
                {invites.map((invite, i) => (
                  <li key={invite.id} className="p-4 flex items-center justify-between" style={{ borderTop: i > 0 ? '1px solid #E5E7EB' : undefined }}>
                    <div>
                      <div className="font-medium" style={{ color: '#111827' }}>{invite.email}</div>
                      <div className="text-sm" style={{ color: '#6B7280' }}>
                        Role: {invite.role} | Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                        {invite.isExpired && <span style={{ color: '#EF4444' }} className="ml-2">(Expired)</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="p-2"
                      style={{ color: '#6B7280' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Permissions Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h2 className="font-bold flex items-center gap-2 mb-6" style={{ color: '#111827' }}>
              <Shield className="h-5 w-5" style={{ color: '#6B7280' }} />
              Your Permissions
            </h2>
            <ul className="space-y-3">
              {Object.entries(permissions).map(([key, value]) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span style={{ color: '#374151' }}>
                    {key.replace(/can([A-Z])/g, ' $1').trim()}
                  </span>
                  <span style={{ color: value ? '#16A34A' : '#9CA3AF' }}>
                    {value ? <Check className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl shadow-xl max-w-md w-full p-6" style={{ backgroundColor: '#FFFFFF' }}>
            {inviteResult ? (
              // Success state
              <>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#111827' }}>
                  {inviteResult.emailSent ? 'Invitation Sent!' : 'Invitation Created!'}
                </h2>
                {inviteResult.emailSent ? (
                  <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <p className="text-sm" style={{ color: '#166534' }}>
                      An invite email has been sent to <strong>{inviteResult.email}</strong>.
                    </p>
                  </div>
                ) : (
                  <p className="mb-4" style={{ color: '#6B7280' }}>
                    Share this link to join <strong>{inviteResult.teamName}</strong>:
                  </p>
                )}
                <div className="flex items-center gap-2 p-3 rounded-lg mb-2" style={{ backgroundColor: '#F3F4F6' }}>
                  <input
                    type="text"
                    value={inviteResult.url}
                    readOnly
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: '#111827' }}
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="p-2 rounded-lg transition"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {copiedInvite ? (
                      <Check className="h-4 w-4" style={{ color: '#16A34A' }} />
                    ) : (
                      <Copy className="h-4 w-4" style={{ color: '#6B7280' }} />
                    )}
                  </button>
                </div>
                {inviteResult.emailSent && (
                  <p className="text-xs mb-4" style={{ color: '#6B7280' }}>You can also copy and share this link manually.</p>
                )}
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteResult(null);
                  }}
                  className="w-full px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 mt-2"
                >
                  Done
                </button>
              </>
            ) : (
              // Input form
              <>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#111827' }}>Invite Team Member</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    style={{ border: '1px solid #D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' }}
                    placeholder="colleague@example.com"
                    disabled={isInviting}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    style={{ border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#FFFFFF' }}
                    disabled={isInviting}
                  >
                    <option value="admin">Admin (Full access, can manage members)</option>
                    <option value="editor">Editor (Can schedule & edit content)</option>
                    <option value="viewer">Viewer (Read only)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 font-medium rounded-lg"
                    style={{ color: '#374151' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    disabled={isInviting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={isInviting || !newEmail}
                    className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Invitation
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default TeamWorkspace;
