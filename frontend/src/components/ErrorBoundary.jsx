import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-brand-200 p-8 text-center space-y-5 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Portal Display Note</h1>
              <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
                The exam portal encountered a minor display refresh event. Click below to continue your assessment session.
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload Portal Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
