"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Voter {
  userId: string;
  name: string;
  color: string;
}

interface VoteBadgeProps {
  /** Total number of votes */
  voteCount: number;
  /** Voters with their names and colors */
  voters: Voter[];
  /** Whether votes are currently revealed */
  isRevealed: boolean;
  /** Whether current user has voted for this cluster */
  hasUserVoted?: boolean;
  /** Display mode: 'badge' (compact) or 'row' (expanded above) */
  displayMode?: "badge" | "row";
}

export function VoteBadge({
  voteCount,
  voters,
  isRevealed,
  hasUserVoted = false,
  displayMode = "badge",
}: VoteBadgeProps) {
  // Get up to 10 votes to display as dots in row mode
  const displayVotes = voters.slice(-10);
  const primaryColor = voters[0]?.color || "#8B5CF6";

  if (displayMode === "row") {
    // Row display mode - dots shown above cluster tag
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex -space-x-1">
          <AnimatePresence mode="popLayout">
            {displayVotes.map((voter, i) => (
              <Tooltip key={voter.userId}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      delay: i * 30
                    }}
                    className="relative"
                  >
                    {/* Vote dot with halo effect */}
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: voter.color }}
                    />
                    {/* Halo effect */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        backgroundColor: voter.color,
                        opacity: 0.3,
                        transform: "scale(1.5)",
                        filter: "blur(8px)",
                      }}
                    />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white text-xs font-medium">
                  {voter.name}
                </TooltipContent>
              </Tooltip>
            ))}
          </AnimatePresence>
        </div>
      </TooltipProvider>
    );
  }

  // Badge mode - compact display
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-md cursor-help transition-all hover:scale-105",
              isRevealed
                ? "bg-white/95 backdrop-blur-sm border border-gray-200"
                : "bg-gray-200/80"
            )}
          >
            {/* Vote count */}
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                isRevealed ? "text-gray-700" : "text-gray-500"
              )}
            >
              {isRevealed ? voteCount : "?"}
            </span>

            {/* Vote dots (only when revealed) */}
            {isRevealed && voteCount > 0 && (
              <div className="flex -space-x-1.5">
                {displayVotes.slice(0, 5).map((voter, i) => (
                  <motion.div
                    key={`${voter.userId}-${i}`}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: i * 50, type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 border-white shadow-sm relative",
                      hasUserVoted && voters[i]?.color === primaryColor && "ring-2 ring-offset-1 ring-gray-300"
                    )}
                    style={{ backgroundColor: voter.color }}
                  />
                ))}
                {voters.length > 5 && (
                  <div className="w-4 h-4 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-600">
                    +{voters.length - 5}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className={cn(
            "max-w-[250px]",
            isRevealed || voteCount === 0 ? "opacity-100" : "opacity-90"
          )}
        >
          {voteCount === 0 ? (
            <p className="text-xs text-gray-500">No votes yet</p>
          ) : isRevealed ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">
                {voteCount} vote{voteCount > 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {voters.map((voter) => (
                  <div
                    key={voter.userId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50"
                  >
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: voter.color }}
                    />
                    <span className="text-sm text-gray-700">{voter.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Votes hidden until reveal</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
