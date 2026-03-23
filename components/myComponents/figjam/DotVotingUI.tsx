"use client";

import React from "react";
import { motion } from "framer-motion";

// ─── VotingToggle ──────────────────────────────────────────────────────────────

interface VotingToggleProps {
  isActive: boolean;
  votesUsed: number;
  maxVotes: number;
  onToggle: () => void;
  onReset: () => void;
}

export function VotingToggle({ isActive, votesUsed, maxVotes, onToggle, onReset }: VotingToggleProps) {
  const remaining = maxVotes - votesUsed;

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-md ${
          isActive
            ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-200"
            : "bg-white text-gray-700 border border-gray-200 hover:border-green-300 hover:text-green-600"
        }`}
      >
        <span className={`text-lg ${isActive ? "animate-pulse" : ""}`}>●</span>
        <span>{isActive ? "Voting Active" : "Start Voting"}</span>
        
        {isActive && (
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-white text-green-600 text-xs font-bold rounded-full flex items-center justify-center shadow">
            {remaining}
          </span>
        )}
      </motion.button>

      {isActive && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onReset}
          className="px-3 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          Reset
        </motion.button>
      )}
    </div>
  );
}
