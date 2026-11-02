"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VotingConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartVoting: (config: VotingConfig) => void;
}

export interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
}

const DOTS_OPTIONS = [3, 5, 7, 10];
const DURATION_OPTIONS: (number | null)[] = [null, 1, 2, 3, 5, 10, 15, 30];

function Chip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 px-3 font-mono text-[11px] tracking-widest uppercase border transition-colors duration-150 ease-out active:scale-[0.97]",
        selected
          ? "border-foreground bg-accent text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function VotingConfigDialog({
  isOpen,
  onOpenChange,
  onStartVoting,
}: VotingConfigDialogProps) {
  const [dotsPerUser, setDotsPerUser] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);

  const handleStart = () => {
    onStartVoting({ dotsPerUser, durationMinutes });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                <Chip
                  key={dots}
                  selected={dotsPerUser === dots}
                  onClick={() => setDotsPerUser(dots)}
                >
                  {dots}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
              Timer
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_OPTIONS.map((duration) => (
                <Chip
                  key={duration ?? "none"}
                  selected={durationMinutes === duration}
                  onClick={() => setDurationMinutes(duration)}
                >
                  {duration === null ? "Open" : `${duration}m`}
                </Chip>
              ))}
            </div>
          </div>

          <p className="font-mono text-[11px] text-muted-foreground">
            {dotsPerUser} each
            {durationMinutes ? ` · ${durationMinutes} min` : " · no clock"}
          </p>
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
