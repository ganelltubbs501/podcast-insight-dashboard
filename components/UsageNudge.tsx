import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUsage, UsageResponse } from '../services/backend';
import { User } from '../types';

interface UsageNudgeProps {
  user: User;
}

const UsageNudge: React.FC<UsageNudgeProps> = ({ user }) => {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  useEffect(() => {
    if (user.plan !== 'free') return;
    getUsage().then(setUsage).catch(() => {});
  }, [user.plan]);

  if (!usage || usage.isUnlimited || !usage.nearLimit || !usage.limits) return null;

  const nudges: string[] = [];
  if (usage.nearLimit.analyses) {
    nudges.push(`${usage.usage.analyses}/${usage.limits.analysesPerCycle} analyses used`);
  }
  if (usage.nearLimit.scheduledPosts) {
    nudges.push(`${usage.usage.scheduledPosts}/${usage.limits.scheduledPostsPerCycle} scheduled posts used`);
  }
  if (usage.nearLimit.automations) {
    nudges.push(`${usage.usage.activeAutomations}/${usage.limits.activeAutomations} automation${usage.limits.activeAutomations !== 1 ? 's' : ''} active`);
  }

  if (nudges.length === 0) return null;

  return (
    <div className="mx-4 mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-sm">
      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
      <div className="flex-1 text-amber-800">
        <span className="font-medium">You're almost at your limit.</span>{' '}
        {nudges.join(' · ')}
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition shrink-0"
      >
        Unlock Full Automation
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
};

export default UsageNudge;
