import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/groups';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center border-x border-slate-200">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-base font-bold text-slate-800 mb-1">
            화면을 불러오는 도중 오류가 발생했습니다
          </h1>
          <p className="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">
            일시적인 문제가 발생했습니다. 다시 시도하시거나 홈으로 이동해 주세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>다시 시도</span>
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>홈으로 이동</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
