import React from "react";
import { reportLovableError } from "../lib/lovable-error-reporting";

type Props = { children: React.ReactNode };

export class ErrorBoundary extends React.Component<Props, { hasError: boolean; error?: Error }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    reportLovableError(error, { mechanism: "react_error_boundary", info });
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Please reload the page.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It looks like you're offline. Check your connection and try again.
        </p>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to view this page. Please sign in with the correct account.
        </p>
        <div className="mt-6">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
