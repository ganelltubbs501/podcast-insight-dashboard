import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Linkedin, Check, X, AlertCircle, ExternalLink, Loader2, Unplug } from 'lucide-react';
import { getLinkedInStatus, connectLinkedIn, disconnectLinkedIn } from '../services/linkedin';

interface LinkedInConnection {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
}

const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [linkedIn, setLinkedIn] = useState<LinkedInConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle OAuth callback parameters
  useEffect(() => {
    const linkedInStatus = searchParams.get('linkedin');
    const linkedInName = searchParams.get('name');
    const linkedInMessage = searchParams.get('message');

    if (linkedInStatus === 'connected') {
      setMessage({
        type: 'success',
        text: linkedInName ? `Successfully connected as ${linkedInName}!` : 'LinkedIn connected successfully!',
      });
      // Clear the URL params
      searchParams.delete('linkedin');
      searchParams.delete('name');
      setSearchParams(searchParams, { replace: true });
    } else if (linkedInStatus === 'error') {
      setMessage({
        type: 'error',
        text: linkedInMessage || 'Failed to connect LinkedIn. Please try again.',
      });
      // Clear the URL params
      searchParams.delete('linkedin');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Load LinkedIn status
  useEffect(() => {
    loadLinkedInStatus();
  }, []);

  const loadLinkedInStatus = async () => {
    try {
      setLoading(true);
      const status = await getLinkedInStatus();
      setLinkedIn(status);
    } catch (err: any) {
      console.error('Failed to load LinkedIn status:', err);
      setLinkedIn({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectLinkedIn = async () => {
    try {
      setConnecting(true);
      setMessage(null);
      await connectLinkedIn();
      // User will be redirected to LinkedIn
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start LinkedIn connection' });
      setConnecting(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    if (!confirm('Are you sure you want to disconnect LinkedIn? You will need to reconnect to post content.')) {
      return;
    }

    try {
      setDisconnecting(true);
      setMessage(null);
      await disconnectLinkedIn();
      setLinkedIn({ connected: false });
      setMessage({ type: 'success', text: 'LinkedIn disconnected successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect LinkedIn' });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and connected services</p>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Connected Accounts Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Connect your social media accounts to post content directly from LoquiHQ
          </p>
        </div>

        <div className="p-6">
          {/* LinkedIn Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                <Linkedin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">LinkedIn</h3>
                {loading ? (
                  <p className="text-sm text-gray-500">Checking connection...</p>
                ) : linkedIn?.connected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 font-medium">
                      Connected as {linkedIn.accountName}
                    </span>
                    {linkedIn.tokenExpired && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Token expired
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Not connected</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : linkedIn?.connected ? (
                <>
                  {linkedIn.tokenExpired && (
                    <button
                      onClick={handleConnectLinkedIn}
                      disabled={connecting}
                      className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Reconnect
                    </button>
                  )}
                  <button
                    onClick={handleDisconnectLinkedIn}
                    disabled={disconnecting}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2 border border-gray-300"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4" />
                    )}
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnectLinkedIn}
                  disabled={connecting}
                  className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Linkedin className="h-4 w-4" />
                  )}
                  Connect LinkedIn
                </button>
              )}
            </div>
          </div>

          {/* More platforms coming soon */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-sm text-gray-500 text-center">
              More platforms coming soon: Twitter/X, Facebook, Instagram
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      {!linkedIn?.connected && !loading && (
        <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-medium text-blue-900 mb-2">How LinkedIn Connection Works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Click "Connect LinkedIn" to authorize LoquiHQ</li>
            <li>2. Sign in to your LinkedIn account</li>
            <li>3. Grant permission to post on your behalf</li>
            <li>4. You'll be redirected back here</li>
            <li>5. Schedule and post content directly from the calendar!</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Settings;
