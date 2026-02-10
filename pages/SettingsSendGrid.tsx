import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  connectSendGrid,
  getSendGridStatus,
  disconnectSendGrid,
  getSendGridLists,
  getSendGridTemplates,
  getSendGridSenders,
  updateSendGridDefaultSender,
  refreshSendGridSenders,
  SendGridStatus,
  SendGridList,
  SendGridTemplate,
  SendGridSender,
} from "../services/sendgrid";
import { Check, CheckCircle, AlertCircle, RefreshCw, Loader2, ArrowLeft, Unplug, Mail } from "lucide-react";

const SettingsSendGrid: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SendGridStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [lists, setLists] = useState<SendGridList[]>([]);
  const [templates, setTemplates] = useState<SendGridTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingSender, setUpdatingSender] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = async () => {
    setError(null);
    try {
      const s = await getSendGridStatus();
      setStatus(s);

      if (s.connected) {
        // Use stored metadata for initial display
        if (s.lists) setLists(s.lists);
        if (s.templates) setTemplates(s.templates);
      } else {
        setLists([]);
        setTemplates([]);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load SendGrid status");
    } finally {
      setPageLoading(false);
    }
  };

  const loadLiveResources = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [liveListsData, liveTemplatesData, refreshResult] = await Promise.all([
        getSendGridLists(),
        getSendGridTemplates(),
        refreshSendGridSenders(),
      ]);
      setLists(liveListsData);
      setTemplates(liveTemplatesData);
      if (refreshResult.success) {
        setStatus(prev => prev ? { ...prev, senders: refreshResult.senders } : prev);
      }
      setSuccessMessage("Resources refreshed from SendGrid");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh resources");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const onConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await connectSendGrid(apiKey.trim());
      if (result.success) {
        setApiKey("");
        setSuccessMessage(result.message);
        await loadStatus();
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to connect SendGrid");
    } finally {
      setLoading(false);
    }
  };

  const onDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect SendGrid?")) return;
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectSendGrid();
      setStatus({ connected: false });
      setLists([]);
      setTemplates([]);
      setSuccessMessage("SendGrid disconnected successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      setError(e?.message ?? "Failed to disconnect SendGrid");
    } finally {
      setDisconnecting(false);
    }
  };

  const onSetDefaultSender = async (sender: SendGridSender) => {
    setUpdatingSender(true);
    setError(null);
    try {
      const result = await updateSendGridDefaultSender({ email: sender.email, name: sender.name });
      if (result.success) {
        setStatus(prev => prev ? { ...prev, defaultSender: { email: sender.email, name: sender.name } } : prev);
        setSuccessMessage(`Default sender set to ${sender.name} (${sender.email})`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to update default sender");
    } finally {
      setUpdatingSender(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-textMuted animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 rounded-lg hover:bg-gray-200 transition text-textMuted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-[#1A82E2] rounded-lg flex items-center justify-center">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">SendGrid</h1>
            <p className="text-sm text-textMuted">
              Send newsletters and email series from your own SendGrid account
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-gray-100 border border-gray-300 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-textMuted uppercase mb-2">Connection Status</div>
            {status?.connected ? (
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <CheckCircle className="h-5 w-5" />
                Connected{status.email ? ` as ${status.email}` : ""}
                {status.username ? ` (${status.username})` : ""}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-700 font-medium">
                <AlertCircle className="h-5 w-5" />
                Not connected
              </div>
            )}
            {status?.lastVerifiedAt && (
              <div className="text-xs text-textMuted mt-1">
                Last verified: {new Date(status.lastVerifiedAt).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status?.connected && (
              <>
                <button
                  onClick={loadLiveResources}
                  disabled={refreshing}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={onDisconnect}
                  disabled={disconnecting}
                  className="px-3 py-2 rounded-lg border border-gray-400 bg-gray-300 hover:bg-gray-400 text-sm flex items-center gap-2 text-textPrimary disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {/* Connect form */}
        {!status?.connected && (
          <div className="mt-6">
            <div className="text-xs font-bold text-textMuted uppercase mb-2">Paste your SendGrid API Key</div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-blue-900 mb-2 text-sm">How to get your API key:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Log in to <a href="https://app.sendgrid.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">app.sendgrid.com</a></li>
                <li>2. Go to Settings &gt; API Keys</li>
                <li>3. Click "Create API Key"</li>
                <li>4. Name it "LoquiHQ" and select "Full Access"</li>
                <li>5. Copy the API key and paste it below</li>
              </ol>
            </div>

            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="SG.xxxxx..."
              className="w-full bg-gray-200 border border-gray-300 rounded-lg p-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="text-xs text-textMuted mt-2">
              Your key is validated and stored securely. LoquiHQ uses it only to load your lists/templates and send campaigns you schedule.
            </div>

            <button
              disabled={loading || apiKey.trim().length < 10}
              onClick={onConnect}
              className="mt-4 px-4 py-2 rounded-lg bg-[#1A82E2] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#1570C2] transition flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {loading ? "Connecting..." : "Connect SendGrid"}
            </button>
          </div>
        )}
      </div>

      {/* Connected: Senders, Lists, Templates */}
      {status?.connected && (
        <>
          {/* Verified Senders */}
          <div className="mt-6 bg-gray-100 border border-gray-300 rounded-xl p-6">
            <div className="text-xs font-bold text-textMuted uppercase mb-3">Verified Senders</div>
            {status.senders && status.senders.length > 0 ? (
              <div className="space-y-2">
                {status.senders.map((sender) => {
                  const isDefault = status.defaultSender?.email === sender.email;
                  return (
                    <div
                      key={sender.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isDefault
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-200 border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          sender.verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {sender.verified ? <Check className="h-4 w-4" /> : "!"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-textPrimary">{sender.name}</p>
                          <p className="text-xs text-textMuted">{sender.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!sender.verified && (
                          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                            Not Verified
                          </span>
                        )}
                        {isDefault ? (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded font-medium">
                            Default
                          </span>
                        ) : sender.verified ? (
                          <button
                            onClick={() => onSetDefaultSender(sender)}
                            disabled={updatingSender}
                            className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                          >
                            {updatingSender ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set as Default"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-textMuted">
                No verified senders found. Add senders in your{" "}
                <a href="https://app.sendgrid.com/settings/sender_auth" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  SendGrid dashboard
                </a>.
              </div>
            )}
          </div>

          {/* Lists + Templates grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Marketing Lists */}
            <div className="bg-gray-100 border border-gray-300 rounded-xl p-6">
              <div className="text-xs font-bold text-textMuted uppercase mb-3">Marketing Lists</div>
              {lists.length > 0 ? (
                <ul className="space-y-2">
                  {lists.slice(0, 15).map((l) => (
                    <li key={l.id} className="text-sm text-textSecondary flex justify-between gap-2">
                      <span className="truncate">{l.name}</span>
                      {'contactCount' in l && (
                        <span className="text-xs text-textMuted shrink-0">
                          {(l as any).contactCount?.toLocaleString()} contacts
                        </span>
                      )}
                    </li>
                  ))}
                  {lists.length > 15 && (
                    <li className="text-xs text-textMuted">+{lists.length - 15} more</li>
                  )}
                </ul>
              ) : (
                <div className="text-sm text-textMuted">No marketing lists found.</div>
              )}
            </div>

            {/* Email Templates */}
            <div className="bg-gray-100 border border-gray-300 rounded-xl p-6">
              <div className="text-xs font-bold text-textMuted uppercase mb-3">Email Templates</div>
              {templates.length > 0 ? (
                <ul className="space-y-2">
                  {templates.slice(0, 15).map((t) => (
                    <li key={t.id} className="text-sm text-textSecondary flex justify-between gap-2">
                      <span className="truncate">
                        {t.name}
                        {t.generation ? (
                          <span className="ml-2 text-xs text-textMuted">({t.generation})</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                  {templates.length > 15 && (
                    <li className="text-xs text-textMuted">+{templates.length - 15} more</li>
                  )}
                </ul>
              ) : (
                <div className="text-sm text-textMuted">No templates found.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsSendGrid;
