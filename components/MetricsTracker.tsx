import React, { useState } from 'react';
import { BarChart2, X, TrendingUp, Eye, MousePointer, Heart, Share2 } from 'lucide-react';
import { updateScheduledPost } from '../services/transcripts';
import { ScheduledPost } from '../types';

interface MetricsTrackerProps {
  post: ScheduledPost;
  onClose: () => void;
  onUpdate: () => void;
}

const MetricsTracker: React.FC<MetricsTrackerProps> = ({ post, onClose, onUpdate }) => {
  const [impressions, setImpressions] = useState(post.metrics?.impressions || 0);
  const [clicks, setClicks] = useState(post.metrics?.clicks || 0);
  const [likes, setLikes] = useState(post.metrics?.likes || 0);
  const [shares, setShares] = useState(post.metrics?.shares || 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateScheduledPost(post.id, {
        metrics: {
          impressions,
          clicks,
          likes,
          shares
        },
        status: 'Published' // Mark as published when metrics are tracked
      });

      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save metrics. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const engagementRate = impressions > 0 ? (((clicks + likes + shares) / impressions) * 100).toFixed(2) : '0.00';
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-300">
        {/* Header */}
        <div className="sticky top-0 bg-primary text-white p-6 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-6 w-6" />
            <h2 className="text-xl font-bold">Track Performance</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Post Info */}
          <div className="bg-accent-soft/20 border border-primary/30 rounded-lg p-4">
            <div className="text-xs font-bold text-primary uppercase mb-1">Platform</div>
            <div className="font-medium text-textBody capitalize">{post.platform}</div>
            <div className="text-xs text-textMuted mt-2">
              Scheduled: {new Date(post.scheduledDate).toLocaleString()}
            </div>
          </div>

          {/* Metrics Input */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-textMuted uppercase mb-2">
                <Eye className="h-4 w-4 text-primary" /> Impressions
              </label>
              <input
                type="number"
                min="0"
                value={impressions}
                onChange={(e) => setImpressions(Number(e.target.value))}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-textBody text-lg font-semibold"
                placeholder="0"
              />
              <p className="text-xs text-textMuted mt-1">Total number of times the post was shown</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-textMuted uppercase mb-2">
                <MousePointer className="h-4 w-4 text-blue-600" /> Clicks
              </label>
              <input
                type="number"
                min="0"
                value={clicks}
                onChange={(e) => setClicks(Number(e.target.value))}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-textBody text-lg font-semibold"
                placeholder="0"
              />
              <p className="text-xs text-textMuted mt-1">Link clicks or content taps</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-textMuted uppercase mb-2">
                <Heart className="h-4 w-4 text-red-500" /> Likes / Reactions
              </label>
              <input
                type="number"
                min="0"
                value={likes}
                onChange={(e) => setLikes(Number(e.target.value))}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-textBody text-lg font-semibold"
                placeholder="0"
              />
              <p className="text-xs text-textMuted mt-1">Hearts, likes, or reactions</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-textMuted uppercase mb-2">
                <Share2 className="h-4 w-4 text-green-600" /> Shares / Retweets
              </label>
              <input
                type="number"
                min="0"
                value={shares}
                onChange={(e) => setShares(Number(e.target.value))}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg p-3 text-textBody text-lg font-semibold"
                placeholder="0"
              />
              <p className="text-xs text-textMuted mt-1">Shares, retweets, or reposts</p>
            </div>
          </div>

          {/* Calculated Metrics */}
          {impressions > 0 && (
            <div className="bg-accent-soft p-4 rounded-lg border border-primary">
              <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Calculated Insights
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-primary uppercase">Engagement Rate</div>
                  <div className="text-2xl font-bold text-primary">{engagementRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-primary uppercase">Click-Through Rate</div>
                  <div className="text-2xl font-bold text-primary">{ctr}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-300">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 text-textSecondary rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <BarChart2 className="h-4 w-4" />
                  Save Metrics
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsTracker;
