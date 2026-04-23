"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        className="min-h-screen bg-bg flex items-center justify-center px-4"
      >
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl text-ink-primary">
            Something went wrong.
          </h1>
          <p className="text-ink-secondary text-sm">
            We hit an unexpected error rendering this page. Try reloading, or
            head back to the dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={this.reset}
              className="px-4 py-2 text-sm border border-surface-border rounded-md hover:bg-surface-hover"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 text-sm bg-accent text-white rounded-md"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
