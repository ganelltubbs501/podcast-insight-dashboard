import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, BarChart2, Calendar, Zap, Loader2, CheckCircle, Crown } from 'lucide-react';
import { User } from '../types';
import { getUsage, UsageResponse, createPortalSession } from '../services/backend';

interface SettingsBillingProps {
  user: User;
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  beta: 'Beta',
  beta_grace: 'Beta (Grace)',
  starter: 'Starter',
  pro: 'Pro',
  growth: 'Growth',
};

const PLAN_RANK: Record<string, number> = {
  free: 0, beta_grace: 0, beta: 5, starter: 1, pro: 2, growth: 3,
};

const UPGRADE_TIERS = [
  { key: 'starter', name: 'Starter', price: '$49/mo', features: ['10 analyses / cycle', '20 scheduled posts', 'Gmail integration', '1 user'] },
  { key: 'pro', name: 'Pro', price: '$99/mo', badge: 'Most Popular', features: ['30 analyses / cycle', '75 scheduled posts', 'SendGrid & Kit', 'Team (3 seats)', 'Priority support'] },
  { key: 'growth', name: 'Growth', price: '$199/mo', features: ['150 analyses / cycle', '400 scheduled posts', 'Expanded team', 'Role permissions', 'Dedicated onboarding'] },
];

const SettingsBilling: React.FC<SettingsBillingProps> = ({ user }) => {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsage()
      .then(setUsage)
      .catch(() => setError('Failed to load usage data'))
      .finally(() => setLoading(false));
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url) window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const isOnPaidPlan = ['starter', 'pro', 'growth'].includes(user.plan);
  const userRank = PLAN_RANK[user.plan] ?? 0;

  const cycleEnd = usage?.cycleEnd
    ? new Date(usage.cycleEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const renderProgressBar = (used: number, limit: number | null, label: string) => {
    if (limit === null) {
      return (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-textSecondary font-medium">{label}</span>
            <span className="font-semibold text-textPrimary">{used} used <span className="text-textMuted">/ Unlimited</span></span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2.5">
            <div className="bg-primary rounded-full h-2.5" style={{ width: '0%' }} />
          </div>
        </div>
      );
    }
    const pct = Math.min(100, Math.round((used / limit) * 100));
    const isNear = pct >= 80;
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-textSecondary font-medium">{label}</span>
          <span className={`font-semibold ${isNear ? 'text-red-600' : 'text-textPrimary'}`}>{used} / {limit}</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2.5">
          <div
            className={`rounded-full h-2.5 transition-all ${isNear ? 'bg-red-500' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-gray-500 mt-4">Loading billing details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 text-textSecondary hover:text-textPrimary mb-6 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </button>

      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-textPrimary">Billing & Plan</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-800 text-sm">{error}</div>
      )}

      {/* Beta warning */}
      {user.plan === 'beta' && user.betaExpiresAt && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 font-semibold">Your beta trial ends {new Date(user.betaExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
          <p className="text-amber-700 text-sm mt-1">Upgrade to a paid plan to keep full access after your trial ends.</p>
        </div>
      )}
      {user.plan === 'beta_grace' && user.graceExpiresAt && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-800 font-semibold">Your beta access has ended.</p>
          <p className="text-red-700 text-sm mt-1">
            Upgrade within {Math.max(0, Math.ceil((new Date(user.graceExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} days or you'll be moved to the Free tier.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Plan + Usage */}
        <div className="lg:col-span-2 space-y-6">

          {/* Current Plan Card */}
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-textMuted font-medium">Current Plan</p>
                <p className="text-2xl font-bold text-textPrimary">{PLAN_LABEL[user.plan] ?? user.plan}</p>
              </div>
              {isOnPaidPlan && (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="px-4 py-2 bg-gray-200 text-textPrimary rounded-lg text-sm font-medium hover:bg-gray-300 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Manage Subscription
                </button>
              )}
            </div>

            {cycleEnd && (
              <div className="flex items-center gap-2 text-sm text-textSecondary">
                <Calendar className="h-4 w-4" />
                <span>Cycle resets on <strong className="text-textPrimary">{cycleEnd}</strong></span>
              </div>
            )}
          </div>

          {/* Usage Snapshot */}
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-textPrimary">Usage This Cycle</h2>
            </div>

            {usage ? (
              <>
                {renderProgressBar(usage.usage.analyses, usage.limits.analysesPerCycle, 'Transcript Analyses')}
                {renderProgressBar(usage.usage.scheduledPosts, usage.limits.scheduledPostsPerCycle, 'Scheduled Posts')}
                {renderProgressBar(usage.usage.activeAutomations, usage.limits.activeAutomations, 'Active Automations')}
              </>
            ) : (
              <p className="text-textMuted text-sm">Usage data unavailable.</p>
            )}
          </div>

          {/* Billing Actions for non-paid users */}
          {!isOnPaidPlan && (
            <div className="bg-linear-to-br from-indigo-900 to-purple-900 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-300" />
                <h2 className="text-lg font-bold">Upgrade Your Plan</h2>
              </div>
              <p className="text-indigo-200 text-sm mb-4">
                Get more analyses, scheduling, and integrations with a paid plan.
              </p>
              <button
                onClick={() => navigate('/pricing')}
                className="px-6 py-2.5 bg-white text-indigo-900 font-bold rounded-lg hover:bg-indigo-50 transition text-sm"
              >
                View Plans & Pricing
              </button>
            </div>
          )}
        </div>

        {/* Right column: Plan tiers */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider">
            {userRank >= 3 ? 'Your Plan' : 'Available Upgrades'}
          </h3>

          {userRank >= 3 ? (
            <div className="bg-gray-100 border border-gray-300 rounded-xl p-5 text-center">
              <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-textPrimary">You're on the highest plan</p>
              <p className="text-sm text-textSecondary mt-1">Growth includes everything we offer.</p>
            </div>
          ) : (
            UPGRADE_TIERS
              .filter(t => PLAN_RANK[t.key] > userRank)
              .map(tier => (
                <div
                  key={tier.key}
                  className={`bg-gray-100 border rounded-xl p-5 ${tier.badge ? 'border-primary border-2' : 'border-gray-300'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-textPrimary">{tier.name}</h4>
                    <span className="text-sm font-semibold text-textSecondary">{tier.price}</span>
                  </div>
                  {tier.badge && (
                    <span className="inline-block text-xs font-bold text-primary bg-indigo-50 px-2 py-0.5 rounded-full mb-2">{tier.badge}</span>
                  )}
                  <ul className="space-y-1.5 mb-4">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-textSecondary">
                        <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition"
                  >
                    Upgrade to {tier.name}
                  </button>
                </div>
              ))
          )}

          {/* Manage subscription for paid users */}
          {isOnPaidPlan && (
            <div className="bg-gray-100 border border-gray-300 rounded-xl p-5">
              <h4 className="font-bold text-textPrimary mb-2">Billing Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full py-2 bg-gray-200 text-textPrimary text-sm font-medium rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Update Payment Method
                </button>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsBilling;
