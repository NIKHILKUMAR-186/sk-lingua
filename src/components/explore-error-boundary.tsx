import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ExploreErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[ExploreErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-semibold">
              Something went wrong
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Please reload the page.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload page
              </Button>
              <Button onClick={this.handleReset}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}