import React, { useState, useEffect } from 'react';
import { ErrorBoundary as SentryErrorBoundary } from '../src/utils/sentry';
import ReportIssue from './ReportIssue';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}

const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({
  children,
  onError
}) => {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Error caught by boundary:', event.error);
      setError(event.error);
      onError?.(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      setError(error);
      onError?.(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              Refresh Page
            </button>

            <ReportIssue
              lastError={error}
              variant="button"
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <SentryErrorBoundary fallback={<div>Something went wrong</div>}>
      {children}
    </SentryErrorBoundary>
  );
};

export default AppErrorBoundary;