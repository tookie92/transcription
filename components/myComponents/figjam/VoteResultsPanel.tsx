"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClusterVote {
  clusterId: string;
  title: string;
  voteCount: number;
  color?: string;
}

interface VoteResultsPanelProps {
  results: ClusterVote[];
  onNewRound: () => void;
  onClose: () => void;
  totalVotes: number;
}

export function VoteResultsPanel({
  results,
  onNewRound,
  onClose,
  totalVotes,
}: VoteResultsPanelProps) {
  const topThree = results.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Vote Results</h3>
              <p className="text-slate-400 text-xs">{totalVotes} total votes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top 3 Podium */}
        <div className="px-5 py-4 flex items-end justify-center gap-4">
          {/* 2nd place */}
          {topThree[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-lg">{medals[1]}</span>
              </div>
              <div 
                className="w-16 h-12 rounded-lg flex items-center justify-center text-center px-1"
                style={{ backgroundColor: topThree[1].color || "#94a3b8" }}
              >
                <span className="text-white text-[10px] font-medium line-clamp-2">
                  {topThree[1].title}
                </span>
              </div>
              <div className="mt-1.5 px-2 py-0.5 bg-slate-700 rounded-full">
                <span className="text-white text-xs font-bold">{topThree[1].voteCount}</span>
              </div>
            </motion.div>
          )}

          {/* 1st place - taller */}
          {topThree[0] && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1 mb-1">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-lg">{medals[0]}</span>
              </div>
              <div 
                className="w-20 h-16 rounded-lg flex items-center justify-center text-center px-2 shadow-lg"
                style={{ backgroundColor: topThree[0].color || "#3b82f6" }}
              >
                <span className="text-white text-xs font-semibold line-clamp-2">
                  {topThree[0].title}
                </span>
              </div>
              <div className="mt-1.5 px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/50">
                <span className="text-yellow-400 text-sm font-bold">{topThree[0].voteCount}</span>
              </div>
            </motion.div>
          )}

          {/* 3rd place */}
          {topThree[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-lg">{medals[2]}</span>
              </div>
              <div 
                className="w-14 h-10 rounded-lg flex items-center justify-center text-center px-1"
                style={{ backgroundColor: topThree[2].color || "#a78bfa" }}
              >
                <span className="text-white text-[10px] font-medium line-clamp-2">
                  {topThree[2].title}
                </span>
              </div>
              <div className="mt-1.5 px-2 py-0.5 bg-slate-700 rounded-full">
                <span className="text-white text-xs font-bold">{topThree[2].voteCount}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Full ranking list */}
        {results.length > 3 && (
          <div className="px-5 pb-4">
            <div className="max-h-32 overflow-y-auto space-y-1">
              {results.slice(3).map((result, index) => (
                <motion.div
                  key={result.clusterId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * (index + 4) }}
                  className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-slate-500 text-xs font-medium w-5">
                    #{index + 4}
                  </span>
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: result.color || "#64748b" }}
                  />
                  <span className="text-slate-300 text-xs flex-1 truncate">
                    {result.title}
                  </span>
                  <span className="text-slate-400 text-xs font-medium">
                    {result.voteCount}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700/50 bg-slate-800/50">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Close
          </Button>
          <Button
            size="sm"
            onClick={onNewRound}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Round
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
