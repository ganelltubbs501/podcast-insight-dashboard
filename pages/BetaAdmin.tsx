import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Headphones, BarChart3, AlertTriangle, RefreshCw, Trash2, Mail, ExternalLink } from 'lucide-react';

interface BetaMetrics {
  totalUsers: number;
  waitlistCount: number;
  connectedPodcasts: number;
  analysesToday: number;
  analysesThisWeek: number;
  betaCapacity: number;
  betaRemaining: number;
}

interface Tester {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_sign_in_at?: string;
  podcast_count: number;
  analysis_count: number;
}

const BetaAdmin: React.FC = () => {
  const [metrics, setMetrics] = useState<BetaMetrics | null>(null);
  const [testers, setTesters] = useState<Tester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBetaData();
  }, []);

  const loadBetaData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, testersRes] = await Promise.all([
        fetch('/api/admin/beta/metrics', {
          headers: { Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}` }
        }),
        fetch('/api/admin/beta/testers', {
          headers: { Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}` }
        })
      ]);

      if (!metricsRes.ok || !testersRes.ok) {
        throw new Error('Failed to load beta data');
      }

      const metricsData = await metricsRes.json();
      const testersData = await testersRes.json();

      setMetrics(metricsData);
      setTesters(testersData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeTester = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from the beta? This will delete their account and all data.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/beta/remove-tester/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}` }
      });

      if (!response.ok) {
        throw new Error('Failed to remove tester');
      }

      // Refresh data
      await loadBetaData();
      alert('Tester removed successfully');
    } catch (err: any) {
      alert(`Error removing tester: ${err.message}`);
    }
  };

  const reInviteTester = async (email: string) => {
    try {
      const response = await fetch('/api/admin/beta/reinvite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to send re-invite');
      }

      alert('Re-invite sent successfully');
    } catch (err: any) {
      alert(`Error sending re-invite: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading beta metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4">Error loading beta data: {error}</p>
          <button
            onClick={loadBetaData}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Beta Administration</h1>
        <p className="text-gray-600 mt-2">Manage beta testers and monitor system usage</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Testers</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <UserPlus className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Waitlist</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.waitlistCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <Headphones className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connected Podcasts</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.connectedPodcasts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Analyses Today</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.analysesToday || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Beta Capacity */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Beta Capacity</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Used: {metrics?.totalUsers || 0} / {metrics?.betaCapacity || 50}</span>
          <span className="text-sm text-gray-600">Remaining: {metrics?.betaRemaining || 0}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full"
            style={{ width: `${((metrics?.totalUsers || 0) / (metrics?.betaCapacity || 50)) * 100}%` }}
          />
        </div>
      </div>

      {/* Support Links */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="mailto:beta-support@loquihq.com"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <Mail className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Bug Reports</p>
              <p className="text-sm text-gray-600">beta-support@loquihq.com</p>
            </div>
          </a>
          <a
            href="/known-issues"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <AlertTriangle className="h-6 w-6 text-orange-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Known Issues</p>
              <p className="text-sm text-gray-600">View current issues & workarounds</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
          </a>
        </div>
      </div>

      {/* Testers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Beta Testers</h3>
          <p className="text-sm text-gray-600 mt-1">Manage active beta participants</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Podcasts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Analyses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testers.map((tester) => (
                <tr key={tester.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tester.email}</div>
                      {tester.name && <div className="text-sm text-gray-500">{tester.name}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tester.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tester.last_sign_in_at ? new Date(tester.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tester.podcast_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tester.analysis_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => reInviteTester(tester.email)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Send re-invite"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeTester(tester.id, tester.email)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove tester"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {testers.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            No beta testers found
          </div>
        )}
      </div>
    </div>
  );
};

export default BetaAdmin;