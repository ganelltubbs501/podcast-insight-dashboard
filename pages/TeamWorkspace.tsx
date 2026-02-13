import React, { useEffect, useState } from 'react';
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
  ChevronDown, AlertCircle, Loader2, X as XIcon
} from 'lucide-react';

const TeamWorkspace: React.FC = () => {
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

  // No team selected state
  if (!currentTeam && !teamsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Team Selected</h2>
          <p className="text-gray-500 mb-6">
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
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{team.role}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Team Workspace</h1>
            {/* Team Selector */}
            <div className="relative">
              <button
                onClick={() => setShowTeamSelector(!showTeamSelector)}
                className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 transition"
              >
                <span className="font-medium">{currentTeam?.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {showTeamSelector && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-2 border-b border-gray-100">
                    <button
                      onClick={() => handleTeamSwitch(null)}
                      className={`w-full px-3 py-2 text-left rounded-lg hover:bg-gray-50 ${!currentTeam ? 'bg-primary/10' : ''}`}
                    >
                      <div className="font-medium text-gray-900">Personal Workspace</div>
                      <div className="text-sm text-gray-500">Your own content</div>
                    </button>
                  </div>
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSwitch(team.id)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${currentTeam?.id === team.id ? 'bg-primary/10' : ''}`}
                    >
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{team.role}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-500">
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Team Members ({members.length})
              </h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No team members yet. Invite someone to get started!
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {members.map(member => (
                  <li key={member.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{member.name}</h3>
                          {member.role === 'owner' && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">Owner</span>
                          )}
                          {member.role === 'admin' && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Admin</span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 gap-4 mt-0.5">
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
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                      {member.role !== 'owner' && canManage && (
                        <button
                          onClick={() => handleRemove(member.userId)}
                          className="text-gray-500 hover:text-red-500 p-2"
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pending Invites ({invites.length})
                </h2>
              </div>
              <ul className="divide-y divide-gray-200">
                {invites.map(invite => (
                  <li key={invite.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{invite.email}</div>
                      <div className="text-sm text-gray-500">
                        Role: {invite.role} | Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                        {invite.isExpired && <span className="text-red-500 ml-2">(Expired)</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="text-gray-500 hover:text-red-500 p-2"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-gray-500" />
              Your Permissions
            </h2>
            <ul className="space-y-3">
              {Object.entries(permissions).map(([key, value]) => (
                <li key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {key.replace(/can([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={value ? 'text-green-600' : 'text-gray-400'}>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            {inviteResult ? (
              // Success state
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {inviteResult.emailSent ? 'Invitation Sent!' : 'Invitation Created!'}
                </h2>
                {inviteResult.emailSent ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-800 text-sm">
                      An invite email has been sent to <strong>{inviteResult.email}</strong>.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 mb-4">
                    Share this link to join <strong>{inviteResult.teamName}</strong>:
                  </p>
                )}
                <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg mb-2">
                  <input
                    type="text"
                    value={inviteResult.url}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="p-2 hover:bg-gray-200 rounded-lg transition"
                  >
                    {copiedInvite ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
                {inviteResult.emailSent && (
                  <p className="text-xs text-gray-500 mb-4">You can also copy and share this link manually.</p>
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    placeholder="colleague@example.com"
                    disabled={isInviting}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
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
                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
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
  );
};

export default TeamWorkspace;
