"use client";

import React from "react";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { InsightCard } from "./InsightCard";

interface InsightsListProps {
  groupInsights: Insight[];
  group: AffinityGroupType;
  workspaceMode: "grouping" | "voting";
  isDragOver: boolean;
  isSelectedByOther: boolean;
  isPresentationMode: boolean;
  isFocusedInPresentation: boolean;
  isPlacingDot: boolean;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onInsightDragStart: (e: React.DragEvent, insightId: string) => void;
  onInsightDragOver: (e: React.DragEvent) => void;
  onInsightDragLeave: (e: React.DragEvent) => void;
  onInsightDrop: (e: React.DragEvent, groupId: string) => void;
  onInsightDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  insightCardStyle: React.CSSProperties;
}

export function InsightsList({
  groupInsights,
  group,
  workspaceMode,
  isDragOver,
  isSelectedByOther,
  isPresentationMode,
  isFocusedInPresentation,
  isPlacingDot,
  onRemoveInsight,
  onInsightDragStart,
  onInsightDragOver,
  onInsightDragLeave,
  onInsightDrop,
  onInsightDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  insightCardStyle,
}: InsightsListProps) {
  return (
    <div
      className={`p-4 space-y-3 max-h-60 overflow-y-auto ${
        isPresentationMode && isFocusedInPresentation
          ? "bg-linear-to-br from-blue-50 to-indigo-50"
          : "bg-white/50"
      } rounded-b-2xl`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {groupInsights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          groupId={group.id}
          workspaceMode={workspaceMode}
          isSelectedByOther={isSelectedByOther}
          isPresentationMode={isPresentationMode}
          isPlacingDot={isPlacingDot}
          onRemoveInsight={onRemoveInsight}
          onInsightDragStart={onInsightDragStart}
          onInsightDragOver={onInsightDragOver}
          onInsightDragLeave={onInsightDragLeave}
          onInsightDrop={onInsightDrop}
          onInsightDragEnd={onInsightDragEnd}
          insightCardStyle={insightCardStyle}
        />
      ))}

      {groupInsights.length === 0 && (
        <div
          className={`text-center py-6 text-sm rounded-xl ${
            isDragOver
              ? "bg-linear-to-r from-blue-50 to-indigo-50 text-blue-600 font-bold border-2 border-dashed border-blue-300"
              : "text-gray-400 bg-gray-50/50"
          } transition-all`}
        >
          {workspaceMode === "grouping" && !isPlacingDot
            ? isDragOver
              ? "🎉 Drop insights here!"
              : "✨ Drag insights here to group them"
            : "No insights yet"}
          {isPlacingDot && (
            <div className="mt-2 text-xs text-gray-500">
              Click to place your vote dot!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
