"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VotingConfigDialog, VotingConfig } from "./VotingConfigDialog";
import { Vote, Flag, Eye, EyeOff, RotateCcw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface VotingControlsProps {
  /** Whether voting is currently active */
  isVotingActive: boolean;
  /** Whether votes have been revealed */
  isRevealed: boolean;
  /** Number of votes the current user has remaining */
  votesRemaining: number;
  /** Max votes per user */
  maxVotes: number;
  /** Total number of votes across all clusters */
  totalVotes: number;
  /** Whether votes are visible (after reveal) */
  areVotesVisible: boolean;
  /** Callback to start voting with configuration */
  onStartVoting: (config: VotingConfig) => void;
  /** Callback to stop voting */
  onStopVoting: () => void;
  /** Callback to reveal votes */
  onReveal: () => void;
  /** Callback to start new round */
  onNewRound: () => void;
  /** Callback to toggle vote visibility */
  onToggleVoteVisibility: () => void;
  /** Whether to user can start/stop voting (admin/host) */
  canControl: boolean;
}

export function VotingControls({
  isVotingActive,
  isRevealed,
  votesRemaining,
  maxVotes,
  totalVotes,
  areVotesVisible,
  onStartVoting,
  onStopVoting,
  onReveal,
  onNewRound,
  onToggleVoteVisibility,
  canControl,
}: VotingControlsProps) {
  const [showConfig, setShowConfig] = React.useState(false);

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2">
          {/* Main voting button */}
          {canControl && (
            <>
              {!isVotingActive ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setShowConfig(true)}
                      variant="default"
                      size="sm"
                      className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl"
                    >
                      <Vote className="w-4 h-4" />
                      <span className="font-medium">Vote</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Start voting session</TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-1.5 py-1">
                  {/* Stop/Reveal button */}
                  {!isRevealed ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={onStopVoting}
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 hover:bg-red-50 hover:text-red-600 text-gray-700"
                          >
                            <Flag className="w-4 h-4" />
                            <span className="text-sm font-medium">Stop</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Stop voting & reveal results</TooltipContent>
                      </Tooltip>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                    </>
                  ) : (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={onNewRound}
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 hover:bg-violet-50 hover:text-violet-600 text-gray-700"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="text-sm font-medium">New</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Start new voting round</TooltipContent>
                      </Tooltip>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                    </>
                  )}
                </div>
              )}

              {/* User's votes remaining */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                  votesRemaining === 0
                    ? "bg-gray-100 text-gray-400"
                    : "bg-violet-50 text-violet-700"
                )}
              >
                <Vote className="w-3.5 h-3.5" />
                <span className="text-sm font-bold tabular-nums">
                  {votesRemaining}/{maxVotes}
                </span>
              </div>
            </>
          )}

          {/* View-only mode for non-admins - shows voting status */}
          {!canControl && isVotingActive && (
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-2.5 py-1.5">
              <Vote
                className={cn(
                  "w-4 h-4",
                  isRevealed ? "text-green-600" : "text-violet-600"
                )}
              />
              <span className="text-sm font-medium text-gray-700">
                {isRevealed ? "Revealed" : "Voting..."}
              </span>
              <div className="w-px h-4 bg-gray-200" />
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                  votesRemaining === 0
                    ? "bg-gray-100 text-gray-400"
                    : "bg-violet-50 text-violet-700"
                )}
              >
                <Vote className="w-3.5 h-3.5" />
                <span className="text-sm font-bold tabular-nums">
                  {votesRemaining}/{maxVotes}
                </span>
              </div>
            </div>
          )}

          {/* Revealed indicator + hide votes button (when voting is done) */}
          {isRevealed && !isVotingActive && (
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-2.5 py-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Results revealed</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Voting has ended and results are visible
                </TooltipContent>
              </Tooltip>

              {/* Hide/Show votes toggle */}
              <div className="w-px h-4 bg-gray-200" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onToggleVoteVisibility}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-gray-100 text-gray-500"
                  >
                    {areVotesVisible ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {areVotesVisible ? "Hide votes" : "Show votes"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Config dialog */}
      <VotingConfigDialog
        isOpen={showConfig}
        onOpenChange={setShowConfig}
        onStartVoting={onStartVoting}
      />
    </>
  );
}
