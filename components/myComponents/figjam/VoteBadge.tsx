"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Voter {
  userId: string;
  name: string;
  color: string;
}

interface VoteBadgeProps {
  voteCount: number;
  voters: Voter[];
  isRevealed: boolean;
  hasUserVoted?: boolean;
  displayMode?: "badge" | "row";
  compact?: boolean;
}

export function VoteBadge({
  voteCount,
  voters,
  isRevealed,
  hasUserVoted = false,
  displayMode = "badge",
  compact = false,
}: VoteBadgeProps) {
  const displayVotes = voters.slice(-10);
  const primaryColor = voters[0]?.color || "#8B5CF6";

  const uniqueColors = useMemo(() => {
    const colors = new Map<string, { count: number; name: string }>();
    voters.forEach((v) => {
      const existing = colors.get(v.color);
      colors.set(v.color, {
        count: (existing?.count || 0) + 1,
        name: v.name,
      });
    });
    return Array.from(colors.entries());
  }, [voters]);

  if (displayMode === "row") {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex -space-x-1.5">
          <AnimatePresence mode="popLayout">
            {displayVotes.map((voter, i) => (
              <Tooltip key={`${voter.userId}-${i}`}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: -10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      delay: i * 30,
                    }}
                    className="relative group"
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-110"
                      style={{ backgroundColor: voter.color }}
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundColor: voter.color,
                        opacity: 0.3,
                        transform: "scale(1.4)",
                        filter: "blur(6px)",
                      }}
                    />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-xl"
                >
                  <p className="font-medium">{voter.name}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Voted</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </AnimatePresence>
        </div>
      </TooltipProvider>
    );
  }

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg shadow-sm",
          isRevealed
            ? "bg-white/95 backdrop-blur-sm border border-slate-200/80"
            : "bg-slate-800/90 border border-slate-700/50"
        )}
      >
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            isRevealed ? "text-slate-700" : "text-slate-300"
          )}
        >
          {isRevealed ? voteCount : "?"}
        </span>
        {isRevealed && voteCount > 0 && (
          <div className="flex gap-0.5">
            {uniqueColors.slice(0, 3).map(([color, data], i) => (
              <motion.div
                key={color}
                initial={{ scale: 0, x: -5 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: i * 0.05 + 0.1 }}
                className="w-2 h-2 rounded-full border border-white/50 shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl shadow-md cursor-help transition-all hover:scale-[1.02]",
              isRevealed
                ? "bg-white/95 backdrop-blur-sm border border-slate-200/80"
                : "bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/50"
            )}
          >
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                isRevealed ? "text-slate-700" : "text-slate-300"
              )}
            >
              {isRevealed ? voteCount : "?"}
            </span>

            {isRevealed && voteCount > 0 && (
              <div className="flex -space-x-1.5">
                {uniqueColors.slice(0, 5).map(([color, data], i) => (
                  <motion.div
                    key={color}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{
                      delay: i * 0.05 + 0.1,
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    className="relative"
                    title={`${data.count} vote${data.count > 1 ? "s" : ""}`}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 border-white shadow-sm",
                        hasUserVoted && i === 0 && "ring-2 ring-offset-1 ring-slate-300"
                      )}
                      style={{ backgroundColor: color }}
                    />
                    {data.count > 1 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-900 text-[8px] font-bold text-white flex items-center justify-center">
                        {data.count}
                      </span>
                    )}
                  </motion.div>
                ))}
                {voters.length > 5 && (
                  <div className="w-4 h-4 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">
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
            "max-w-[280px] p-0 overflow-hidden",
            isRevealed || voteCount === 0 ? "opacity-100" : "opacity-90"
          )}
        >
          <div className={cn("px-3 py-2 border-b", isRevealed ? "bg-slate-50 border-slate-200" : "bg-slate-800 border-slate-700")}>
            <p className={cn("text-xs font-medium", isRevealed ? "text-slate-700" : "text-slate-300")}>
              {voteCount === 0
                ? "No votes yet"
                : isRevealed
                  ? `${voteCount} vote${voteCount > 1 ? "s" : ""}`
                  : "Votes hidden until reveal"}
            </p>
          </div>
          {isRevealed && voteCount > 0 && (
            <div className="p-2 space-y-1.5 bg-white">
              {uniqueColors.slice(0, 8).map(([color, data]) => (
                <div
                  key={color}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-50"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-slate-700 flex-1 truncate">{data.name}</span>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    {data.count}
                  </span>
                </div>
              ))}
              {voters.length > 8 && (
                <p className="text-[10px] text-slate-400 text-center pt-1">
                  +{voters.length - 8} more voters
                </p>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
