"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AudioPlayer, type AudioPlayerHandle } from "@/components/myComponents/AudioPlayer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface TapePeekTarget {
  interviewId: string;
  timestamp: number;
  quote: string;
}

function formatStamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.round(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function TapePeek({
  projectId,
  target,
  onClose,
  placement = "wall",
}: {
  projectId: string;
  target: TapePeekTarget;
  onClose: () => void;
  placement?: "wall" | "page";
}) {
  const playerRef = useRef<AudioPlayerHandle>(null);
  const interview = useQuery(api.interviews.getById, {
    interviewId: target.interviewId as Id<"interviews">,
  });

  const windowed = useMemo(() => {
    const segments = interview?.segments ?? [];
    if (segments.length === 0) return [];
    const t = target.timestamp;
    const idx = segments.reduce((best, segment, i) => {
      const current = segments[best];
      if (!current) return i;
      return Math.abs(segment.start - t) < Math.abs(current.start - t) ? i : best;
    }, 0);
    return segments.slice(Math.max(0, idx - 1), idx + 2);
  }, [interview?.segments, target.timestamp]);

  useEffect(() => {
    if (!interview?.audioUrl) return;
    const timer = window.setTimeout(() => {
      playerRef.current?.setCurrentTime(target.timestamp);
      void playerRef.current?.play();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [interview?.audioUrl, target.timestamp, target.interviewId]);

  return (
    <div
      className={cn(
        "z-40 w-[min(42rem,calc(100%-2rem))] border border-border bg-card shadow-lg",
        placement === "page"
          ? "fixed left-1/2 bottom-6 -translate-x-1/2"
          : "absolute left-1/2 bottom-24 -translate-x-1/2"
      )}
      role="dialog"
      aria-label="Tape peek"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
            Tape · {formatStamp(target.timestamp)}
          </p>
          <p className="text-sm truncate text-foreground">
            {interview?.title || "Sitting"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {interview && (
            <Button variant="ghost" size="sm" asChild className="h-7 font-mono text-[10px] tracking-widest uppercase">
              <Link href={`/project/${projectId}/interview/${target.interviewId}?t=${Math.floor(target.timestamp)}`}>
                Open sitting
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 font-mono text-[10px] tracking-widest uppercase"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      <p className="px-3 pt-3 text-sm leading-relaxed text-foreground">“{target.quote}”</p>

      {windowed.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          {windowed.map((segment) => {
            const active = Math.abs(segment.start - target.timestamp) < 1.5;
            return (
              <p
                key={segment.id}
                className={cn(
                  "text-xs leading-relaxed",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="font-mono mr-2">{formatStamp(segment.start)}</span>
                {segment.text}
              </p>
            );
          })}
        </div>
      )}

      {interview?.audioUrl ? (
        <div className="px-3 pb-3">
          <AudioPlayer ref={playerRef} src={interview.audioUrl} />
        </div>
      ) : interview === undefined ? (
        <p className="px-3 pb-3 text-xs text-muted-foreground">Loading tape…</p>
      ) : (
        <p className="px-3 pb-3 text-xs text-muted-foreground">No audio on this sitting.</p>
      )}
    </div>
  );
}
