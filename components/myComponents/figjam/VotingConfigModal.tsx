"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VotingConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartVoting: (config: { dotsPerUser: number; durationMinutes: number | null }) => void;
  clusterCount: number;
}

const DOTS_OPTIONS = [3, 5, 7, 10];
const DURATION_OPTIONS: (number | null)[] = [null, 2, 5, 10];

export function VotingConfigModal({
  open,
  onOpenChange,
  onStartVoting,
}: VotingConfigModalProps) {
  const [dotsPerUser, setDotsPerUser] = useState(3);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  const handleStart = () => {
    onStartVoting({
      dotsPerUser,
      durationMinutes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vote</DialogTitle>
          <DialogDescription>
            Stickers per person. Hidden until you reveal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Stickers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DOTS_OPTIONS.map((dots) => (
                <button
                  key={dots}
                  type="button"
                  onClick={() => setDotsPerUser(dots)}
                  className={cn(
                    "h-9 px-3 font-mono text-[11px] tracking-widest uppercase border transition-colors duration-150 ease-out active:scale-[0.97]",
                    dotsPerUser === dots
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/40"
                  )}
                >
                  {dots}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Timer
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_OPTIONS.map((duration) => (
                <button
                  key={duration ?? "none"}
                  type="button"
                  onClick={() => setDurationMinutes(duration)}
                  className={cn(
                    "h-9 px-3 font-mono text-[11px] tracking-widest uppercase border transition-colors duration-150 ease-out active:scale-[0.97]",
                    durationMinutes === duration
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/40"
                  )}
                >
                  {duration === null ? "Open" : `${duration}m`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} className="font-mono text-[11px] uppercase tracking-widest">
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
