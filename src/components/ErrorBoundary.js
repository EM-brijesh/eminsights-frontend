'use client';

import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Optional: Send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Prevent infinite error loops
      if (this.state.errorCount > 3) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
            <div className="max-w-md w-full space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-red-300">Critical Error</h1>
                <p className="text-gray-400">
                  The application has encountered repeated errors. Please refresh the page or contact support.
                </p>
              </div>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload Page
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
          <div className="max-w-2xl w-full space-y-6">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-300">Something went wrong</h1>
                <p className="text-gray-400">
                  An error occurred while rendering this page. You can try resetting or reloading.
                </p>
              </div>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-red-300">
                    Error Message
                  </h3>
                  <pre className="text-sm text-red-200 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                  </pre>
                </div>
                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-red-300">
                      Component Stack
                    </h3>
                    <pre className="text-xs text-red-200 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-6 py-3 font-medium text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/30"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload Page
              </button>
            </div>

            {this.props.showSupport !== false && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-400">
                  If this problem persists, please{' '}
                  <a href="/support" className="text-indigo-300 hover:text-indigo-100 underline">
                    contact support
                  </a>{' '}
                  with details about what you were doing when the error occurred.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


