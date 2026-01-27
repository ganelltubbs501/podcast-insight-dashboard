import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Headphones,
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  RefreshCw,
  Settings,
  AlertCircle,
  Loader2,
  Rss,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { getPodcastDashboard, resyncPodcastRss, formatDuration, formatNumber, formatCurrency, formatDate } from "../services/podcast";
import ManualMetricsModal from "../components/ManualMetricsModal";
import type { PodcastDashboardResponse, ManualMetricsResponse } from "../types/podcast-analytics";

const PodcastAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<PodcastDashboardResponse | null>(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Resync state
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check if we should open metrics modal from URL param
  useEffect(() => {
    if (searchParams.get("openMetrics") === "true") {
      setShowMetricsModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Load dashboard data
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPodcastDashboard();
      setDashboard(data);
    } catch (err: any) {
      if (err.message?.includes("needsSetup") || err.message?.includes("No podcast connected")) {
        navigate("/connect-podcast");
        return;
      }
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleMetricsSuccess = (result: ManualMetricsResponse) => {
    // Reload dashboard to show new data
    loadDashboard();
  };

  const handleResync = async () => {
    setIsResyncing(true);
    setResyncMessage(null);
    try {
      const result = await resyncPodcastRss();
      setResyncMessage({
        type: "success",
        text: result.newEpisodeCount > 0
          ? `Synced! Found ${result.newEpisodeCount} new episode${result.newEpisodeCount === 1 ? "" : "s"}.`
          : "Feed is up to date.",
      });
      loadDashboard();
    } catch (err: any) {
      setResyncMessage({
        type: "error",
        text: err.message || "Failed to resync",
      });
    } finally {
      setIsResyncing(false);
      // Auto-clear message after 5 seconds
      setTimeout(() => setResyncMessage(null), 5000);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Failed to Load</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No dashboard data
  if (!dashboard) {
    return null;
  }

  const { podcast, connection, recentEpisodes, latestMetrics, latestProjection, needsMetrics } = dashboard;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        {/* Podcast Info */}
        <div className="flex items-start gap-4">
          {podcast.imageUrl ? (
            <img
              src={podcast.imageUrl}
              alt={podcast.title}
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Headphones className="w-10 h-10 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-textPrimary truncate">{podcast.title}</h1>
            {podcast.author && <p className="text-textMuted">{podcast.author}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-textMuted">
              <span className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                {podcast.episodeCountTotal} episodes
              </span>
              {podcast.cadence && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {podcast.cadence}
                </span>
              )}
              {connection.provider && connection.provider !== "unknown" && (
                <span className="capitalize flex items-center gap-1">
                  <Rss className="w-4 h-4" />
                  {connection.provider}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-3">
            <button
              onClick={() => setShowMetricsModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
            >
              <TrendingUp className="w-5 h-5" />
              {latestMetrics ? "Update Metrics" : "Enter Metrics"}
            </button>
            <button
              onClick={handleResync}
              disabled={isResyncing}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-textSecondary rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              title="Resync RSS Feed"
            >
              <Rss className={`w-5 h-5 ${isResyncing ? "animate-pulse" : ""}`} />
              {isResyncing ? "Syncing..." : "Resync"}
            </button>
            <button
              onClick={loadDashboard}
              className="p-2.5 border border-gray-300 text-textSecondary rounded-lg hover:bg-gray-50 transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          {resyncMessage && (
            <div
              className={`text-sm px-3 py-1.5 rounded-lg ${
                resyncMessage.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {resyncMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Needs Metrics Banner */}
      {needsMetrics && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Enter Your Metrics</h3>
              <p className="text-sm text-amber-700 mb-3">
                Add your download numbers to see revenue projections and monetization insights.
              </p>
              <button
                onClick={() => setShowMetricsModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
              >
                Enter Metrics Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics & Projections Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Downloads Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-textMuted">30-Day Downloads</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-textPrimary">
            {latestMetrics ? formatNumber(latestMetrics.downloads30dTotal) : "—"}
          </p>
          {latestMetrics?.avgDownloadsPerEpisode30d && (
            <p className="text-sm text-textMuted mt-1">
              ~{formatNumber(latestMetrics.avgDownloadsPerEpisode30d)} per episode
            </p>
          )}
        </div>

        {/* Revenue Low */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-textMuted">Revenue (Low)</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-textPrimary">
            {latestProjection ? formatCurrency(latestProjection.sponsorRevLow) : "—"}
          </p>
          <p className="text-sm text-textMuted mt-1">per episode</p>
        </div>

        {/* Revenue Mid */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-green-700">Revenue (Mid)</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-800">
            {latestProjection ? formatCurrency(latestProjection.sponsorRevMid) : "—"}
          </p>
          <p className="text-sm text-green-600 mt-1">per episode</p>
        </div>

        {/* Revenue High */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-textMuted">Revenue (High)</span>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-textPrimary">
            {latestProjection ? formatCurrency(latestProjection.sponsorRevHigh) : "—"}
          </p>
          <p className="text-sm text-textMuted mt-1">per episode</p>
        </div>
      </div>

      {/* Assumptions Info */}
      {latestProjection && (
        <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-textMuted" />
              <span className="text-sm text-textMuted">
                Projection assumptions: {Math.round((latestProjection.assumptions as any).fillRate * 100)}% fill rate, {(latestProjection.assumptions as any).adSlots} ad slots, ${(latestProjection.assumptions as any).cpmLow}-${(latestProjection.assumptions as any).cpmHigh} CPM
              </span>
            </div>
            <button className="text-sm text-primary hover:underline">
              Customize
            </button>
          </div>
        </div>
      )}

      {/* Recent Episodes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-textPrimary">Recent Episodes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentEpisodes.length === 0 ? (
            <div className="p-8 text-center text-textMuted">
              No episodes found in your RSS feed.
            </div>
          ) : (
            recentEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="p-4 hover:bg-gray-50 transition flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-textPrimary truncate">{episode.title}</h3>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-textMuted">
                    {episode.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(episode.publishedAt)}
                      </span>
                    )}
                    {episode.durationSec && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(episode.durationSec)}
                      </span>
                    )}
                    {episode.episodeNumber && (
                      <span>Ep. {episode.episodeNumber}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-textMuted" />
              </div>
            ))
          )}
        </div>
        {recentEpisodes.length > 0 && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button className="text-sm text-primary hover:underline">
              View All {podcast.episodeCountTotal} Episodes
            </button>
          </div>
        )}
      </div>

      {/* RSS Info Footer */}
      <div className="mt-8 text-center text-sm text-textMuted">
        <p>
          Connected via RSS: {connection.rssUrl.substring(0, 50)}...
          {connection.lastRssSyncAt && (
            <span> · Last synced {formatDate(connection.lastRssSyncAt)}</span>
          )}
        </p>
      </div>

      {/* Manual Metrics Modal */}
      <ManualMetricsModal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        onSuccess={handleMetricsSuccess}
      />
    </div>
  );
};

export default PodcastAnalytics;
