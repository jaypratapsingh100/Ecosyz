'use client';

import React, { Component, ReactNode } from 'react';
import { toast } from 'sonner';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showToast?: boolean;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ErrorBoundary caught an error${this.props.componentName ? ` in ${this.props.componentName}` : ''}:`, error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (this.props.showToast !== false) {
      const componentContext = this.props.componentName ? ` in ${this.props.componentName}` : '';
      toast.error('Something went wrong', {
        description: `An unexpected error occurred${componentContext}. Please refresh the page or try again.`,
        duration: 6000,
        action: {
          label: 'Reload',
          onClick: () => window.location.reload(),
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0a0a0a]">
          <div className="max-w-md w-full bg-[#1a1a1a] border border-red-500/30 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg mb-2">
                  Something went wrong
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 p-3 bg-[#0a0a0a] border border-white/10 rounded text-xs text-red-400 overflow-auto max-h-48">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
