import React, { useState } from "react";
import { X, Loader2, HelpCircle, DollarSign, Users, TrendingUp } from "lucide-react";
import { submitManualMetrics } from "../services/podcast";
import type { ManualMetricsInput, ManualMetricsResponse } from "../types/podcast-analytics";

interface ManualMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ManualMetricsResponse) => void;
}

const ManualMetricsModal: React.FC<ManualMetricsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [downloads30d, setDownloads30d] = useState("");
  const [episodesPublished, setEpisodesPublished] = useState("");
  const [followers, setFollowers] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const downloadsNum = parseInt(downloads30d, 10);
    if (isNaN(downloadsNum) || downloadsNum < 0) {
      setError("Please enter a valid number for downloads");
      return;
    }

    // Compute avgDownloadsPerEpisode30d (required by backend)
    const episodesNum = parseInt(episodesPublished, 10) || 4; // Default to 4 if not provided
    const avgDownloads = episodesNum > 0 ? Math.round(downloadsNum / episodesNum) : downloadsNum;

    const input: ManualMetricsInput = {
      downloads30dTotal: downloadsNum,
      avgDownloadsPerEpisode30d: avgDownloads,
    };

    // Optional fields
    if (followers.trim()) {
      const followersNum = parseInt(followers, 10);
      if (!isNaN(followersNum) && followersNum >= 0) {
        input.followersTotal = followersNum;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await submitManualMetrics(input);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save metrics");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate preview values
  const previewDownloads = parseInt(downloads30d, 10) || 0;
  const previewEpisodes = parseInt(episodesPublished, 10) || 4;
  const avgPerEpisode = previewEpisodes > 0 ? Math.round(previewDownloads / previewEpisodes) : 0;

  // Simple revenue preview (using default assumptions)
  const fillRate = 0.35;
  const adSlots = 2;
  const cpmMid = 25;
  const sellableImpressions = avgPerEpisode * adSlots * fillRate;
  const revenuePerEpisode = (sellableImpressions / 1000) * cpmMid;
  const monthlyRevenue = revenuePerEpisode * previewEpisodes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto light">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-textPrimary">Enter Your Metrics</h2>
          <button
            onClick={onClose}
            className="p-2 text-textMuted hover:text-textPrimary hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Downloads */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Total Downloads (Last 30 Days) *
            </label>
            <div className="relative">
              <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
              <input
                type="number"
                min="0"
                value={downloads30d}
                onChange={(e) => setDownloads30d(e.target.value)}
                placeholder="e.g., 5000"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                required
              />
            </div>
            <p className="mt-1 text-xs text-textMuted">
              Find this in your hosting dashboard's analytics section
            </p>
          </div>

          {/* Episodes Published */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Episodes Published (Last 30 Days)
              <span className="ml-1 text-textMuted font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              max="31"
              value={episodesPublished}
              onChange={(e) => setEpisodesPublished(e.target.value)}
              placeholder="e.g., 4"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <p className="mt-1 text-xs text-textMuted">
              Used to calculate average downloads per episode
            </p>
          </div>

          {/* Followers */}
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Total Followers/Subscribers
              <span className="ml-1 text-textMuted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
              <input
                type="number"
                min="0"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="e.g., 1200"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          {/* Revenue Preview */}
          {previewDownloads > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-800">Revenue Preview</h4>
                <button
                  type="button"
                  className="ml-auto p-1 text-green-600 hover:text-green-800"
                  title="Based on industry averages: 35% fill rate, 2 ad slots, $25 CPM"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-700">Avg per Episode</p>
                  <p className="text-lg font-semibold text-green-900">
                    {avgPerEpisode.toLocaleString()} downloads
                  </p>
                </div>
                <div>
                  <p className="text-green-700">Est. Monthly Revenue</p>
                  <p className="text-lg font-semibold text-green-900">
                    ${Math.round(monthlyRevenue).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-green-600">
                *Estimate based on industry averages. Actual rates vary by niche.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-textSecondary rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !downloads30d.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Metrics"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualMetricsModal;
