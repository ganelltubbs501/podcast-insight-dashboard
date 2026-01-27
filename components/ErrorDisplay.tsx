import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { getUserFriendlyError, UserFriendlyError } from '../utils/errorHandling';
import ReportIssue from './ReportIssue';

interface ErrorDisplayProps {
  error: any;
  className?: string;
  showReportIssue?: boolean;
  variant?: 'inline' | 'banner' | 'toast';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  className = '',
  showReportIssue = true,
  variant = 'banner'
}) => {
  const friendlyError = getUserFriendlyError(error);

  const getIcon = () => {
    switch (friendlyError.code) {
      case 'BETA_FULL':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'RATE_LIMIT':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'AUTH_ERROR':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getColors = () => {
    switch (friendlyError.code) {
      case 'BETA_FULL':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          textMuted: 'text-blue-700'
        };
      case 'RATE_LIMIT':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          textMuted: 'text-yellow-700'
        };
      case 'AUTH_ERROR':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          textMuted: 'text-orange-700'
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          textMuted: 'text-red-700'
        };
    }
  };

  const colors = getColors();

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm ${colors.textMuted} ${className}`}>
        {getIcon()}
        <span>{friendlyError.userMessage}</span>
        {friendlyError.action && (
          <button className="underline hover:no-underline font-medium">
            {friendlyError.action}
          </button>
        )}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 ${className}`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <p className={`text-sm font-medium ${colors.text}`}>
              {friendlyError.userMessage}
            </p>
            {friendlyError.action && (
              <button className={`text-sm underline hover:no-underline mt-1 ${colors.textMuted}`}>
                {friendlyError.action}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default banner variant
  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${colors.text}`}>
            {friendlyError.userMessage}
          </h4>
          {friendlyError.action && (
            <button className={`text-sm underline hover:no-underline mt-1 ${colors.textMuted}`}>
              {friendlyError.action}
            </button>
          )}
        </div>
        {showReportIssue && (
          <ReportIssue lastError={error} variant="link" />
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;