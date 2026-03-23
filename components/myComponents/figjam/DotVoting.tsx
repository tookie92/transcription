"use client";

import React from "react";
import { motion } from "framer-motion";

interface DotVotingDockProps {
  isActive: boolean;
  maxDots: number;
  placedCount: number;
  onReset: () => void;
}

export function DotVotingDock({ isActive, maxDots, placedCount, onReset }: DotVotingDockProps) {
  const available = maxDots - placedCount;

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 px-6 py-3">
        <span className="text-sm text-gray-500 font-medium">Your dots:</span>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: maxDots }).map((_, i) => {
            const isPlaced = i < placedCount;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                style={{
                  background: isPlaced ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.1)",
                  borderColor: "#22c55e",
                  borderStyle: isPlaced ? "solid" : "dashed",
                }}
              />
            );
          })}
        </div>

        <div className="px-3 py-1.5 bg-green-50 rounded-full">
          <span className="text-lg font-bold text-green-600">{available}</span>
          <span className="text-sm text-green-500"> left</span>
        </div>

        {placedCount > 0 && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </motion.div>
  );
}
