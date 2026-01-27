import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { copyDebugInfo } from '../utils/errorHandling';

interface ReportIssueProps {
  lastError?: any;
  className?: string;
  variant?: 'button' | 'link' | 'banner';
}

const ReportIssue: React.FC<ReportIssueProps> = ({
  lastError,
  className = '',
  variant = 'link'
}) => {
  const [copied, setCopied] = useState(false);

  const handleReportIssue = async () => {
    const success = await copyDebugInfo(lastError);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openSupportForm = () => {
    // You can customize this URL to point to your support system
    const supportUrl = 'https://github.com/your-repo/issues/new?template=bug-report.md';
    window.open(supportUrl, '_blank');
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleReportIssue}
        className={`flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors ${className}`}
      >
        <AlertTriangle className="h-4 w-4" />
        Report Issue
        {copied && <Check className="h-4 w-4 text-green-600" />}
      </button>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Something went wrong</h4>
              <p className="text-sm text-red-700 mt-1">
                Debug info has been copied to your clipboard. Please share it when reporting this issue.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReportIssue}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Debug Info
                </>
              )}
            </button>
            <button
              onClick={openSupportForm}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white text-red-700 border border-red-300 rounded hover:bg-red-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Report Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default link variant
  return (
    <button
      onClick={handleReportIssue}
      className={`text-red-600 hover:text-red-800 underline text-sm flex items-center gap-1 ${className}`}
    >
      Report issue
      {copied && <Check className="h-3 w-3 text-green-600" />}
    </button>
  );
};

export default ReportIssue;