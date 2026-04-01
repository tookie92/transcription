"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Vote, Clock, Sparkles, Info } from "lucide-react";
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Start Dot Voting</DialogTitle>
              <DialogDescription>
                Configure voting session for team members
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dots per user */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Votes per user</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Each user can place this many votes. When they run out, their oldest vote is replaced.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {DOTS_OPTIONS.map((dots) => (
                <button
                  key={dots}
                  onClick={() => setDotsPerUser(dots)}
                  className={cn(
                    "py-3 rounded-lg border-2 font-bold text-sm transition-all",
                    dotsPerUser === dots
                      ? "bg-violet-50 border-violet-500 text-violet-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {dots}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Duration</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Optional time limit. Voting ends automatically when time expires.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDurationMinutes(null)}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all",
                  durationMinutes === null
                    ? "bg-violet-50 border-violet-500 text-violet-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                No limit
              </button>
              {DURATION_OPTIONS.filter((d) => d !== null).map((duration) => (
                <button
                  key={duration}
                  onClick={() => setDurationMinutes(duration)}
                  className={cn(
                    "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all",
                    durationMinutes === duration
                      ? "bg-violet-50 border-violet-500 text-violet-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {duration}m
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Vote className="w-4 h-4 text-violet-600" />
              <span><strong className="font-bold">{dotsPerUser}</strong> votes per user</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-violet-600" />
              <span>
                <strong className="font-bold">
                  {durationMinutes ? `${durationMinutes} minutes` : "No time limit"}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span>Hidden until reveal</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Vote className="w-4 h-4 mr-2" />
            Start Voting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
