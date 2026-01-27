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

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ onClose, className = '' }) => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUserStatus();
    initializeSteps();
  }, []);

  const checkUserStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const initializeSteps = () => {
    const initialSteps: OnboardingStep[] = [
      {
        id: 'connect-podcast',
        title: 'Connect Podcast',
        description: 'Link your podcast RSS feed to get started',
        icon: <Rss className="h-5 w-5" />,
        completed: false,
        action: () => navigate('/connect-podcast'),
        route: '/connect-podcast'
      },
      {
        id: 'first-analysis',
        title: 'Run First Analysis',
        description: 'Analyze your podcast content for insights',
        icon: <BarChart3 className="h-5 w-5" />,
        completed: false,
        action: () => navigate('/new-analysis'),
        route: '/new-analysis'
      },
      {
        id: 'view-content',
        title: 'View Repurposed Content',
        description: 'See your content transformed into new formats',
        icon: <FileText className="h-5 w-5" />,
        completed: false,
        action: () => navigate('/dashboard'),
        route: '/dashboard'
      }
    ];

    // Check completion status based on current route and user state
    const currentPath = window.location.pathname;
    const updatedSteps = initialSteps.map(step => ({
      ...step,
      completed: checkStepCompletion(step.id, currentPath, user)
    }));

    setSteps(updatedSteps);
  };

  const checkStepCompletion = (stepId: string, currentPath: string, _user: any): boolean => {
    switch (stepId) {
      case 'connect-podcast':
        return currentPath.includes('/podcast-analytics') || currentPath.includes('/connect-podcast');
      case 'first-analysis':
        return currentPath.includes('/results') || currentPath.includes('/new-analysis');
      case 'view-content':
        return currentPath.includes('/dashboard') && steps.some(s => s.id === 'first-analysis' && s.completed);
      default:
        return false;
    }
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercent = (completedSteps / totalSteps) * 100;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Welcome to LoquiHQ!</h3>
          <p className="text-sm text-gray-700">Complete these steps to get started</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <span>Progress</span>
          <span>{completedSteps} of {totalSteps} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
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
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
              step.completed
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={step.action}
          >
            <div className={`flex-shrink-0 ${step.completed ? 'text-green-600' : 'text-gray-500'}`}>
              {step.completed ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={step.completed ? 'text-green-600' : 'text-gray-700'}>
                  {step.icon}
                </div>
                <h4 className={`font-medium ${step.completed ? 'text-green-800' : 'text-gray-900'}`}>
                  {step.title}
                </h4>
              </div>
              <p className={`text-sm mt-1 ${step.completed ? 'text-green-700' : 'text-gray-700'}`}>
                {step.description}
              </p>
            </div>

            <div className="flex-shrink-0">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {index + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {completedSteps === totalSteps && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">All set! You're ready to explore LoquiHQ.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;