"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Minus, Plus, Clock, EyeOff, Play, Square, RotateCcw } from "lucide-react";

interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
}

interface VotingSettingsProps {
  config: VotingConfig;
  onConfigChange: (config: VotingConfig) => void;
  isVotingActive?: boolean;
  votingPhase?: "setup" | "voting" | "revealed" | "completed";
  isCreator?: boolean;
  remainingTime?: number | null;
  onStartVoting?: (durationMinutes?: number | null) => void;
  onStopAndReveal?: () => void;
  onStartNewVote?: () => void;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VotingSettings({ 
  config, 
  onConfigChange,
  isVotingActive,
  votingPhase = "setup",
  isCreator = false,
  remainingTime = null,
  onStartVoting,
  onStopAndReveal,
  onStartNewVote,
}: VotingSettingsProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [dots, setDots] = useState(config.dotsPerUser);
  const [duration, setDuration] = useState(3);
  const [hasDuration, setHasDuration] = useState(false);

  useEffect(() => {
    setDots(config.dotsPerUser);
  }, [config.dotsPerUser]);

  const getButtonContent = () => {
    if (isVotingActive && votingPhase === "voting") {
      if (remainingTime !== null && remainingTime > 0) {
        return (
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatTime(remainingTime)}</span>
          </span>
        );
      }
      return "Voting...";
    }
    
    if (isVotingActive && votingPhase === "revealed") {
      return (
        <span className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          New Vote
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-2">
        <Play className="w-4 h-4" />
        Start Vote
      </span>
    );
  };

  const getButtonAction = () => {
    if (isVotingActive && votingPhase === "voting") {
      return () => {};
    }
    
    if (isVotingActive && votingPhase === "revealed") {
      return () => onStartNewVote?.();
    }
    
    return () => setShowConfigDialog(true);
  };

  const handleStartVote = () => {
    // Use the selected value from the dialog
    const selectedDots = dots;
    const selectedDuration = hasDuration ? duration : null;
    
    // Update local config
    onConfigChange({
      dotsPerUser: selectedDots,
      durationMinutes: selectedDuration,
    });
    
    // Start voting with selected values
    onStartVoting?.(selectedDuration);
    setShowConfigDialog(false);
  };

  return (
    <>
      <Button
        variant={isVotingActive && votingPhase === "voting" ? "default" : "default"}
        size="sm"
        className={`gap-2 ${isVotingActive && votingPhase === "voting" ? "bg-green-600 hover:bg-green-700" : ""}`}
        onClick={getButtonAction()}
      >
        {getButtonContent()}
      </Button>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="w-80">
          <DialogHeader>
            <DialogTitle>Start Vote</DialogTitle>
            <DialogDescription>
              Configure your voting session
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dots per user</label>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setDots(d => Math.max(1, d - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-12 text-center font-bold text-xl">{dots}</div>
                <Button variant="outline" size="icon" onClick={() => setDots(d => Math.min(20, d + 1))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Timer (optional)
              </label>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={hasDuration} onChange={(e) => setHasDuration(e.target.checked)} className="rounded" />
                {hasDuration && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setDuration(d => Math.max(1, d - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-8 text-center font-bold">{duration} min</div>
                    <Button variant="outline" size="icon" onClick={() => setDuration(d => Math.min(60, d + 1))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <EyeOff className="w-4 h-4" />
              Silent mode - votes hidden during voting
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancel</Button>
            <Button onClick={handleStartVote} className="gap-2">
              <Play className="w-4 h-4" />
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isVotingActive && votingPhase === "voting" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500">
              {isCreator ? "You created" : "Participating"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Voting in progress</span>
              </div>
              <div className="text-xs text-gray-500">
                {config.dotsPerUser} dots per user
                {config.durationMinutes && ` • ${config.durationMinutes} min`}
              </div>
              {isCreator ? (
                <Button onClick={onStopAndReveal} variant="outline" size="sm" className="w-full gap-2">
                  <Square className="w-4 h-4" />
                  End & Reveal
                </Button>
              ) : (
                <div className="text-xs text-center text-gray-400">Waiting for creator...</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {isVotingActive && votingPhase === "revealed" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-violet-500">Votes revealed</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-sm font-medium">Results visible</span>
              </div>
              {isCreator && (
                <Button onClick={onStartNewVote} variant="outline" size="sm" className="w-full gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Start New Vote
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}