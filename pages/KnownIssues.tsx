import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Bug, Zap, Database, Users, Timer, XCircle, Sparkles } from 'lucide-react';

const KnownIssues: React.FC = () => {
  const issues = [
    {
      id: 'rss-parsing',
      title: 'RSS Feed Parsing Issues',
      status: 'investigating',
      description: 'Some RSS feeds with non-standard formats may fail to parse correctly.',
      workaround: 'Try using a different RSS URL or contact support if the issue persists.',
      reported: '2024-01-15',
      priority: 'high'
    },
    {
      id: 'spotify-analytics',
      title: 'Spotify Analytics Sync Delay',
      status: 'monitoring',
      description: 'Analytics data from Spotify may take up to 48 hours to appear after initial connection.',
      workaround: 'Data will appear automatically. No action needed.',
      reported: '2024-01-10',
      priority: 'medium'
    },
    {
      id: 'mobile-layout',
      title: 'Mobile Layout Issues',
      status: 'fixed',
      description: 'Some components may not display correctly on very small screens.',
      workaround: 'Use desktop or tablet for best experience. Fix deployed in v1.2.1.',
      reported: '2024-01-05',
      priority: 'low'
    },
    {
      id: 'analysis-timeout',
      title: 'Long Analysis Timeout',
      status: 'resolved',
      description: 'Very large podcasts (1000+ episodes) may timeout during analysis.',
      workaround: 'Split analysis into smaller batches or contact support for assistance.',
      reported: '2024-01-01',
      priority: 'medium'
    }
  ];

  const betaLimits = [
    {
      icon: <Users className="h-6 w-6 text-blue-600" />,
      title: 'One Podcast Per User',
      description: 'Currently limited to analyzing one podcast per user account.',
      reason: 'Ensuring quality analysis and fair resource usage during beta.'
    },
    {
      icon: <Timer className="h-6 w-6 text-orange-600" />,
      title: 'Rate Limits',
      description: '5 analyses and 10 content repurposing requests per day.',
      reason: 'Managing AI API costs and ensuring system stability.'
    },
    {
      icon: <Database className="h-6 w-6 text-purple-600" />,
      title: 'File Size Limits',
      description: '50MB for transcripts, 2GB for audio files.',
      reason: 'Processing time and storage constraints.'
    }
  ];

  const notBuiltYet = [
    {
      icon: <Sparkles className="h-6 w-6 text-pink-600" />,
      title: 'Multi-Podcast Support',
      description: 'Analyzing multiple podcasts under one account.',
      timeline: 'Q1 2026'
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: 'Real-time Analytics',
      description: 'Live updating metrics and performance data.',
      timeline: 'Q2 2026'
    },
    {
      icon: <Users className="h-6 w-6 text-green-600" />,
      title: 'Team Collaboration',
      description: 'Multiple users working on the same podcast account.',
      timeline: 'Q2 2026'
    },
    {
      icon: <Database className="h-6 w-6 text-indigo-600" />,
      title: 'Advanced Integrations',
      description: 'Direct connections to hosting platforms and social media.',
      timeline: 'Q3 2026'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'investigating':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'monitoring':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fixed':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Bug className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'monitoring':
        return 'bg-orange-100 text-orange-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'fixed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-8 w-8 text-orange-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Known Issues</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Current issues we're aware of and working on. If you encounter an issue not listed here,
          please <a href="mailto:beta-support@loquihq.com" className="text-primary hover:underline">report it</a>.
        </p>
      </div>

      {/* Status Legend */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-yellow-500 mr-2" />
            <span className="text-sm">Investigating</span>
          </div>
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
            <span className="text-sm">Monitoring</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm">Resolved</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm">Fixed</span>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-6">
        {issues.map((issue) => (
          <div key={issue.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                {getStatusIcon(issue.status)}
                <h3 className="text-xl font-semibold text-gray-900 ml-3">{issue.title}</h3>
              </div>
              <div className="flex space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                  {issue.status}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(issue.priority)}`}>
                  {issue.priority} priority
                </span>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{issue.description}</p>

            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-start">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div>
                  <h4 className="font-medium text-blue-900">Workaround</h4>
                  <p className="text-blue-800 mt-1">{issue.workaround}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center text-sm text-gray-500">
              <Database className="h-4 w-4 mr-1" />
              <span>Reported: {new Date(issue.reported).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Beta Limits */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Timer className="h-6 w-6 text-blue-600 mr-3" />
          Beta Limits & Constraints
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {betaLimits.map((limit, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border border-blue-100">
              <div className="flex items-center mb-3">
                {limit.icon}
                <h3 className="font-semibold text-gray-900 ml-3">{limit.title}</h3>
              </div>
              <p className="text-gray-700 mb-3">{limit.description}</p>
              <p className="text-sm text-blue-600 italic">{limit.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Not Built Yet */}
      <div className="mt-12 bg-purple-50 border border-purple-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Sparkles className="h-6 w-6 text-purple-600 mr-3" />
          What's Not Built Yet
        </h2>
        <p className="text-gray-700 mb-6">
          These features are planned but not available in the current beta. We're focusing on core functionality first.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notBuiltYet.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border border-purple-100">
              <div className="flex items-center mb-3">
                {feature.icon}
                <h3 className="font-semibold text-gray-900 ml-3">{feature.title}</h3>
              </div>
              <p className="text-gray-700 mb-3">{feature.description}</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                <Clock className="h-3 w-3 mr-1" />
                {feature.timeline}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report New Issue */}
      <div className="mt-12 bg-primary/5 border border-primary/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Didn't find your issue?</h2>
        <p className="text-gray-700 mb-4">
          If you're experiencing a problem not listed above, please report it so we can investigate and fix it.
        </p>
        <div className="flex space-x-4">
          <a
            href="mailto:beta-support@loquihq.com?subject=Beta Issue Report"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            <Bug className="h-4 w-4 mr-2" />
            Email Support
          </a>
          <a
            href="/beta-feedback"
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Use Feedback Form
          </a>
        </div>
      </div>
    </div>
  );
};

export default KnownIssues;