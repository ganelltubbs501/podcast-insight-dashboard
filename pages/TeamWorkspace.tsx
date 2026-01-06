import React, { useEffect, useState } from 'react';
import { getTeamMembers, inviteTeamMember, removeTeamMember, getActivityLog } from '../services/backend';
import { TeamMember, ActivityLog } from '../types';
import { Users, UserPlus, Trash2, Clock, Mail, Shield, CheckCircle } from 'lucide-react';

const TeamWorkspace: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TeamMember['role']>('Editor');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const m = await getTeamMembers();
    const a = await getActivityLog();
    setMembers(m);
    setActivities(a);
  };

  const handleInvite = async () => {
    if (!newEmail) return;
    await inviteTeamMember(newEmail, newRole);
    setNewEmail('');
    setShowInviteModal(false);
    loadData();
  };

  const handleRemove = async (id: string) => {
    if (window.confirm('Remove this member from the team?')) {
      await removeTeamMember(id);
      loadData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Workspace</h1>
          <p className="text-gray-500">Manage collaboration and permissions</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary transition"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

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
            <ul className="divide-y divide-gray-200">
              {members.map(member => (
                <li key={member.id} className="p-6 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary font-bold text-lg">
                       {member.name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         <h3 className="font-bold text-gray-900">{member.name}</h3>
                         {member.status === 'Pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">Pending</span>}
                         {member.role === 'Owner' && <span className="bg-accent-soft text-accent-violet text-xs px-2 py-0.5 rounded-full">Owner</span>}
                       </div>
                       <div className="flex items-center text-sm text-gray-500 gap-4 mt-0.5">
                         <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {member.email}</span>
                         <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {member.role}</span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                     <div className="text-right text-sm text-gray-500 hidden sm:block">
                        <p>Last active</p>
                        <p className="font-medium text-gray-700">{member.lastActive}</p>
                     </div>
                     {member.role !== 'Owner' && (
                       <button onClick={() => handleRemove(member.id)} className="text-gray-400 hover:text-red-500 p-2">
                         <Trash2 className="h-5 w-5" />
                       </button>
                     )}
                   </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-gray-500" />
              Recent Activity
            </h2>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {activities.map(activity => (
                <div key={activity.id} className="relative pl-8">
                  <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-white border-2 border-primary"></div>
                  <p className="text-sm text-gray-900">
                    <span className="font-bold">{activity.user}</span> {activity.action} <span className="font-medium text-primary">{activity.target}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  placeholder="colleague@example.com"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Editor">Editor (Can edit & approve)</option>
                  <option value="Contributor">Contributor (Can edit drafts)</option>
                  <option value="Viewer">Viewer (Read only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleInvite}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary"
                >
                  Send Invitation
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeamWorkspace;