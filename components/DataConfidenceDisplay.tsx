import React from 'react';
import { CheckCircle, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { DataConfidence } from '../types/monetization';

interface DataConfidenceDisplayProps {
  dataConfidence: DataConfidence[];
  overallConfidence: 'low' | 'medium' | 'high';
}

export const DataConfidenceDisplay: React.FC<DataConfidenceDisplayProps> = ({
  dataConfidence,
  overallConfidence
}) => {
  const getConfidenceIcon = (confidence: 'verified' | 'estimated' | 'unknown') => {
    switch (confidence) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'estimated':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'unknown':
        return <HelpCircle className="w-5 h-5 text-textMuted" />;
    }
  };

  const getConfidenceBadge = (confidence: 'verified' | 'estimated' | 'unknown') => {
    switch (confidence) {
      case 'verified':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded uppercase">
            🟢 Verified
          </span>
        );
      case 'estimated':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded uppercase">
            🟡 Estimated
          </span>
        );
      case 'unknown':
        return (
          <span className="px-2 py-1 bg-gray-100 text-textSecondary text-xs font-bold rounded uppercase">
            🔴 Unknown
          </span>
        );
    }
  };

  const getOverallConfidenceColor = () => {
    switch (overallConfidence) {
      case 'high':
        return 'border-green-500 bg-green-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-red-500 bg-red-50';
    }
  };

  const getOverallConfidenceText = () => {
    switch (overallConfidence) {
      case 'high':
        return {
          title: '🟢 High Confidence',
          description: 'We have verified data for most key metrics. These recommendations are based on real numbers.',
          color: 'text-green-900'
        };
      case 'medium':
        return {
          title: '🟡 Medium Confidence',
          description: 'We have some verified data mixed with estimates. Recommendations are informed but may need refinement as you add more data.',
          color: 'text-yellow-900'
        };
      case 'low':
        return {
          title: '🔴 Low Confidence',
          description: 'Most data is estimated. These are directional recommendations. Adding real metrics will significantly improve accuracy.',
          color: 'text-red-900'
        };
    }
  };

  const confidenceText = getOverallConfidenceText();

  const verified = dataConfidence.filter(d => d.confidence === 'verified');
  const estimated = dataConfidence.filter(d => d.confidence === 'estimated');
  const unknown = dataConfidence.filter(d => d.confidence === 'unknown');

  return (
    <div className="space-y-4">
      {/* Overall Confidence Banner */}
      <div className={`border-2 rounded-lg p-4 ${getOverallConfidenceColor()}`}>
        <div className="flex items-start gap-3">
          <Info className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
            overallConfidence === 'high' ? 'text-green-600' :
            overallConfidence === 'medium' ? 'text-yellow-600' :
            'text-red-600'
          }`} />
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${confidenceText.color} mb-1`}>
              {confidenceText.title}
            </h3>
            <p className={`text-sm ${confidenceText.color}`}>
              {confidenceText.description}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-900">{verified.length} Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="font-semibold text-yellow-900">{estimated.length} Estimated</span>
          </div>
          {unknown.length > 0 && (
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-textMuted" />
              <span className="font-semibold text-textSecondary">{unknown.length} Unknown</span>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
          <h4 className="font-bold text-textPrimary text-sm">Data Confidence Breakdown</h4>
          <p className="text-xs text-textSecondary mt-0.5">
            See exactly what's verified vs estimated in your analysis
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {dataConfidence.map((item, index) => (
            <div key={index} className="p-4 hover:bg-gray-100 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getConfidenceIcon(item.confidence)}
                    <span className="font-semibold text-textPrimary">{item.label}</span>
                  </div>
                  <div className="text-sm text-textSecondary mb-2">
                    {typeof item.value === 'number' && item.value > 1000
                      ? item.value.toLocaleString()
                      : item.value?.toString() || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-textMuted">
                    <span className="font-medium">Source:</span>
                    <span>{item.source}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getConfidenceBadge(item.confidence)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvement Suggestion */}
      {(overallConfidence === 'low' || overallConfidence === 'medium') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 text-sm mb-1">
                💡 Improve Your Analysis Accuracy
              </h4>
              <p className="text-sm text-blue-800 mb-2">
                Adding real metrics will give you more accurate recommendations:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                {estimated.length > 0 && (
                  <li>
                    Replace {estimated.length} estimated metric{estimated.length > 1 ? 's' : ''} with real data from your analytics dashboard
                  </li>
                )}
                {unknown.length > 0 && (
                  <li>
                    Add {unknown.length} missing metric{unknown.length > 1 ? 's' : ''} to unlock better sponsor recommendations
                  </li>
                )}
                <li>Connect your podcast platform to auto-sync metrics in the future</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CompactConfidenceIndicatorProps {
  confidence: 'verified' | 'estimated' | 'unknown';
  source?: string;
}

export const CompactConfidenceIndicator: React.FC<CompactConfidenceIndicatorProps> = ({
  confidence,
  source
}) => {
  const getIndicator = () => {
    switch (confidence) {
      case 'verified':
        return { emoji: '🟢', label: 'Verified', color: 'text-green-700 bg-green-100' };
      case 'estimated':
        return { emoji: '🟡', label: 'Estimated', color: 'text-yellow-700 bg-yellow-100' };
      case 'unknown':
        return { emoji: '🔴', label: 'Unknown', color: 'text-textSecondary bg-gray-100' };
    }
  };

  const indicator = getIndicator();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${indicator.color}`}>
      <span>{indicator.emoji}</span>
      <span>{indicator.label}</span>
      {source && (
        <span className="opacity-70">· {source}</span>
      )}
    </div>
  );
};
