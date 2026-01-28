import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rss,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Upload,
  Keyboard,
  Link2,
  Headphones,
  Calendar,
  BarChart3,
} from "lucide-react";
import { connectPodcastRss } from "../services/podcast";
import type { ConnectRssResponse, AnalyticsSourceOption } from "../types/podcast-analytics";
import ErrorDisplay from "../components/ErrorDisplay";

type Step = "rss" | "analytics" | "success";

const ConnectPodcast: React.FC = () => {
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<Step>("rss");

  // RSS step state
  const [rssUrl, setRssUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<any>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectRssResponse | null>(null);

  // Analytics step state
  const [selectedSource, setSelectedSource] = useState<AnalyticsSourceOption | null>(null);

  /**
   * Handle RSS URL submission
   */
  const handleConnectRss = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!rssUrl.trim()) {
      setError(new Error("Please enter your podcast RSS feed URL"));
      return;
    }

    // Basic URL validation
    try {
      new URL(rssUrl);
    } catch {
      setError(new Error("Please enter a valid URL"));
      return;
    }

    setIsConnecting(true);
    try {
      const result = await connectPodcastRss(rssUrl.trim());
      setConnectionResult(result);
      setStep("analytics");
    } catch (err: any) {
      setError(err);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Handle analytics source selection
   */
  const handleSelectSource = (source: AnalyticsSourceOption) => {
    setSelectedSource(source);
  };

  /**
   * Continue to dashboard or manual entry
   */
  const handleContinue = () => {
    if (selectedSource === "manual") {
      // Go to analytics page with manual entry modal open
      navigate("/podcast-analytics?openMetrics=true");
    } else {
      // For now, all sources go to the analytics page
      navigate("/podcast-analytics");
    }
  };

  /**
   * Render Step A: RSS Connection
   */
  const renderRssStep = () => (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Rss className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-textPrimary mb-2">Connect Your Podcast</h1>
        <p className="text-textMuted">
          Enter your podcast RSS feed URL to get started with analytics and monetization insights.
        </p>
      </div>

      {/* RSS Form */}
      <form onSubmit={handleConnectRss} className="space-y-6">
        <div>
          <label htmlFor="rss-url" className="block text-sm font-medium text-textSecondary mb-2">
            RSS Feed URL
          </label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
            <input
              id="rss-url"
              type="url"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://feeds.buzzsprout.com/12345.rss"
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              disabled={isConnecting}
            />
          </div>
          <p className="mt-2 text-sm text-textMuted">
            Find this in your podcast hosting dashboard (Buzzsprout, Libsyn, Anchor, etc.)
          </p>
        </div>

        {error && (
          <ErrorDisplay error={error} />
        )}

        <button
          type="submit"
          disabled={isConnecting || !rssUrl.trim()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect Podcast
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Help text */}
      <div className="mt-8 p-4 bg-gray-200 border border-gray-300 rounded-lg">
        <h3 className="font-medium text-textPrimary mb-2">Where to find your RSS feed</h3>
        <ul className="text-sm text-textMuted space-y-1">
          <li>
            <strong>Buzzsprout:</strong> Settings → Directories → RSS Feed
          </li>
          <li>
            <strong>Libsyn:</strong> Destinations → My Podcast RSS Feed
          </li>
          <li>
            <strong>Anchor/Spotify:</strong> Settings → RSS Distribution
          </li>
          <li>
            <strong>Apple Podcasts:</strong> Copy from your podcast page URL
          </li>
        </ul>
      </div>
    </div>
  );

  /**
   * Render Step B: Analytics Source Selection
   */
  const renderAnalyticsStep = () => (
    <div className="max-w-3xl mx-auto">
      {/* Success Banner */}
      {connectionResult && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-4">
            {connectionResult.podcast.imageUrl ? (
              <img
                src={connectionResult.podcast.imageUrl}
                alt={connectionResult.podcast.title}
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Headphones className="w-10 h-10 text-green-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </div>
              <h2 className="text-xl font-bold text-textPrimary truncate">
                {connectionResult.podcast.title}
              </h2>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-textMuted">
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  {connectionResult.episodeCount} episodes
                </span>
                {connectionResult.podcast.cadence && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {connectionResult.podcast.cadence}
                  </span>
                )}
                {connectionResult.detectedProvider && connectionResult.detectedProvider !== "unknown" && (
                  <span className="capitalize">{connectionResult.detectedProvider}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-textPrimary mb-2">Choose Analytics Source</h1>
        <p className="text-textMuted">
          How would you like to provide your download metrics?
        </p>
      </div>

      {/* Source Options */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {/* Provider API - Coming Soon */}
        <button
          onClick={() => handleSelectSource("provider")}
          disabled
          className={`p-6 rounded-xl border-2 text-left transition relative ${
            selectedSource === "provider"
              ? "border-primary bg-primary/5"
              : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
          }`}
        >
          <span className="absolute top-2 right-2 text-xs bg-gray-200 text-textMuted px-2 py-0.5 rounded">
            Coming Soon
          </span>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Link2 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-textPrimary mb-1">Connect Provider</h3>
          <p className="text-sm text-textMuted">
            Auto-sync metrics from Buzzsprout, Transistor, or Spotify.
          </p>
        </button>

        {/* CSV Upload - Coming Soon */}
        <button
          onClick={() => handleSelectSource("csv")}
          disabled
          className={`p-6 rounded-xl border-2 text-left transition relative ${
            selectedSource === "csv"
              ? "border-primary bg-primary/5"
              : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
          }`}
        >
          <span className="absolute top-2 right-2 text-xs bg-gray-200 text-textMuted px-2 py-0.5 rounded">
            Coming Soon
          </span>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <Upload className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-textPrimary mb-1">Upload CSV</h3>
          <p className="text-sm text-textMuted">
            Import download data from your hosting platform export.
          </p>
        </button>

        {/* Manual Entry - Available */}
        <button
          onClick={() => handleSelectSource("manual")}
          className={`p-6 rounded-xl border-2 text-left transition ${
            selectedSource === "manual"
              ? "border-primary bg-primary/5"
              : "border-gray-200 bg-gray-50 hover:border-gray-300"
          }`}
        >
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Keyboard className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-textPrimary mb-1">Enter Manually</h3>
          <p className="text-sm text-textMuted">
            Input your 30-day download numbers directly.
          </p>
        </button>
      </div>

      {/* Continue Button */}
      <div className="flex gap-4">
        <button
          onClick={() => setStep("rss")}
          className="px-6 py-3 border border-gray-300 text-textSecondary rounded-lg hover:bg-gray-50 transition"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedSource}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Skip option */}
      <div className="mt-6 text-center space-y-3">
        <button
          onClick={() => navigate("/podcast-analytics")}
          className="text-sm text-primary hover:text-primary/80 underline transition"
        >
          Skip for now — go to Podcast Analytics
        </button>
        <p className="text-xs text-textMuted">
          or{" "}
          <button
            onClick={() => navigate("/dashboard")}
            className="text-primary hover:text-primary/80 underline"
          >
            go to Main Dashboard
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Progress indicator */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === "rss" ? "bg-primary text-white" : "bg-green-500 text-white"
            }`}
          >
            {step === "rss" ? "1" : <CheckCircle className="w-5 h-5" />}
          </div>
          <div
            className={`w-16 h-1 rounded ${
              step !== "rss" ? "bg-primary" : "bg-gray-200"
            }`}
          />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === "analytics"
                ? "bg-primary text-white"
                : step === "success"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-textMuted"
            }`}
          >
            {step === "success" ? <CheckCircle className="w-5 h-5" /> : "2"}
          </div>
        </div>
        <div className="flex justify-center gap-16 mt-2 text-sm">
          <span className={step === "rss" ? "text-primary font-medium" : "text-textMuted"}>
            Connect RSS
          </span>
          <span className={step === "analytics" ? "text-primary font-medium" : "text-textMuted"}>
            Analytics
          </span>
        </div>
      </div>

      {/* Step Content */}
      {step === "rss" && renderRssStep()}
      {step === "analytics" && renderAnalyticsStep()}
    </div>
  );
};

export default ConnectPodcast;
