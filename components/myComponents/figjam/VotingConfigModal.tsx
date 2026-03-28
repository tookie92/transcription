"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Clock, Vote, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface VotingConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartVoting: (config: { dotsPerUser: number; durationMinutes: number | null }) => void;
  clusterCount: number;
}

export function VotingConfigModal({
  open,
  onOpenChange,
  onStartVoting,
  clusterCount,
}: VotingConfigModalProps) {
  const [dotsPerUser, setDotsPerUser] = useState(3);
  const [hasTimer, setHasTimer] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(2);

  const suggestedDots = Math.max(1, Math.min(clusterCount, Math.ceil(clusterCount / 2)));

  const handleStart = () => {
    onStartVoting({
      dotsPerUser,
      durationMinutes: hasTimer ? durationMinutes : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Vote className="w-5 h-5 text-primary" />
            Configure Voting
          </DialogTitle>
          <DialogDescription>
            Set up the voting parameters for your affinity session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Dots per user */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Vote className="w-4 h-4 text-primary" />
                  Dots per person
                </Label>
                <p className="text-sm text-muted-foreground">
                  Number of votes each participant can cast
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDotsPerUser(d => Math.max(1, d - 1))}
                disabled={dotsPerUser <= 1}
                className="size-10"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="w-20 h-12 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{dotsPerUser}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDotsPerUser(d => Math.min(Math.max(10, clusterCount), d + 1))}
                disabled={dotsPerUser >= Math.max(10, clusterCount)}
                className="size-10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              Suggested: {suggestedDots} for {clusterCount} clusters
            </p>
          </div>

          {/* Timer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Enable timer
                </Label>
                <p className="text-sm text-muted-foreground">
                  Time limit for voting (optional)
                </p>
              </div>
              <Switch
                checked={hasTimer}
                onCheckedChange={setHasTimer}
              />
            </div>

            {hasTimer && (
              <div className="space-y-3 pl-2 border-l-2 border-primary ml-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Duration</Label>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDurationMinutes(d => Math.max(1, d - 1))}
                    disabled={durationMinutes <= 1}
                    className="size-10"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="w-20 h-12 bg-muted rounded-lg flex items-center justify-center gap-1">
                    <span className="text-xl font-bold text-primary">{durationMinutes}</span>
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDurationMinutes(d => Math.min(10, d + 1))}
                    disabled={durationMinutes >= 10}
                    className="size-10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-primary/30 dark:bg-primary/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary dark:text-primary">
              <Users className="w-4 h-4" />
              Voting Summary
            </div>
            <ul className="text-sm text-primary space-y-1 ml-6">
              <li>• {dotsPerUser} vote{dotsPerUser > 1 ? "s" : ""} per participant</li>
              <li>• {clusterCount} cluster{clusterCount > 1 ? "s" : ""} available</li>
              <li>• {hasTimer ? `${durationMinutes} minute${durationMinutes > 1 ? "s" : ""} time limit` : "No time limit"}</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            className="bg-primary text-white hover:bg-primary/80"
          >
            <Vote className="w-4 h-4 mr-2" />
            Start Voting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
