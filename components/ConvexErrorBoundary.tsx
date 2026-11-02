"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

function isConvexPlanLimit(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return (
    msg.includes("free plan limits") ||
    msg.includes("deployments have been disabled")
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps the shell up when Convex throws (e.g. free-plan pause). */
export class ConvexErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ConvexErrorBoundary]", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (isConvexPlanLimit(error)) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Backend · paused
          </p>
          <h1
            className="max-w-md text-2xl text-foreground"
            style={{
              fontFamily: "var(--font-display), serif",
              fontStyle: "italic",
            }}
          >
            Convex free plan limit hit
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Deployments are disabled until the project is upgraded to Pro, or
            Convex support lifts the pause.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button asChild size="sm" className="font-mono text-[10px] uppercase tracking-widest">
              <a
                href="https://dashboard.convex.dev/team/settings/billing"
                target="_blank"
                rel="noreferrer"
              >
                Open Convex billing
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-mono text-[10px] uppercase tracking-widest"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Something broke
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || "Unexpected error"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-mono text-[10px] uppercase tracking-widest"
          onClick={() => this.setState({ error: null })}
        >
          Retry
        </Button>
      </div>
    );
  }
}

/** Swallow errors from optional chrome (Signal radio) so the app shell stays up. */
export class SoftErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.warn("[SoftErrorBoundary]", error.message);
  }

  render(): ReactNode {
    if (this.state.error) return null;
    return this.props.children;
  }
}
