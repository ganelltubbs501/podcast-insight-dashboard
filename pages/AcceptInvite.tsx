import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInvite } from '../services/backend';
import { useTeam } from '../contexts/TeamContext';
import { getStoredUser } from '../services/auth';
import { Users, CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';

type InviteStatus = 'loading' | 'authenticating' | 'success' | 'error' | 'not_logged_in';

interface InviteResult {
  teamId: string;
  teamName: string;
  role: string;
}

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshTeams, switchTeam } = useTeam();

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    handleInvite();
  }, [token]);

  const handleInvite = async () => {
    if (!token) {
      setStatus('error');
      setError('Invalid invite link - no token provided');
      return;
    }

    // Check if user is logged in
    setStatus('authenticating');
    const user = await getStoredUser();

    if (!user) {
      setStatus('not_logged_in');
      // Store the invite URL to redirect back after login
      localStorage.setItem('pendingInviteToken', token);
      return;
    }

    // User is logged in, accept the invite
    setStatus('loading');
    try {
      const response = await acceptInvite(token);
      setResult({
        teamId: response.teamId,
        teamName: response.teamName,
        role: response.role
      });
      setStatus('success');

      // Refresh teams list and switch to the new team
      await refreshTeams();
      switchTeam(response.teamId);

      // Clear any pending invite token
      localStorage.removeItem('pendingInviteToken');
    } catch (err: any) {
      console.error('Failed to accept invite:', err);
      setStatus('error');
      setError(err.message || 'Failed to accept invite');
    }
  };

  const handleGoToLogin = () => {
    // Store token and redirect to login
    if (token) {
      localStorage.setItem('pendingInviteToken', token);
    }
    navigate('/login');
  };

  const handleGoToTeam = () => {
    navigate('/team');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* Loading State */}
        {(status === 'loading' || status === 'authenticating') && (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-textPrimary mb-2">
              {status === 'authenticating' ? 'Checking authentication...' : 'Accepting Invite...'}
            </h1>
            <p className="text-textMuted">Please wait while we process your invitation.</p>
          </>
        )}

        {/* Not Logged In State */}
        {status === 'not_logged_in' && (
          <>
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-textPrimary mb-2">Login Required</h1>
            <p className="text-textMuted mb-6">
              You need to be logged in to accept this team invitation. Please log in or create an account to continue.
            </p>
            <button
              onClick={handleGoToLogin}
              className="w-full bg-primary text-white font-medium px-6 py-3 rounded-lg hover:bg-primary/90 transition"
            >
              Go to Login
            </button>
            <p className="text-sm text-textMuted mt-4">
              After logging in, you'll be automatically redirected to accept this invite.
            </p>
          </>
        )}

        {/* Success State */}
        {status === 'success' && result && (
          <>
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-textPrimary mb-2">Welcome to the Team!</h1>
            <p className="text-textMuted mb-2">
              You've successfully joined <strong>{result.teamName}</strong>
            </p>
            <p className="text-sm text-textMuted mb-6">
              Your role: <span className="font-medium capitalize">{result.role}</span>
            </p>
            <button
              onClick={handleGoToTeam}
              className="w-full bg-primary text-white font-medium px-6 py-3 rounded-lg hover:bg-primary/90 transition mb-3"
            >
              <span className="flex items-center justify-center gap-2">
                <Users className="h-5 w-5" />
                Go to Team Workspace
              </span>
            </button>
            <button
              onClick={handleGoHome}
              className="w-full text-textSecondary font-medium px-6 py-2 hover:bg-gray-100 rounded-lg transition"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-textPrimary mb-2">Invitation Failed</h1>
            <p className="text-textMuted mb-6">{error || 'Something went wrong with your invitation.'}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-white font-medium px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Try Again
              </button>
              <button
                onClick={handleGoHome}
                className="w-full text-textSecondary font-medium px-6 py-2 hover:bg-gray-100 rounded-lg transition"
              >
                Go to Dashboard
              </button>
            </div>
            <p className="text-sm text-textMuted mt-6">
              Common issues:
            </p>
            <ul className="text-sm text-textMuted text-left mt-2 space-y-1">
              <li>- The invite link has expired (valid for 7 days)</li>
              <li>- The invite has already been used</li>
              <li>- The invite was revoked by an admin</li>
              <li>- You're already a member of this team</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
