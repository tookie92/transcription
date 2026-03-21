"use client";

import React, { useCallback } from "react";
import { Insight } from "@/types";
import { GripVertical, X, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: Insight;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, insight: Insight) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onRemove?: (insightId: string) => void;
  compact?: boolean;
  showTimestamp?: boolean;
  onClick?: (insight: Insight) => void;
  isSelected?: boolean;
}

export function InsightCard({
  insight,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onRemove,
  compact = false,
  showTimestamp = false,
  onClick,
  isSelected = false,
}: InsightCardProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", insight.id);
      e.dataTransfer.setData("application/insight-type", insight.type);
      onDragStart?.(e, insight);
    },
    [insight, onDragStart]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      onDragEnd?.(e);
    },
    [onDragEnd]
  );

  const typeStyles: Record<string, { bg: string; border: string; text: string; label: string }> = {
    "pain-point": {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      label: "Pain Point",
    },
    quote: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      label: "Quote",
    },
    insight: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-800",
      label: "Insight",
    },
    question: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      label: "Question",
    },
    "follow-up": {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      label: "Follow-up",
    },
    custom: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-800",
      label: "Note",
    },
  };

  const style = typeStyles[insight.type] || typeStyles.custom;

  const typeEmojis: Record<string, string> = {
    "pain-point": "😫",
    quote: "💬",
    insight: "💡",
    question: "🤔",
    "follow-up": "📋",
    custom: "📝",
  };

  const formatTimestamp = (ts: number) => {
    const mins = Math.floor(ts / 60);
    const secs = ts % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick?.(insight)}
      className={cn(
        "group relative rounded-lg border p-2 cursor-grab active:cursor-grabbing transition-all",
        style.bg,
        style.border,
        isDragging && "opacity-50 scale-95",
        isSelected && "ring-2 ring-primary ring-offset-2",
        compact ? "text-xs" : "text-sm"
      )}
    >
      <div className="flex items-start gap-1.5">
        <div className="mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className={cn("w-3 h-3", compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
        </div>

        <span className="text-base leading-none">{typeEmojis[insight.type] || "📝"}</span>

        <div className="flex-1 min-w-0">
          <p className={cn("leading-relaxed", style.text)}>
            {compact && insight.text.length > 80
              ? insight.text.substring(0, 80) + "..."
              : insight.text}
          </p>

          {showTimestamp && insight.timestamp > 0 && (
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{formatTimestamp(insight.timestamp)}</span>
              {insight.interviewId && (
                <>
                  <MessageSquare className="w-3 h-3 ml-2" />
                  <span className="text-xs">Has notes</span>
                </>
              )}
            </div>
          )}
        </div>

        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(insight.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/50 rounded transition-opacity"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {!compact && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              style.bg,
              style.text
            )}
          >
            {style.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {insight.source === "ai" ? "AI" : "Manual"}
          </span>
        </div>
      )}
    </div>
  );
}

interface InsightCardListProps {
  insights: Insight[];
  onDragStart?: (e: React.DragEvent, insight: Insight) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onRemove?: (insightId: string) => void;
  onInsightClick?: (insight: Insight) => void;
  selectedIds?: Set<string>;
  emptyMessage?: string;
  compact?: boolean;
  showTimestamp?: boolean;
}

export function InsightCardList({
  insights,
  onDragStart,
  onDragEnd,
  onRemove,
  onInsightClick,
  selectedIds,
  emptyMessage = "No insights",
  compact = false,
  showTimestamp = false,
}: InsightCardListProps) {
  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          insight={insight}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onRemove={onRemove}
          onClick={onInsightClick}
          isSelected={selectedIds?.has(insight.id)}
          compact={compact}
          showTimestamp={showTimestamp}
        />
      ))}
    </div>
  );
}
