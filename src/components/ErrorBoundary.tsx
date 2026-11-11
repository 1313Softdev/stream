import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Stream LIVE] Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 shadow-lg text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Something went wrong loading this view
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {this.state.error?.message || 'An unexpected rendering error occurred'}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
                else window.location.reload();
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry / Recover</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
