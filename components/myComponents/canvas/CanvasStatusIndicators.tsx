"use client";

import { motion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";

interface CanvasStatusIndicatorsProps {
  isPlacingDot: boolean;
  isMovingWithArrows: boolean;
  selectedGroupsCount: number;
  isSpacePressed: boolean;
  applyingAction: string | null;
  isSilentSortingActive: boolean;
  currentPhase: string | null;
  groupTimeLeft: number;
  personalTimeLeft: number;
}

export function CanvasStatusIndicators({
  isPlacingDot,
  isMovingWithArrows,
  selectedGroupsCount,
  isSpacePressed,
  applyingAction,
  isSilentSortingActive,
  currentPhase,
  groupTimeLeft,
  personalTimeLeft,
}: CanvasStatusIndicatorsProps) {
  return (
    <>
      {/* Silent Sorting Indicator */}
      {isSilentSortingActive && (
        <div
          className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg ${
            currentPhase === "group-sorting"
              ? "bg-yellow-500 text-white"
              : currentPhase === "personal-review"
                ? "bg-blue-500 text-white"
                : "bg-green-500 text-white"
          }`}
        >
          {currentPhase === "group-sorting" &&
            `🔇 Group Sorting - ${Math.floor(groupTimeLeft / 60)}:${(groupTimeLeft % 60).toString().padStart(2, "0")}`}
          {currentPhase === "personal-review" &&
            `✏️ Personal Review - ${Math.floor(personalTimeLeft / 60)}:${(personalTimeLeft % 60).toString().padStart(2, "0")}`}
          {currentPhase === "discussion" &&
            `💬 Discussion Phase - Start talking!`}
        </div>
      )}

      {/* Dot Placement Indicator */}
      {isPlacingDot && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-ping" />
          <span>Click on groups or insights to place dots</span>
          <div className="w-3 h-3 bg-white rounded-full animate-ping" />
        </div>
      )}

      {/* Arrow Movement Indicator */}
      {isMovingWithArrows && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
        >
          <ArrowUp size={14} />
          <span>
            Moving {selectedGroupsCount} group
            {selectedGroupsCount > 1 ? "s" : ""}
          </span>
        </motion.div>
      )}

      {/* Space Pressed Indicator */}
      {isSpacePressed && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
          🖱️ Space + Drag to pan
        </div>
      )}

      {/* Applying Action Indicator */}
      {applyingAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
        >
          <Sparkles size={14} />
          <span>Applying {applyingAction}...</span>
        </motion.div>
      )}
    </>
  );
}
