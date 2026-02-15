import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Linkedin, Facebook, Check, X, AlertCircle, ExternalLink, Loader2, Unplug, Rss, Podcast, Clock, Twitter, Mail, Upload, Trash2, Users, FileSpreadsheet, CreditCard, ChevronRight } from 'lucide-react';
import { getLinkedInStatus, connectLinkedIn, disconnectLinkedIn } from '../services/linkedin';
import { getTwitterStatus, connectTwitter, disconnectTwitter, TwitterStatus } from '../services/twitter';
import { getAnalyticsSources, disconnectPodcast } from '../services/podcast';
import { getMediumStatus, connectMedium, disconnectMedium, MediumStatus } from '../services/medium';
import { getGmailStatus, getGmailAuthUrl, disconnectGmail, GmailStatus } from '../services/gmail';
import { getSendGridStatus, disconnectSendGrid, SendGridStatus } from '../services/sendgrid';
import { getMailchimpStatus, connectMailchimp, disconnectMailchimp, MailchimpStatus } from '../services/mailchimp';
import { getKitStatus, connectKit, disconnectKit, KitStatus } from '../services/kit';

import { getEmailLists, createEmailList, deleteEmailList, parseCSVForEmails, EmailList } from '../services/emailLists';
import { createTeam, getTeams, Team } from '../services/backend';
import { useTeam } from '../contexts/TeamContext';

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

  // LinkedIn state
  const [linkedIn, setLinkedIn] = useState<LinkedInConnection | null>(null);
  const [linkedInLoading, setLinkedInLoading] = useState(true);
  const [linkedInConnecting, setLinkedInConnecting] = useState(false);
  const [linkedInDisconnecting, setLinkedInDisconnecting] = useState(false);

  // Twitter state
  const [twitter, setTwitter] = useState<TwitterStatus | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(true);
  const [twitterConnecting, setTwitterConnecting] = useState(false);
  const [twitterDisconnecting, setTwitterDisconnecting] = useState(false);

  // Medium state
  const [medium, setMedium] = useState<MediumStatus | null>(null);
  const [mediumLoading, setMediumLoading] = useState(true);
  const [mediumConnecting, setMediumConnecting] = useState(false);
  const [mediumDisconnecting, setMediumDisconnecting] = useState(false);
  const [showMediumModal, setShowMediumModal] = useState(false);
  const [mediumToken, setMediumToken] = useState('');

  // Gmail state
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);

  // SendGrid state
  const [sendgrid, setSendGrid] = useState<SendGridStatus | null>(null);
  const [sendgridLoading, setSendGridLoading] = useState(true);
  const [sendgridDisconnecting, setSendGridDisconnecting] = useState(false);

  // Mailchimp state
  const [mailchimp, setMailchimp] = useState<MailchimpStatus | null>(null);
  const [mailchimpLoading, setMailchimpLoading] = useState(true);
  const [mailchimpConnecting, setMailchimpConnecting] = useState(false);
  const [mailchimpDisconnecting, setMailchimpDisconnecting] = useState(false);

  // Kit state
  const [kit, setKit] = useState<KitStatus | null>(null);
  const [kitLoading, setKitLoading] = useState(true);
  const [kitConnecting, setKitConnecting] = useState(false);
  const [kitDisconnecting, setKitDisconnecting] = useState(false);

  // Podcast state
  const [podcast, setPodcast] = useState<PodcastStatus | null>(null);
  const [podcastLoading, setPodcastLoading] = useState(true);
  const [disconnectingPodcast, setDisconnectingPodcast] = useState(false);

  // Email Lists state
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [emailListsLoading, setEmailListsLoading] = useState(true);
  const [showEmailListModal, setShowEmailListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [creatingList, setCreatingList] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Teams state
  const { teams, refreshTeams, switchTeam } = useTeam();
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Load all statuses on mount
  useEffect(() => {
    loadLinkedInStatus();
    loadTwitterStatus();
    loadMediumStatus();
    loadGmailStatus();
    loadSendGridStatus();
    loadMailchimpStatus();
    loadKitStatus();
    loadPodcastStatus();
    loadEmailLists();
  }, []);

  const loadLinkedInStatus = async () => {
    try {
      setLinkedInLoading(true);
      const status = await getLinkedInStatus();
      setLinkedIn(status);
    } catch (err: any) {
      console.error('Failed to load LinkedIn status:', err);
      setLinkedIn({ connected: false });
    } finally {
      setLinkedInLoading(false);
    }
  };

  const loadTwitterStatus = async () => {
    try {
      setTwitterLoading(true);
      const status = await getTwitterStatus();
      setTwitter(status);
    } catch (err: any) {
      console.error('Failed to load Twitter status:', err);
      setTwitter({ connected: false });
    } finally {
      setTwitterLoading(false);
    }
  };

  const loadMediumStatus = async () => {
    try {
      setMediumLoading(true);
      const status = await getMediumStatus();
      setMedium(status);
    } catch (err: any) {
      console.error('Failed to load Medium status:', err);
      setMedium({ connected: false });
    } finally {
      setMediumLoading(false);
    }
  };

  const loadGmailStatus = async () => {
    try {
      setGmailLoading(true);
      const status = await getGmailStatus();
      setGmail(status);
    } catch (err: any) {
      console.error('Failed to load Gmail status:', err);
      setGmail({ connected: false });
    } finally {
      setGmailLoading(false);
    }
  };

  const loadSendGridStatus = async () => {
    try {
      setSendGridLoading(true);
      const status = await getSendGridStatus();
      setSendGrid(status);
    } catch (err: any) {
      console.error('Failed to load SendGrid status:', err);
      setSendGrid({ connected: false });
    } finally {
      setSendGridLoading(false);
    }
  };

  const loadMailchimpStatus = async () => {
    try {
      setMailchimpLoading(true);
      const status = await getMailchimpStatus();
      setMailchimp(status);
    } catch (err: any) {
      console.error('Failed to load Mailchimp status:', err);
      setMailchimp({ connected: false });
    } finally {
      setMailchimpLoading(false);
    }
  };

  const loadKitStatus = async () => {
    try {
      setKitLoading(true);
      const status = await getKitStatus();
      setKit(status);
    } catch (err: any) {
      console.error('Failed to load Kit status:', err);
      setKit({ connected: false });
    } finally {
      setKitLoading(false);
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

  // LinkedIn handlers
  const handleConnectLinkedIn = async () => {
    try {
      setLinkedInConnecting(true);
      setMessage(null);
      await connectLinkedIn();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start LinkedIn connection' });
      setLinkedInConnecting(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    if (!confirm('Are you sure you want to disconnect LinkedIn? You will need to reconnect to post content.')) {
      return;
    }

    try {
      setLinkedInDisconnecting(true);
      setMessage(null);
      await disconnectLinkedIn();
      setLinkedIn({ connected: false });
      setMessage({ type: 'success', text: 'LinkedIn disconnected successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect LinkedIn' });
    } finally {
      setLinkedInDisconnecting(false);
    }
  };

  // Twitter handlers
  const handleConnectTwitter = async () => {
    try {
      setTwitterConnecting(true);
      setMessage(null);
      await connectTwitter();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start Twitter connection' });
      setTwitterConnecting(false);
    }
  };

  const handleDisconnectTwitter = async () => {
    if (!confirm('Are you sure you want to disconnect X? You will need to reconnect to post content.')) {
      return;
    }

    try {
      setTwitterDisconnecting(true);
      setMessage(null);
      await disconnectTwitter();
      setTwitter({ connected: false });
      setMessage({ type: 'success', text: 'X disconnected successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect X' });
    } finally {
      setTwitterDisconnecting(false);
    }
  };

  // Medium handlers
  const handleConnectMedium = async () => {
    if (!mediumToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Medium integration token' });
      return;
    }

    try {
      setMediumConnecting(true);
      setMessage(null);
      const result = await connectMedium(mediumToken);
      
      if (result.success) {
        setMedium({
          connected: true,
          accountName: result.profile?.name,
          username: result.profile?.username,
        });
        setMessage({ type: 'success', text: result.message });
        setShowMediumModal(false);
        setMediumToken('');
        loadMediumStatus();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to connect Medium' });
    } finally {
      setMediumConnecting(false);
    }
  };

  const handleDisconnectMedium = async () => {
    if (!confirm('Are you sure you want to disconnect Medium? You will need to reconnect to post content.')) {
      return;
    }

    try {
      setMediumDisconnecting(true);
      setMessage(null);
      const result = await disconnectMedium();
      
      if (result.success) {
        setMedium({ connected: false });
        setMessage({ type: 'success', text: result.message });
        loadMediumStatus();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect Medium' });
    } finally {
      setMediumDisconnecting(false);
    }
  };

  // Gmail handlers
  const handleConnectGmail = async () => {
    try {
      setGmailConnecting(true);
      setMessage(null);
      const authUrl = await getGmailAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start Gmail connection' });
      setGmailConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? You will need to reconnect to send emails.')) {
      return;
    }

    try {
      setGmailDisconnecting(true);
      setMessage(null);
      await disconnectGmail();
      setGmail({ connected: false });
      setMessage({ type: 'success', text: 'Gmail disconnected successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect Gmail' });
    } finally {
      setGmailDisconnecting(false);
    }
  };

  // SendGrid handlers
  const handleDisconnectSendGrid = async () => {
    if (!confirm('Are you sure you want to disconnect SendGrid? You will need to reconnect to send emails via SendGrid.')) {
      return;
    }

    try {
      setSendGridDisconnecting(true);
      setMessage(null);
      await disconnectSendGrid();
      setSendGrid({ connected: false });
      setMessage({ type: 'success', text: 'SendGrid disconnected successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect SendGrid' });
    } finally {
      setSendGridDisconnecting(false);
    }
  };

  // Mailchimp handlers
  const handleConnectMailchimp = async () => {
    try {
      setMailchimpConnecting(true);
      setMessage(null);
      await connectMailchimp();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start Mailchimp connection' });
      setMailchimpConnecting(false);
    }
  };

  const handleDisconnectMailchimp = async () => {
    if (!confirm('Are you sure you want to disconnect Mailchimp?')) {
      return;
    }

    try {
      setMailchimpDisconnecting(true);
      setMessage(null);
      await disconnectMailchimp();
      setMailchimp({ connected: false });
      setMessage({ type: 'success', text: 'Mailchimp disconnected successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect Mailchimp' });
    } finally {
      setMailchimpDisconnecting(false);
    }
  };

  // Kit handlers
  const handleConnectKit = async () => {
    try {
      setKitConnecting(true);
      setMessage(null);
      await connectKit();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start Kit connection' });
      setKitConnecting(false);
    }
  };

  const handleDisconnectKit = async () => {
    if (!confirm('Are you sure you want to disconnect Kit?')) {
      return;
    }

    try {
      setKitDisconnecting(true);
      setMessage(null);
      await disconnectKit();
      setKit({ connected: false });
      setMessage({ type: 'success', text: 'Kit disconnected successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect Kit' });
    } finally {
      setKitDisconnecting(false);
    }
  };

  // Podcast handlers
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
      localStorage.removeItem('loquihq_onboarding_dismissed');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect podcast' });
    } finally {
      setDisconnectingPodcast(false);
    }
  };

  // Email Lists handlers
  const loadEmailLists = async () => {
    try {
      setEmailListsLoading(true);
      const lists = await getEmailLists();
      setEmailLists(lists);
    } catch (err: any) {
      console.error('Failed to load email lists:', err);
    } finally {
      setEmailListsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const emails = parseCSVForEmails(content);
      setParsedEmails(emails);

      // Auto-suggest list name from file name
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      if (!newListName) {
        setNewListName(fileName);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateEmailList = async () => {
    if (!newListName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a name for the email list' });
      return;
    }

    if (parsedEmails.length === 0) {
      setMessage({ type: 'error', text: 'No valid emails found in the uploaded file' });
      return;
    }

    try {
      setCreatingList(true);
      setMessage(null);
      await createEmailList(newListName.trim(), parsedEmails);
      setMessage({ type: 'success', text: `Email list "${newListName}" created with ${parsedEmails.length} emails` });
      setShowEmailListModal(false);
      setNewListName('');
      setParsedEmails([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadEmailLists();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create email list' });
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteEmailList = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingListId(id);
      setMessage(null);
      await deleteEmailList(id);
      setMessage({ type: 'success', text: `Email list "${name}" deleted` });
      loadEmailLists();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete email list' });
    } finally {
      setDeletingListId(null);
    }
  };

  // Team handlers
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setCreatingTeam(true);
    try {
      const team = await createTeam(newTeamName.trim());
      setMessage({ type: 'success', text: `Team "${team.name}" created successfully!` });
      setShowCreateTeamModal(false);
      setNewTeamName('');
      await refreshTeams();
      // Optionally switch to the new team
      switchTeam(team.id);
    } catch (err: any) {
      console.error('Failed to create team:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to create team' });
    } finally {
      setCreatingTeam(false);
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
            <Check className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
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

      {/* Billing & Plan */}
      <div
        onClick={() => navigate('/settings/billing')}
        className="bg-gray-100 rounded-xl border border-gray-300 shadow-sm p-5 mb-6 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-textPrimary">Billing & Plan</h2>
            <p className="text-sm text-textMuted">Manage your subscription, view usage, and upgrade</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-textMuted" />
      </div>

      {/* Connected Accounts Section */}
      <div className="bg-gray-100 rounded-xl border border-gray-300 shadow-sm">
        <div className="p-6 border-b border-gray-300">
          <h2 className="text-lg font-semibold text-textPrimary">Connected Accounts</h2>
          <p className="text-sm text-textMuted mt-1">
            Connect your social media accounts to post content directly from LoquiHQ
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* LinkedIn Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                <Linkedin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">LinkedIn</h3>
                {linkedInLoading ? (
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
              {linkedInLoading ? (
                <Loader2 className="h-5 w-5 text-textMuted animate-spin" />
              ) : linkedIn?.connected ? (
                <>
                  {linkedIn.tokenExpired && (
                    <button
                      onClick={handleConnectLinkedIn}
                      disabled={linkedInConnecting}
                      className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {linkedInConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Reconnect
                    </button>
                  )}
                  <button
                    onClick={handleDisconnectLinkedIn}
                    disabled={linkedInDisconnecting}
                    className="px-4 py-2 bg-gray-300 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-400 transition disabled:opacity-50 flex items-center gap-2 border border-gray-400"
                  >
                    {linkedInDisconnecting ? (
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
                  disabled={linkedInConnecting}
                  className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {linkedInConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Linkedin className="h-4 w-4" />
                  )}
                  Connect LinkedIn
                </button>
              )}
            </div>
          </div>

          {/* X - Coming Soon */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300 opacity-75">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-black rounded-lg flex items-center justify-center">
                <Twitter className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">X</h3>
                <p className="text-sm text-textMuted">Post threads and updates to X</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Coming Soon
              </span>
            </div>
          </div>

          {/* Medium - Manual Only */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">Medium</h3>
                <p className="text-sm text-textMuted">Copy content from Platform Content tab and paste manually</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-gray-300 text-textMuted text-sm rounded-lg border border-gray-400">
                Manual Only
              </span>
            </div>
          </div>

          {/* Gmail Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-red-500 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">Gmail</h3>
                {gmailLoading ? (
                  <p className="text-sm text-textMuted">Checking connection...</p>
                ) : gmail?.connected ? (
                  <p className="text-sm text-green-600 font-medium">
                    Connected as {gmail.email}
                  </p>
                ) : (
                  <p className="text-sm text-textMuted">Send outreach emails directly</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {gmailLoading ? (
                <Loader2 className="h-5 w-5 text-textMuted animate-spin" />
              ) : gmail?.connected ? (
                <button
                  onClick={handleDisconnectGmail}
                  disabled={gmailDisconnecting}
                  className="px-4 py-2 bg-gray-300 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-400 transition disabled:opacity-50 flex items-center gap-2 border border-gray-400"
                >
                  {gmailDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectGmail}
                  disabled={gmailConnecting}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {gmailConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Connect Gmail
                </button>
              )}
            </div>
          </div>

          {/* SendGrid Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#1A82E2] rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">SendGrid</h3>
                {sendgridLoading ? (
                  <p className="text-sm text-textMuted">Checking connection...</p>
                ) : sendgrid?.connected ? (
                  <p className="text-sm text-green-600 font-medium">
                    Connected{sendgrid.email ? ` (${sendgrid.email})` : ''}
                  </p>
                ) : (
                  <p className="text-sm text-textMuted">Send newsletters and marketing emails</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {sendgridLoading ? (
                <Loader2 className="h-5 w-5 text-textMuted animate-spin" />
              ) : sendgrid?.connected ? (
                <>
                  <button
                    onClick={() => navigate('/settings/sendgrid')}
                    className="px-4 py-2 bg-[#1A82E2] text-white text-sm font-medium rounded-lg hover:bg-[#1570C2] transition flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manage
                  </button>
                  <button
                    onClick={handleDisconnectSendGrid}
                    disabled={sendgridDisconnecting}
                    className="px-4 py-2 bg-gray-300 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-400 transition disabled:opacity-50 flex items-center gap-2 border border-gray-400"
                  >
                    {sendgridDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4" />
                    )}
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/settings/sendgrid')}
                  className="px-4 py-2 bg-[#1A82E2] text-white text-sm font-medium rounded-lg hover:bg-[#1570C2] transition flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Connect SendGrid
                </button>
              )}
            </div>
          </div>

          {/* Mailchimp Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#FFE01B] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-lg">MC</span>
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">Mailchimp</h3>
                {mailchimpLoading ? (
                  <p className="text-sm text-textMuted">Checking connection...</p>
                ) : mailchimp?.connected ? (
                  <p className="text-sm text-green-600 font-medium">
                    Connected{mailchimp.account?.accountName ? ` (${mailchimp.account.accountName})` : ''}
                  </p>
                ) : (
                  <p className="text-sm text-textMuted">Email marketing and newsletters</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {mailchimpLoading ? (
                <Loader2 className="h-5 w-5 text-textMuted animate-spin" />
              ) : mailchimp?.connected ? (
                <button
                  onClick={handleDisconnectMailchimp}
                  disabled={mailchimpDisconnecting}
                  className="px-4 py-2 bg-gray-300 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-400 transition disabled:opacity-50 flex items-center gap-2 border border-gray-400"
                >
                  {mailchimpDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectMailchimp}
                  disabled={mailchimpConnecting}
                  className="px-4 py-2 bg-[#FFE01B] text-black text-sm font-medium rounded-lg hover:bg-[#E5CA00] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {mailchimpConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Connect Mailchimp
                </button>
              )}
            </div>
          </div>

          {/* Kit (ConvertKit) Connection */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#FB6970] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Kit</span>
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">Kit (ConvertKit)</h3>
                {kitLoading ? (
                  <p className="text-sm text-textMuted">Checking connection...</p>
                ) : kit?.connected ? (
                  <p className="text-sm text-green-600 font-medium">
                    Connected{kit.accountName ? ` (${kit.accountName})` : ''}
                  </p>
                ) : (
                  <p className="text-sm text-textMuted">Email marketing for creators</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {kitLoading ? (
                <Loader2 className="h-5 w-5 text-textMuted animate-spin" />
              ) : kit?.connected ? (
                <button
                  onClick={handleDisconnectKit}
                  disabled={kitDisconnecting}
                  className="px-4 py-2 bg-gray-300 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-400 transition disabled:opacity-50 flex items-center gap-2 border border-gray-400"
                >
                  {kitDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectKit}
                  disabled={kitConnecting}
                  className="px-4 py-2 bg-[#FB6970] text-white text-sm font-medium rounded-lg hover:bg-[#E85860] transition disabled:opacity-50 flex items-center gap-2"
                >
                  {kitConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Connect Kit
                </button>
              )}
            </div>
          </div>

          {/* Facebook - Coming Soon */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300 opacity-75">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-[#1877F2] rounded-lg flex items-center justify-center">
                <Facebook className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">Facebook</h3>
                <p className="text-sm text-textMuted">Post to your Facebook Pages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Coming Soon
              </span>
            </div>
          </div>

          {/* Instagram - Coming Soon */}
          <div className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300 opacity-75">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-linear-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">IG</span>
              </div>
              <div>
                <h3 className="font-medium text-textPrimary">Instagram</h3>
                <p className="text-sm text-textMuted">Share posts and reels</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Coming Soon
              </span>
            </div>
          </div>

          {/* Medium Token Modal */}
          {showMediumModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-semibold text-textPrimary mb-2">Connect Medium</h2>
                <p className="text-sm text-textMuted mb-4">
                  Generate a Medium integration token to connect your account.
                </p>

                {/* Step-by-step instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-blue-900 mb-2">How to get your token:</h3>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Go to: <a href="https://medium.com/me/settings/security" target="_blank" rel="noopener noreferrer" className="underline font-medium">https://medium.com/me/settings/security</a></li>
                    <li>2. Scroll to "Integration Tokens"</li>
                    <li>3. Click "New integration token"</li>
                    <li>4. Name it "LoquiHQ"</li>
                    <li>5. Copy the token and paste it below</li>
                  </ol>
                </div>

                <input
                  type="password"
                  placeholder="Paste your Medium integration token here"
                  value={mediumToken}
                  onChange={(e) => setMediumToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowMediumModal(false);
                      setMediumToken('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnectMedium}
                    disabled={mediumConnecting || !mediumToken.trim()}
                    className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {mediumConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Connect'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

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

      {/* Email Lists Section */}
      <div className="mt-6 bg-gray-100 rounded-xl border border-gray-300 shadow-sm">
        <div className="p-6 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-textPrimary">Email Lists</h2>
            <p className="text-sm text-textMuted mt-1">
              Import CSV files with email addresses for email series campaigns
            </p>
          </div>
          <button
            onClick={() => setShowEmailListModal(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
        </div>

        <div className="p-6">
          {emailListsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-textMuted animate-spin" />
            </div>
          ) : emailLists.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-textMuted">No email lists yet</p>
              <p className="text-sm text-textMuted mt-1">Import a CSV file to create your first list</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emailLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-textPrimary">{list.name}</h3>
                      <p className="text-sm text-textMuted">
                        {list.email_count} email{list.email_count !== 1 ? 's' : ''} • Created {new Date(list.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEmailList(list.id, list.name)}
                    disabled={deletingListId === list.id}
                    className="p-2 text-textMuted hover:text-red-600 transition disabled:opacity-50"
                    title="Delete list"
                  >
                    {deletingListId === list.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email List Import Modal */}
      {showEmailListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-100 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-textPrimary">Import Email List</h2>
              <button
                onClick={() => {
                  setShowEmailListModal(false);
                  setNewListName('');
                  setParsedEmails([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-textMuted hover:text-textPrimary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  CSV File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 text-textMuted mx-auto mb-2" />
                  <p className="text-sm text-textSecondary">Click to upload CSV</p>
                  <p className="text-xs text-textMuted mt-1">Supports CSV with "email" column or single column of emails</p>
                </div>
              </div>

              {/* Parsed Results */}
              {parsedEmails.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Found {parsedEmails.length} valid email{parsedEmails.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-2 max-h-24 overflow-y-auto">
                    <p className="text-xs text-green-600">
                      {parsedEmails.slice(0, 5).join(', ')}
                      {parsedEmails.length > 5 && ` ... and ${parsedEmails.length - 5} more`}
                    </p>
                  </div>
                </div>
              )}

              {/* List Name */}
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  List Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Newsletter Subscribers"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-textPrimary outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEmailListModal(false);
                    setNewListName('');
                    setParsedEmails([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-textSecondary text-sm font-medium rounded-lg hover:bg-gray-300 transition border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEmailList}
                  disabled={creatingList || parsedEmails.length === 0 || !newListName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingList ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create List
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teams Section */}
      <div className="bg-gray-100 rounded-xl border border-gray-300 shadow-sm mt-6">
        <div className="p-6 border-b border-gray-300 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
              <Users className="h-5 w-5 text-textMuted" />
              Teams
            </h2>
            <p className="text-sm text-textMuted mt-1">
              Create and manage team workspaces for collaboration
            </p>
          </div>
          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition"
          >
            Create Team
          </button>
        </div>

        <div className="p-6">
          {teams.length === 0 ? (
            <div className="text-center py-8 text-textMuted">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No teams yet</p>
              <p className="text-sm">Create a team to start collaborating with others</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 bg-gray-200 rounded-lg border border-gray-300"
                >
                  <div>
                    <h3 className="font-medium text-textPrimary">{team.name}</h3>
                    <p className="text-sm text-textMuted capitalize">
                      Role: {team.role} | Members: {team.maxMembers}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/team')}
                    className="px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition"
                  >
                    Manage
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-textPrimary mb-4">Create Team</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Team Name
              </label>
              <input
                type="text"
                placeholder="e.g., My Podcast Team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-textPrimary outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateTeamModal(false);
                  setNewTeamName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-textSecondary font-medium rounded-lg hover:bg-gray-200 transition border border-gray-300"
                disabled={creatingTeam}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={creatingTeam || !newTeamName.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingTeam ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create Team'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      {!linkedIn?.connected && !linkedInLoading && (
        <div className="mt-6 bg-secondary/10 rounded-xl p-6 border border-secondary/20">
          <h3 className="font-medium text-textPrimary mb-2">How Social Media Connection Works</h3>
          <ul className="text-sm text-textSecondary space-y-1">
            <li>1. Click "Connect" to authorize LoquiHQ</li>
            <li>2. Sign in to your social media account</li>
            <li>3. Grant permission to post on your behalf</li>
            <li>4. Schedule and post content directly from the calendar!</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Settings;
