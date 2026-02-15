import React, { useState } from 'react';
import { CheckCircle, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User } from '../types';
import { createCheckoutSession, createPortalSession } from '../services/backend';

interface PricingProps {
  user: User;
}

const PAID_PLANS = ['starter', 'pro', 'growth'] as const;

const Pricing: React.FC<PricingProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expired = searchParams.get('expired') === 'true';
  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  const isOnPaidPlan = PAID_PLANS.includes(user.plan as any);

  const handleCheckout = async (plan: 'starter' | 'pro' | 'growth') => {
    setLoading(plan);
    setError(null);
    try {
      const interval = annual ? 'yearly' : 'monthly';
      const { url } = await createCheckoutSession(plan, interval);
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading('portal');
    setError(null);
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Success banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-green-800 font-semibold">Welcome aboard! Your subscription is active.</p>
            <p className="text-green-700 text-sm mt-1">Your 14-day free trial has started. You won't be charged until it ends.</p>
          </div>
        )}

        {/* Canceled banner */}
        {canceled && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-gray-700 text-sm">Checkout was canceled. No worries — you can try again anytime.</p>
          </div>
        )}

        {/* Expired banner */}
        {expired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-amber-800 font-semibold">Your 30-day beta trial has ended.</p>
            <p className="text-amber-700 text-sm mt-1">Choose a plan below to continue using all features, or stay on the Free tier.</p>
          </div>
        )}

        {/* Grace period warning */}
        {user.plan === 'beta_grace' && user.graceExpiresAt && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-red-800 font-semibold">Your beta access has ended.</p>
            <p className="text-red-700 text-sm mt-1">
              Upgrade within {Math.max(0, Math.ceil((new Date(user.graceExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} days to keep full automation, or you'll be moved to the Free tier.
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Current plan indicator */}
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">
            Current plan: <span className="font-semibold text-gray-900 capitalize">{user.plan === 'beta_grace' ? 'Beta (Grace)' : user.plan}</span>
            {user.plan === 'beta' && user.betaExpiresAt && (
              <span className="ml-2 text-amber-600">
                (ends {new Date(user.betaExpiresAt).toLocaleDateString()})
              </span>
            )}
            {isOnPaidPlan && (
              <button
                onClick={handleManageSubscription}
                disabled={loading === 'portal'}
                className="ml-3 text-primary hover:text-primary/80 underline text-sm"
              >
                {loading === 'portal' ? 'Opening...' : 'Manage Subscription'}
              </button>
            )}
          </p>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Choose Your <span className="text-primary">Plan</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Turn every podcast episode into LinkedIn posts, newsletters, and email series — automatically.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition ${annual ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-500'}`}>Annual</span>
          {annual && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Save up to $398</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className={`bg-white p-6 rounded-2xl border flex flex-col ${user.plan === 'free' ? 'border-primary border-2' : 'border-gray-300'}`}>
            {user.plan === 'free' && <div className="text-xs font-bold text-primary mb-2">CURRENT PLAN</div>}
            <h3 className="text-xl font-bold text-gray-900">Free</h3>
            <p className="text-4xl font-extrabold text-gray-900 mt-3">$0</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">No credit card required</p>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                '3 transcript analyses / cycle',
                '5 scheduled posts / cycle',
                'LinkedIn content generation',
                'Newsletter generation',
                'Email series drafting',
                'Gmail integration',
                '1 user',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-3 bg-gray-100 text-gray-500 font-bold rounded-lg cursor-not-allowed">
              {user.plan === 'free' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>

          {/* Starter */}
          <div className={`bg-white p-6 rounded-2xl border flex flex-col ${user.plan === 'starter' ? 'border-primary border-2' : 'border-gray-300'}`}>
            {user.plan === 'starter' && <div className="text-xs font-bold text-primary mb-2">CURRENT PLAN</div>}
            <h3 className="text-xl font-bold text-gray-900">Starter</h3>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold text-gray-900 mt-3">$490<span className="text-base font-normal text-gray-500">/yr</span></p>
                <p className="text-sm text-green-600 font-semibold mt-1">Save $98 &mdash; $40.83/mo</p>
              </>
            ) : (
              <p className="text-4xl font-extrabold text-gray-900 mt-3">$49<span className="text-base font-normal text-gray-500">/mo</span></p>
            )}
            <p className="text-sm text-gray-500 mt-1 mb-5">For solo podcasters</p>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                '10 transcript analyses / cycle',
                '20 scheduled posts / cycle',
                'LinkedIn content generation',
                'Newsletter generation',
                'Schedule LinkedIn posts',
                'Schedule newsletters',
                'Content calendar',
                'Gmail integration',
                '1 user',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 italic mb-4">Replaces 5&ndash;10 hours of manual posting per month.</p>
            {user.plan === 'starter' ? (
              <button disabled className="w-full py-3 bg-primary/20 text-primary font-bold rounded-lg cursor-not-allowed">
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('starter')}
                disabled={loading !== null}
                className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'starter' && <Loader2 className="h-4 w-4 animate-spin" />}
                Start 14-Day Free Trial
              </button>
            )}
          </div>

          {/* Pro */}
          <div className={`bg-white p-6 rounded-2xl border-2 relative flex flex-col transform md:-translate-y-2 ${user.plan === 'pro' ? 'border-primary' : 'border-primary'}`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
            {user.plan === 'pro' && <div className="text-xs font-bold text-primary mb-2 mt-2">CURRENT PLAN</div>}
            <h3 className={`text-xl font-bold text-gray-900 ${user.plan !== 'pro' ? 'mt-2' : ''}`}>Pro</h3>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold text-gray-900 mt-3">$990<span className="text-base font-normal text-gray-500">/yr</span></p>
                <p className="text-sm text-green-600 font-semibold mt-1">Save $198 &mdash; $82.50/mo</p>
              </>
            ) : (
              <p className="text-4xl font-extrabold text-gray-900 mt-3">$99<span className="text-base font-normal text-gray-500">/mo</span></p>
            )}
            <p className="text-sm text-gray-500 mt-1 mb-5">For serious creators & growing brands</p>
            <p className="text-xs font-semibold text-primary mb-3">Everything in Starter, plus:</p>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                '30 transcript analyses / cycle',
                '75 scheduled posts / cycle',
                'SendGrid integration',
                'Kit (ConvertKit) integration',
                'Advanced email scheduling',
                'Multiple mailing list support',
                'Team access (up to 3 members)',
                'Priority support',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 italic mb-4">Replaces a VA + email automation tool stack.</p>
            {user.plan === 'pro' ? (
              <button disabled className="w-full py-3 bg-primary/20 text-primary font-bold rounded-lg cursor-not-allowed">
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('pro')}
                disabled={loading !== null}
                className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'pro' && <Loader2 className="h-4 w-4 animate-spin" />}
                Start 14-Day Free Trial
              </button>
            )}
          </div>

          {/* Growth */}
          <div className={`bg-white p-6 rounded-2xl border flex flex-col ${user.plan === 'growth' ? 'border-primary border-2' : 'border-gray-300'}`}>
            {user.plan === 'growth' && <div className="text-xs font-bold text-primary mb-2">CURRENT PLAN</div>}
            <div className="flex items-center gap-2 mb-0">
              <Crown className="h-5 w-5 text-amber-600" />
              <h3 className="text-xl font-bold text-gray-900">Growth</h3>
            </div>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold text-gray-900 mt-3">$1,990<span className="text-base font-normal text-gray-500">/yr</span></p>
                <p className="text-sm text-green-600 font-semibold mt-1">Save $398 &mdash; $165.83/mo</p>
              </>
            ) : (
              <p className="text-4xl font-extrabold text-gray-900 mt-3">$199<span className="text-base font-normal text-gray-500">/mo</span></p>
            )}
            <p className="text-sm text-gray-500 mt-1 mb-5">For agencies & podcast networks</p>
            <p className="text-xs font-semibold text-gray-700 mb-3">Everything in Pro, plus:</p>
            <ul className="space-y-3 mb-6 flex-1">
              {[
                '150 transcript analyses / cycle',
                '400 scheduled posts / cycle',
                'Expanded team seats',
                'Multi-user workflow',
                'Role-based permissions',
                'Team scheduling visibility',
                'Dedicated onboarding call',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 italic mb-4">Replaces internal content coordination overhead.</p>
            {user.plan === 'growth' ? (
              <button disabled className="w-full py-3 bg-primary/20 text-primary font-bold rounded-lg cursor-not-allowed">
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('growth')}
                disabled={loading !== null}
                className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'growth' && <Loader2 className="h-4 w-4 animate-spin" />}
                Start 14-Day Free Trial
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          All paid plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
