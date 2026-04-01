"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RotateCcw, Archive, Trash2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoteResult {
  clusterId: string;
  clusterTitle: string;
  voteCount: number;
  colors: string[];
}

interface VotingResultsPanelProps {
  isOpen: boolean;
  results: VoteResult[];
  totalVoters: number;
  maxDotsPerUser: number;
  onStartNewVote: () => void;
  onSaveResults: () => void;
  onDeleteSession: () => void;
  isCreator: boolean;
}

export function VotingResultsPanel({
  isOpen,
  results,
  totalVoters,
  maxDotsPerUser,
  onStartNewVote,
  onSaveResults,
  onDeleteSession,
  isCreator,
}: VotingResultsPanelProps) {
  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
  const maxVotes = results[0]?.voteCount || 0;

  const getBarWidth = (count: number) => {
    if (maxVotes === 0) return 0;
    return (count / maxVotes) * 100;
  };

  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return `#${index + 1}`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed right-4 top-24 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-4">
            <div className="flex items-center gap-2 text-white">
              <Trophy className="w-5 h-5" />
              <h3 className="font-semibold">Vote Results</h3>
            </div>
            <p className="text-violet-100 text-sm mt-1">
              {totalVotes} votes from {totalVoters} participants
            </p>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-3">
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No votes cast</p>
              </div>
            ) : (
              results.map((result, index) => (
                <motion.div
                  key={result.clusterId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-3 rounded-xl ${
                    index === 0 ? "bg-amber-50 border border-amber-200" : "bg-gray-50"
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? "bg-amber-500 text-white" :
                    index === 1 ? "bg-gray-400 text-white" :
                    index === 2 ? "bg-amber-600 text-white" :
                    "bg-gray-200 text-gray-600"
                  }`}>
                    {index < 3 ? getRankEmoji(index) : index + 1}
                  </div>

                  {/* Title */}
                  <div className="flex items-center justify-between pr-6">
                    <span className="font-medium text-gray-800 truncate">
                      {result.clusterTitle}
                    </span>
                    <span className={`font-bold ${
                      index === 0 ? "text-amber-600" : "text-gray-600"
                    }`}>
                      {result.voteCount}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getBarWidth(result.voteCount)}%` }}
                      transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
                      className={`h-full rounded-full ${
                        index === 0
                          ? "bg-gradient-to-r from-amber-400 to-amber-500"
                          : "bg-violet-400"
                      }`}
                    />
                  </div>

                  {/* Voter Dots */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {result.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                        title={`Voter ${i + 1}`}
                      />
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 p-4 space-y-2 bg-gray-50">
            <div className="flex gap-2">
              <Button
                onClick={onStartNewVote}
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                New Vote
              </Button>
              {isCreator && (
                <>
                  <Button
                    onClick={onSaveResults}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Save
                  </Button>
                  <Button
                    onClick={onDeleteSession}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
