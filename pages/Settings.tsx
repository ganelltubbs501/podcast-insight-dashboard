import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Linkedin, Check, X, AlertCircle, ExternalLink, Loader2, Unplug, Rss, Podcast } from 'lucide-react';
import { getLinkedInStatus, connectLinkedIn, disconnectLinkedIn } from '../services/linkedin';
import { getAnalyticsSources, disconnectPodcast } from '../services/podcast';

interface LinkedInConnection {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
}

interface PodcastStatus {
  connected: boolean;
  title?: string;
  rssUrl?: string;
  provider?: string;
}

const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [linkedIn, setLinkedIn] = useState<LinkedInConnection | null>(null);
  const [podcast, setPodcast] = useState<PodcastStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [podcastLoading, setPodcastLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectingPodcast, setDisconnectingPodcast] = useState(false);
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

  // Load LinkedIn and Podcast status
  useEffect(() => {
    loadLinkedInStatus();
    loadPodcastStatus();
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

  const loadPodcastStatus = async () => {
    try {
      setPodcastLoading(true);
      const sources = await getAnalyticsSources();
      if (sources.currentConnection) {
        setPodcast({
          connected: true,
          rssUrl: sources.currentConnection.rssUrl,
          provider: sources.currentConnection.provider,
        });
      } else {
        setPodcast({ connected: false });
      }
    } catch (err: any) {
      console.error('Failed to load podcast status:', err);
      setPodcast({ connected: false });
    } finally {
      setPodcastLoading(false);
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

  const handleDisconnectPodcast = async () => {
    if (!confirm('Are you sure you want to disconnect your podcast? This will remove all podcast data including episodes, metrics, and projections. This action cannot be undone.')) {
      return;
    }

    try {
      setDisconnectingPodcast(true);
      setMessage(null);
      const result = await disconnectPodcast();
      setPodcast({ connected: false });
      setMessage({ type: 'success', text: `"${result.podcastTitle}" disconnected successfully` });
      // Clear the onboarding dismissed state so it shows again
      localStorage.removeItem('loquihq_onboarding_dismissed');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect podcast' });
    } finally {
      setDisconnectingPodcast(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-textPrimary">Settings</h1>
        <p className="text-textMuted mt-1">Manage your account and connected services</p>
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
      <div className="bg-gray-100 rounded-xl border border-gray-300 shadow-sm">
        <div className="p-6 border-b border-gray-300">
          <h2 className="text-lg font-semibold text-textPrimary">Connected Accounts</h2>
          <p className="text-sm text-textMuted mt-1">
            Connect your social media accounts to post content directly from LoquiHQ
          </p>
        </div>

        <div className="p-6">
          {/* LinkedIn Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                <Linkedin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">LinkedIn</h3>
                {loading ? (
                  <p className="text-sm text-textMuted">Checking connection...</p>
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
                  <p className="text-sm text-textMuted">Not connected</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="h-5 w-5 text-textMuted animate-spin" />
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
                    className="px-4 py-2 bg-gray-300 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-400 transition disabled:opacity-50 flex items-center gap-2 border border-gray-400"
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
          <div className="mt-4 p-4 bg-gray-200 rounded-lg border border-dashed border-gray-400">
            <p className="text-sm text-textMuted text-center">
              More platforms coming soon: Twitter/X, Facebook, Instagram
            </p>
          </div>
        </div>
      </div>

      {/* Podcast Connection Section */}
      <div className="mt-6 bg-gray-100 rounded-xl border border-gray-300 shadow-sm">
        <div className="p-6 border-b border-gray-300">
          <h2 className="text-lg font-semibold text-textPrimary">Podcast Connection</h2>
          <p className="text-sm text-textMuted mt-1">
            Manage your connected podcast RSS feed
          </p>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                <Podcast className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">Podcast RSS Feed</h3>
                {podcastLoading ? (
                  <p className="text-sm text-textMuted">Checking connection...</p>
                ) : podcast?.connected ? (
                  <div>
                    <span className="text-sm text-green-600 font-medium">
                      Connected
                    </span>
                    {podcast.provider && (
                      <p className="text-xs text-textMuted mt-0.5">
                        Provider: {podcast.provider}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-textMuted">No podcast connected</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {podcastLoading ? (
                <Loader2 className="h-5 w-5 text-textMuted animate-spin" />
              ) : podcast?.connected ? (
                <button
                  onClick={handleDisconnectPodcast}
                  disabled={disconnectingPodcast}
                  className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition disabled:opacity-50 flex items-center gap-2 border border-red-300"
                >
                  {disconnectingPodcast ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => navigate('/connect-podcast')}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <Rss className="h-4 w-4" />
                  Connect Podcast
                </button>
              )}
            </div>
          </div>

          {podcast?.connected && podcast.rssUrl && (
            <div className="mt-3 p-3 bg-gray-200 rounded-lg">
              <p className="text-xs text-textMuted">
                <span className="font-medium">Feed URL:</span>{' '}
                <span className="font-mono break-all">{podcast.rssUrl}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      {!linkedIn?.connected && !loading && (
        <div className="mt-6 bg-secondary/10 rounded-xl p-6 border border-secondary/20">
          <h3 className="font-medium text-textPrimary mb-2">How LinkedIn Connection Works</h3>
          <ul className="text-sm text-textSecondary space-y-1">
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
