'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
          <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-5 w-5 text-error" />
          </div>
          <h3 className="text-[15px] font-semibold mb-1">Something went wrong</h3>
          <p className="text-[13px] text-foreground-tertiary max-w-sm mb-6">
            This section encountered an unexpected error. Your work has been autosaved.
          </p>
          <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={this.reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
