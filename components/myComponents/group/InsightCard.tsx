"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Insight } from "@/types";

interface InsightCardProps {
  insight: Insight;
  groupId: string;
  workspaceMode: "grouping" | "voting";
  isSelectedByOther: boolean;
  isPresentationMode: boolean;
  isPlacingDot: boolean;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onInsightDragStart: (e: React.DragEvent, insightId: string) => void;
  onInsightDragOver: (e: React.DragEvent) => void;
  onInsightDragLeave: (e: React.DragEvent) => void;
  onInsightDrop: (e: React.DragEvent, groupId: string) => void;
  onInsightDragEnd: (e: React.DragEvent) => void;
  insightCardStyle: React.CSSProperties;
}

export function InsightCard({
  insight,
  groupId,
  workspaceMode,
  isSelectedByOther,
  isPresentationMode,
  isPlacingDot,
  onRemoveInsight,
  onInsightDragStart,
  onInsightDragOver,
  onInsightDragLeave,
  onInsightDrop,
  onInsightDragEnd,
  insightCardStyle,
}: InsightCardProps) {
  return (
    <div
      className="p-3 rounded-xl transition-all hover:scale-[1.02] hover:shadow-md cursor-move group"
      style={insightCardStyle}
      draggable={
        workspaceMode === "grouping" &&
        !isSelectedByOther &&
        !isPresentationMode &&
        !isPlacingDot
      }
      onDragStart={(e) => {
        if (isPresentationMode || isPlacingDot) return;
        onInsightDragStart(e, insight.id);
      }}
      onDragOver={onInsightDragOver}
      onDragLeave={onInsightDragLeave}
      onDrop={(e) => {
        if (isPresentationMode || isPlacingDot) return;
        onInsightDrop(e, groupId);
      }}
      onDragEnd={onInsightDragEnd}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg mr-3 shadow-sm ${
            insight.type === "pain-point"
              ? "bg-linear-to-r from-red-100 to-red-200 text-red-700"
              : insight.type === "quote"
                ? "bg-linear-to-r from-blue-100 to-blue-200 text-blue-700"
                : insight.type === "insight"
                  ? "bg-linear-to-r from-purple-100 to-purple-200 text-purple-700"
                  : "bg-linear-to-r from-green-100 to-green-200 text-green-700"
          }`}
        >
          {insight.type.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 text-sm leading-relaxed">{insight.text}</span>

        {workspaceMode === "grouping" &&
          onRemoveInsight &&
          !isPresentationMode &&
          !isPlacingDot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveInsight(insight.id, groupId);
              }}
              className="ml-2 text-gray-400 hover:text-red-500 transition-all hover:scale-110 opacity-0 group-hover:opacity-100 p-1 rounded"
              title="Remove from group"
            >
              <Trash2 size={14} />
            </button>
          )}
      </div>
    </div>
  );
}
