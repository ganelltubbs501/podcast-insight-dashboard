import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { MonetizationInput, PodcastMetrics } from '../types/monetization';

interface MonetizationInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: MonetizationInput) => Promise<void>;
  podcastTitle: string;
}

type Step = 'platform' | 'audience' | 'monetization' | 'goals';

export const MonetizationInputModal: React.FC<MonetizationInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  podcastTitle
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('platform');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [hasAnalyticsAccess, setHasAnalyticsAccess] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<string>('');
  const [metrics, setMetrics] = useState<Partial<PodcastMetrics>>({});
  const [monetizationMethods, setMonetizationMethods] = useState<string[]>([]);
  const [currentMonthlyRevenue, setCurrentMonthlyRevenue] = useState<number | undefined>();
  const [revenueGoal, setRevenueGoal] = useState<number | undefined>();
  const [timeline, setTimeline] = useState<string>('3-months');

  if (!isOpen) return null;

  const handleMetricChange = (field: keyof PodcastMetrics, value: any) => {
    setMetrics(prev => ({ ...prev, [field]: value }));
  };

  const toggleMonetizationMethod = (method: string) => {
    setMonetizationMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const input: MonetizationInput = {
        hasAnalyticsAccess: hasAnalyticsAccess ?? false,
        platform: platform || undefined,
        metrics,
        monetizationMethods: monetizationMethods as any,
        currentMonthlyRevenue,
        revenueGoal,
        timeline: timeline as any
      };
      await onSubmit(input);
      onClose();
    } catch (error) {
      console.error('Failed to submit monetization input:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'platform':
        return hasAnalyticsAccess !== null;
      case 'audience':
        return metrics.downloadsPerEpisode !== undefined || metrics.totalDownloads !== undefined;
      case 'monetization':
        return monetizationMethods.length > 0;
      case 'goals':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['platform', 'audience', 'monetization', 'goals'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['platform', 'audience', 'monetization', 'goals'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const renderStepIndicator = () => {
    const steps: { key: Step; label: string }[] = [
      { key: 'platform', label: 'Platform' },
      { key: 'audience', label: 'Audience' },
      { key: 'monetization', label: 'Current Status' },
      { key: 'goals', label: 'Goals' }
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  currentStep === step.key
                    ? 'bg-blue-600 text-white'
                    : steps.findIndex(s => s.key === currentStep) > index
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-textSecondary'
                }`}
              >
                {steps.findIndex(s => s.key === currentStep) > index ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep === step.key ? 'text-blue-600' : 'text-textMuted'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-4 rounded ${
                steps.findIndex(s => s.key === currentStep) > index
                  ? 'bg-green-600'
                  : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderPlatformStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-textPrimary mb-2">Let's get your real numbers</h3>
        <p className="text-textSecondary">
          First, tell us where you host your podcast. We'll try to pull data automatically, or you can enter it manually.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-textSecondary mb-3">
            Do you have access to your podcast analytics?
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setHasAnalyticsAccess(true)}
              className={`flex-1 p-4 rounded-lg border-2 transition ${
                hasAnalyticsAccess === true
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-semibold text-textPrimary">Yes, I can see my downloads</div>
              <div className="text-sm text-textSecondary mt-1">I'll enter real numbers</div>
            </button>
            <button
              onClick={() => setHasAnalyticsAccess(false)}
              className={`flex-1 p-4 rounded-lg border-2 transition ${
                hasAnalyticsAccess === false
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-semibold text-textPrimary">No, I don't have access</div>
              <div className="text-sm text-textSecondary mt-1">We'll estimate based on your show</div>
            </button>
          </div>
        </div>

        {hasAnalyticsAccess === true && (
          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">
              Where do you host your podcast?
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select your platform</option>
              <option value="spotify">Spotify for Podcasters</option>
              <option value="apple">Apple Podcasts Connect</option>
              <option value="buzzsprout">Buzzsprout</option>
              <option value="libsyn">Libsyn</option>
              <option value="anchor">Anchor</option>
              <option value="other">Other</option>
            </select>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Why this matters:</strong> Knowing your platform helps us understand which metrics are available and how reliable our estimates can be.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAudienceStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-textPrimary mb-2">Tell us about your audience</h3>
        <p className="text-textSecondary">
          These numbers help us recommend the right monetization strategies for your show.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">
              Downloads per episode (average)
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="number"
              value={metrics.downloadsPerEpisode || ''}
              onChange={(e) => handleMetricChange('downloadsPerEpisode', parseInt(e.target.value) || undefined)}
              placeholder="e.g., 1,500"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-textMuted mt-1">First 30 days after release</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">
              Total downloads (all episodes)
            </label>
            <input
              type="number"
              value={metrics.totalDownloads || ''}
              onChange={(e) => handleMetricChange('totalDownloads', parseInt(e.target.value) || undefined)}
              placeholder="e.g., 50,000"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">
              Completion rate (%)
            </label>
            <input
              type="number"
              value={metrics.completionRate || ''}
              onChange={(e) => handleMetricChange('completionRate', parseInt(e.target.value) || undefined)}
              placeholder="e.g., 65"
              min="0"
              max="100"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-textMuted mt-1">% who finish your episodes</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">
              Email list size
            </label>
            <input
              type="number"
              value={metrics.emailListSize || ''}
              onChange={(e) => handleMetricChange('emailListSize', parseInt(e.target.value) || undefined)}
              placeholder="e.g., 500"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-textMuted mt-1">Newsletter subscribers</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-textSecondary mb-2">
            How many episodes have you published?
          </label>
          <input
            type="number"
            value={metrics.totalEpisodes || ''}
            onChange={(e) => handleMetricChange('totalEpisodes', parseInt(e.target.value) || undefined)}
            placeholder="e.g., 42"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Why completion rate matters:</strong> A 70%+ completion rate means your audience is highly engaged.
            Sponsors pay more for engaged audiences because ads actually get heard.
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonetizationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-textPrimary mb-2">Current monetization</h3>
        <p className="text-textSecondary">
          Tell us what you're doing now so we can show you what you're missing.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-textSecondary mb-3">
            How are you currently making money from this podcast?
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="space-y-2">
            {[
              { value: 'sponsorships', label: 'Sponsorships/Ads', description: 'Brand deals, ad reads, pre-roll/mid-roll ads' },
              { value: 'products', label: 'Products/Services', description: 'Your own courses, coaching, consulting' },
              { value: 'affiliates', label: 'Affiliate Marketing', description: 'Commissions from recommending products' },
              { value: 'memberships', label: 'Memberships/Patreon', description: 'Paid subscriptions, premium content' },
              { value: 'none', label: 'Not monetizing yet', description: 'Building audience first' }
            ].map(method => (
              <button
                key={method.value}
                onClick={() => toggleMonetizationMethod(method.value)}
                className={`w-full p-4 rounded-lg border-2 text-left transition ${
                  monetizationMethods.includes(method.value)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-textPrimary">{method.label}</div>
                    <div className="text-sm text-textSecondary mt-1">{method.description}</div>
                  </div>
                  {monetizationMethods.includes(method.value) && (
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {monetizationMethods.length > 0 && !monetizationMethods.includes('none') && (
          <div>
            <label className="block text-sm font-semibold text-textSecondary mb-2">
              What's your current monthly revenue from the podcast?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">$</span>
              <input
                type="number"
                value={currentMonthlyRevenue || ''}
                onChange={(e) => setCurrentMonthlyRevenue(parseInt(e.target.value) || undefined)}
                placeholder="e.g., 500"
                className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-textMuted mt-1">Rough estimate is fine. This stays private.</p>
          </div>
        )}

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <HelpCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <strong>Why we ask:</strong> We'll show you exactly how much money you're leaving on the table
            with your current setup, and the fastest path to close that gap.
          </div>
        </div>
      </div>
    </div>
  );

  const renderGoalsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-textPrimary mb-2">What's your goal?</h3>
        <p className="text-textSecondary">
          Tell us where you want to be so we can build you a realistic roadmap.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-textSecondary mb-2">
            Monthly revenue goal
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">$</span>
            <input
              type="number"
              value={revenueGoal || ''}
              onChange={(e) => setRevenueGoal(parseInt(e.target.value) || undefined)}
              placeholder="e.g., 2,000"
              className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-xs text-textMuted mt-1">What would make this worth it for you?</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-textSecondary mb-2">
            Timeline
          </label>
          <select
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1-month">1 month - I need money now</option>
            <option value="3-months">3 months - Realistic growth</option>
            <option value="6-months">6 months - Building sustainable income</option>
            <option value="12-months">12 months - Long-term strategy</option>
          </select>
        </div>

        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-sm text-purple-900">
            <strong>💡 We'll tell you the truth:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>If your goal is realistic with your current audience</li>
              <li>What needs to change to hit your target</li>
              <li>Which monetization method will get you there fastest</li>
              <li>Exactly what to do next (not "grow your downloads")</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-300 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-textPrimary">Real Monetization Analysis</h2>
            <p className="text-sm text-textSecondary mt-1">For: {podcastTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-textSecondary transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6">
          {renderStepIndicator()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {currentStep === 'platform' && renderPlatformStep()}
          {currentStep === 'audience' && renderAudienceStep()}
          {currentStep === 'monetization' && renderMonetizationStep()}
          {currentStep === 'goals' && renderGoalsStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-300 flex items-center justify-between bg-gray-50">
          {currentStep === 'platform' ? (
            <button
              onClick={onClose}
              className="px-6 py-2 text-textSecondary font-semibold hover:text-textPrimary transition"
            >
              ← Back to Options
            </button>
          ) : (
            <button
              onClick={prevStep}
              className="px-6 py-2 text-textSecondary font-semibold hover:text-textPrimary transition"
            >
              ← Back
            </button>
          )}

          {currentStep === 'goals' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {isSubmitting ? 'Analyzing...' : 'Get My Truth Statement'}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
