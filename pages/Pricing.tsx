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
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#4B5563' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Success banner */}
        {success && (
          <div className="rounded-xl p-4 mb-8 text-center" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <p className="font-semibold" style={{ color: '#166534' }}>Welcome aboard! Your subscription is active.</p>
            <p className="text-sm mt-1" style={{ color: '#15803D' }}>Your 14-day free trial has started. You won't be charged until it ends.</p>
          </div>
        )}

        {/* Canceled banner */}
        {canceled && (
          <div className="rounded-xl p-4 mb-8 text-center" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p className="text-sm" style={{ color: '#374151' }}>Checkout was canceled. No worries — you can try again anytime.</p>
          </div>
        )}

        {/* Expired banner */}
        {expired && (
          <div className="rounded-xl p-4 mb-8 text-center" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p className="font-semibold" style={{ color: '#92400E' }}>Your 30-day beta trial has ended.</p>
            <p className="text-sm mt-1" style={{ color: '#B45309' }}>Choose a plan below to continue using all features, or stay on the Free tier.</p>
          </div>
        )}

        {/* Grace period warning */}
        {user.plan === 'beta_grace' && user.graceExpiresAt && (
          <div className="rounded-xl p-4 mb-8 text-center" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="font-semibold" style={{ color: '#991B1B' }}>Your beta access has ended.</p>
            <p className="text-sm mt-1" style={{ color: '#B91C1C' }}>
              Upgrade within {Math.max(0, Math.ceil((new Date(user.graceExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} days to keep full automation, or you'll be moved to the Free tier.
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-xl p-4 mb-8 text-center" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
          </div>
        )}

        {/* Current plan indicator */}
        <div className="text-center mb-4">
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Current plan: <span className="font-semibold capitalize" style={{ color: '#111827' }}>{user.plan === 'beta_grace' ? 'Beta (Grace)' : user.plan}</span>
            {user.plan === 'beta' && user.betaExpiresAt && (
              <span className="ml-2" style={{ color: '#D97706' }}>
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
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: '#111827' }}>
            Choose Your <span className="text-primary">Plan</span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#4B5563' }}>
            Turn every podcast episode into LinkedIn posts, newsletters, and email series — automatically.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="text-sm font-medium" style={{ color: !annual ? '#111827' : '#6B7280' }}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition ${annual ? 'bg-primary' : ''}`}
            style={!annual ? { backgroundColor: '#D1D5DB' } : undefined}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : ''}`} />
          </button>
          <span className="text-sm font-medium" style={{ color: annual ? '#111827' : '#6B7280' }}>Annual</span>
          {annual && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: '#166534', backgroundColor: '#DCFCE7' }}>Save up to $398</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className="p-6 rounded-2xl flex flex-col" style={{ backgroundColor: '#FFFFFF', border: user.plan === 'free' ? '2px solid var(--color-primary)' : '1px solid #D1D5DB' }}>
            {user.plan === 'free' && <div className="text-xs font-bold text-primary mb-2">CURRENT PLAN</div>}
            <h3 className="text-xl font-bold" style={{ color: '#111827' }}>Free</h3>
            <p className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>$0</p>
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B7280' }}>No credit card required</p>
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
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#6B7280' }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-3 font-bold rounded-lg cursor-not-allowed" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
              {user.plan === 'free' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>

          {/* Starter */}
          <div className="p-6 rounded-2xl flex flex-col" style={{ backgroundColor: '#FFFFFF', border: user.plan === 'starter' ? '2px solid var(--color-primary)' : '1px solid #D1D5DB' }}>
            {user.plan === 'starter' && <div className="text-xs font-bold text-primary mb-2">CURRENT PLAN</div>}
            <h3 className="text-xl font-bold" style={{ color: '#111827' }}>Starter</h3>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>$490<span className="text-base font-normal" style={{ color: '#6B7280' }}>/yr</span></p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#166534' }}>Save $98 &mdash; $40.83/mo</p>
              </>
            ) : (
              <p className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>$49<span className="text-base font-normal" style={{ color: '#6B7280' }}>/mo</span></p>
            )}
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B7280' }}>For solo podcasters</p>
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
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs italic mb-4" style={{ color: '#6B7280' }}>Replaces 5&ndash;10 hours of manual posting per month.</p>
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
          <div className="p-6 rounded-2xl relative flex flex-col transform md:-translate-y-2" style={{ backgroundColor: '#FFFFFF', border: '2px solid var(--color-primary)' }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
            {user.plan === 'pro' && <div className="text-xs font-bold text-primary mb-2 mt-2">CURRENT PLAN</div>}
            <h3 className={`text-xl font-bold ${user.plan !== 'pro' ? 'mt-2' : ''}`} style={{ color: '#111827' }}>Pro</h3>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>$990<span className="text-base font-normal" style={{ color: '#6B7280' }}>/yr</span></p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#166534' }}>Save $198 &mdash; $82.50/mo</p>
              </>
            ) : (
              <p className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>$99<span className="text-base font-normal" style={{ color: '#6B7280' }}>/mo</span></p>
            )}
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B7280' }}>For serious creators & growing brands</p>
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
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs italic mb-4" style={{ color: '#6B7280' }}>Replaces a VA + email automation tool stack.</p>
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
          <div className="p-6 rounded-2xl flex flex-col" style={{ backgroundColor: '#FFFFFF', border: user.plan === 'growth' ? '2px solid var(--color-primary)' : '1px solid #D1D5DB' }}>
            {user.plan === 'growth' && <div className="text-xs font-bold text-primary mb-2">CURRENT PLAN</div>}
            <div className="flex items-center gap-2 mb-0">
              <Crown className="h-5 w-5" style={{ color: '#D97706' }} />
              <h3 className="text-xl font-bold" style={{ color: '#111827' }}>Growth</h3>
            </div>
            {annual ? (
              <>
                <p className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>$1,990<span className="text-base font-normal" style={{ color: '#6B7280' }}>/yr</span></p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#166534' }}>Save $398 &mdash; $165.83/mo</p>
              </>
            ) : (
              <p className="text-4xl font-extrabold mt-3" style={{ color: '#111827' }}>$199<span className="text-base font-normal" style={{ color: '#6B7280' }}>/mo</span></p>
            )}
            <p className="text-sm mt-1 mb-5" style={{ color: '#6B7280' }}>For agencies & podcast networks</p>
            <p className="text-xs font-semibold mb-3" style={{ color: '#374151' }}>Everything in Pro, plus:</p>
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
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#D97706' }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs italic mb-4" style={{ color: '#6B7280' }}>Replaces internal content coordination overhead.</p>
            {user.plan === 'growth' ? (
              <button disabled className="w-full py-3 bg-primary/20 text-primary font-bold rounded-lg cursor-not-allowed">
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('growth')}
                disabled={loading !== null}
                className="w-full py-3 font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#111827', color: '#FFFFFF' }}
              >
                {loading === 'growth' && <Loader2 className="h-4 w-4 animate-spin" />}
                Start 14-Day Free Trial
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm mt-8" style={{ color: '#6B7280' }}>
          All paid plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
