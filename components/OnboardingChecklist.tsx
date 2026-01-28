import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Rss, BarChart3, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action: () => void;
  route?: string;
}

interface OnboardingChecklistProps {
  onClose?: () => void;
  className?: string;
}

const DISMISSED_KEY = 'loquihq_onboarding_dismissed';

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ onClose, className = '' }) => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [allComplete, setAllComplete] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the checklist
    const wasDismissed = localStorage.getItem(DISMISSED_KEY);
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
    checkCompletionStatus();
  }, []);

  const checkCompletionStatus = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has connected a podcast
      const { data: podcasts } = await supabase
        .from('podcasts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const hasPodcast = podcasts && podcasts.length > 0;

      // Check if user has run any analyses (transcripts)
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const hasAnalysis = transcripts && transcripts.length > 0;

      // View content is completed if they have at least one analysis
      const hasViewedContent = hasAnalysis;

      const updatedSteps: OnboardingStep[] = [
        {
          id: 'connect-podcast',
          title: 'Connect Podcast',
          description: hasPodcast ? 'Podcast connected!' : 'Link your podcast RSS feed to get started',
          icon: <Rss className="h-5 w-5" />,
          completed: hasPodcast,
          action: () => navigate(hasPodcast ? '/podcast-analytics' : '/connect-podcast'),
          route: '/connect-podcast'
        },
        {
          id: 'first-analysis',
          title: 'Run First Analysis',
          description: hasAnalysis ? 'Analysis complete!' : 'Analyze your podcast content for insights',
          icon: <BarChart3 className="h-5 w-5" />,
          completed: hasAnalysis,
          action: () => navigate('/new-analysis'),
          route: '/new-analysis'
        },
        {
          id: 'view-content',
          title: 'View Repurposed Content',
          description: hasViewedContent ? 'Content ready to use!' : 'See your content transformed into new formats',
          icon: <FileText className="h-5 w-5" />,
          completed: hasViewedContent,
          action: () => navigate('/dashboard'),
          route: '/dashboard'
        }
      ];

      setSteps(updatedSteps);

      // Check if all steps are complete
      const allDone = updatedSteps.every(step => step.completed);
      setAllComplete(allDone);

      // Auto-dismiss if all complete
      if (allDone) {
        localStorage.setItem(DISMISSED_KEY, 'true');
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
    onClose?.();
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Don't render if dismissed or all complete
  if (dismissed || allComplete) {
    return null;
  }

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg border border-gray-300 shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-gray-300 rounded w-full mb-6"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-300 rounded"></div>
            <div className="h-16 bg-gray-300 rounded"></div>
            <div className="h-16 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-100 rounded-lg border border-gray-300 shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-textPrimary">Welcome to LoquiHQ!</h3>
          <p className="text-sm text-textMuted">Complete these steps to get started</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss checklist"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-textSecondary mb-2">
          <span>Progress</span>
          <span>{completedSteps} of {totalSteps} completed</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
              step.completed
                ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20'
                : 'border-gray-300 bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={step.action}
          >
            <div className={`flex-shrink-0 ${step.completed ? 'text-green-500' : 'text-textMuted'}`}>
              {step.completed ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={step.completed ? 'text-green-500' : 'text-textSecondary'}>
                  {step.icon}
                </div>
                <h4 className={`font-medium ${step.completed ? 'text-green-400' : 'text-textPrimary'}`}>
                  {step.title}
                </h4>
              </div>
              <p className={`text-sm mt-1 ${step.completed ? 'text-green-400/80' : 'text-textMuted'}`}>
                {step.description}
              </p>
            </div>

            <div className="flex-shrink-0">
              <span className="text-xs text-textMuted bg-gray-300 px-2 py-1 rounded">
                {index + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default OnboardingChecklist;