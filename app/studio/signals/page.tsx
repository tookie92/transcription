"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ThumbsDown, ThumbsUp, Minus, ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Sentiment = "up" | "meh" | "down" | "all";

const FILTERS: { id: Sentiment; label: string }[] = [
  { id: "all", label: "All" },
  { id: "up", label: "Working" },
  { id: "meh", label: "Meh" },
  { id: "down", label: "Broken" },
];

function SentimentIcon({ sentiment }: { sentiment: "up" | "meh" | "down" }) {
  if (sentiment === "up") return <ThumbsUp className="h-3.5 w-3.5" />;
  if (sentiment === "down") return <ThumbsDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudioSignalsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [filter, setFilter] = useState<Sentiment>("all");

  const isFounder = useQuery(api.signals.amIFounder);
  const inbox = useQuery(
    api.signals.listInbox,
    isFounder ? { limit: 100 } : "skip"
  );

  const filtered = useMemo(() => {
    if (!inbox) return [];
    if (filter === "all") return inbox;
    return inbox.filter((s) => s.sentiment === filter);
  }, [inbox, filter]);

  const counts = useMemo(() => {
    if (!inbox) return { all: 0, up: 0, meh: 0, down: 0 };
    return {
      all: inbox.length,
      up: inbox.filter((s) => s.sentiment === "up").length,
      meh: inbox.filter((s) => s.sentiment === "meh").length,
      down: inbox.filter((s) => s.sentiment === "down").length,
    };
  }, [inbox]);

  if (!isLoaded) {
    return <div className="min-h-dvh w-full bg-background kit-grain kit-mat" />;
  }

  if (!isSignedIn) {
    router.replace("/sign-in");
    return null;
  }

  if (isFounder === false) {
    return (
      <div className="min-h-dvh w-full bg-background text-foreground kit-grain kit-mat">
        <div className="mx-auto flex max-w-lg flex-col gap-4 px-5 py-24">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Studio
          </p>
          <h1
            className="text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Not your desk
          </h1>
          <p className="text-sm text-muted-foreground">
            This inbox is reserved for the founder. Set{" "}
            <code className="font-mono text-xs">SIGNAL_FOUNDER_EMAILS</code> in
            Convex env to your Clerk email.
          </p>
          <Button
            variant="outline"
            className="w-fit font-mono text-[10px] uppercase tracking-widest"
            onClick={() => router.push("/project")}
          >
            Back to sessions
          </Button>
        </div>
      </div>
    );
  }

  if (isFounder === undefined || inbox === undefined) {
    return <div className="min-h-dvh w-full bg-background kit-grain kit-mat" />;
  }

  return (
    <div className="min-h-dvh w-full bg-background text-foreground kit-grain kit-mat">
      <header className="sticky top-0 z-50 border-b border-border bg-background px-5 lg:px-12">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/project")}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <Image
                height={36}
                width={108}
                src="/logo.svg"
                alt="Skripta"
                className="h-8 w-auto"
              />
            </button>
            <span className="hidden font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground sm:inline">
              Studio · signals
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-5 py-8 lg:px-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl tracking-tight"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Signals
            </h1>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress ?? "Founder"} · field
              kit inbox
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-8 border border-border px-2.5 font-mono text-[10px] uppercase tracking-widest transition-transform duration-150 ease-out active:scale-[0.97]",
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {f.label}
                {f.id !== "all" ? (
                  <span className="ml-1.5 tabular-nums opacity-70">
                    {counts[f.id]}
                  </span>
                ) : (
                  <span className="ml-1.5 tabular-nums opacity-70">
                    {counts.all}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="border border-border bg-card px-4 py-12 text-center">
            <p
              className="text-muted-foreground"
              style={{
                fontFamily: "var(--font-display), serif",
                fontStyle: "italic",
              }}
            >
              No signals yet. Share the kit — they’ll land here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((signal) => (
              <li
                key={signal._id}
                className="border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest",
                      signal.sentiment === "down" && "text-destructive",
                      signal.sentiment === "up" && "text-foreground"
                    )}
                  >
                    <SentimentIcon sentiment={signal.sentiment} />
                    {signal.sentiment === "up"
                      ? "Working"
                      : signal.sentiment === "down"
                        ? "Broken"
                        : "Meh"}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {formatWhen(signal.createdAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground">
                    {signal.userName || signal.userEmail || signal.userId}
                  </span>
                  {signal.shareToken ? (
                    <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Issue
                    </span>
                  ) : null}
                </div>
                <p
                  className="mt-2 text-[15px] leading-snug text-foreground"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {signal.message}
                </p>
                <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground/80">
                  {signal.path}
                  {signal.projectId ? ` · ${signal.projectId}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
