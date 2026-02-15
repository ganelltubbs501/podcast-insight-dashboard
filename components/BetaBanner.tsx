import React from 'react';
import { Clock, AlertTriangle, ArrowRight, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface BetaBannerProps {
  user: User;
}

const BetaBanner: React.FC<BetaBannerProps> = ({ user }) => {
  const navigate = useNavigate();

  // Phase 1: Active beta — subtle countdown
  if (user.plan === 'beta' && user.betaExpiresAt) {
    const ms = new Date(user.betaExpiresAt).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    const isUrgent = days <= 7;

    return (
      <div className={`w-full px-4 py-2.5 text-sm font-medium text-center flex items-center justify-center gap-2 ${
        isUrgent
          ? 'bg-amber-100 text-amber-900 border-b border-amber-200'
          : 'bg-blue-50 text-blue-800 border-b border-blue-200'
      }`}>
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          Beta Access &mdash; <strong>{days} day{days !== 1 ? 's' : ''} remaining</strong>
        </span>
      </div>
    );
  }

  // Phase 2: Grace period — persistent red warning
  if (user.plan === 'beta_grace' && user.graceExpiresAt) {
    const ms = new Date(user.graceExpiresAt).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));

    return (
      <div className="w-full px-4 py-3 text-sm font-medium text-center flex items-center justify-center gap-2 bg-red-100 text-red-900 border-b border-red-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Your beta access has ended. Upgrade in <strong>{days} day{days !== 1 ? 's' : ''}</strong> to avoid losing automation.
        </span>
        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-1 ml-2 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition"
        >
          Upgrade Now
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Phase 3: Downgraded to free — calm upsell
  if (user.plan === 'free') {
    return (
      <div className="w-full px-4 py-2.5 text-sm font-medium text-center flex items-center justify-center gap-2 bg-gray-100 text-gray-700 border-b border-gray-200">
        <ArrowUpCircle className="h-4 w-4 shrink-0" />
        <span>
          You're on the Free plan. Upgrade to restore full automation.
        </span>
        <button
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-1 ml-2 px-3 py-1 rounded-full text-xs font-bold bg-primary text-white hover:bg-primary/90 transition"
        >
          Upgrade
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return null;
};

export default BetaBanner;
