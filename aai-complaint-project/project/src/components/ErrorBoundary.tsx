import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    // Clear theme UI preference and reload
    localStorage.removeItem("cts_theme");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0b0f19] border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full w-fit mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              The application encountered an unexpected error. This is usually caused by
              corrupted local data from a previous session.
            </p>

            {this.state.error && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-6 text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Error Details
                </p>
                <p className="text-xs text-rose-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Reload Page
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm rounded-xl transition-colors border border-slate-800 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Reset Data & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
