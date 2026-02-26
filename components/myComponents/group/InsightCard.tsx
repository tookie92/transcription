"use client";

import React, { useState, useCallback, memo } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { Insight } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface InsightCardProps {
  insight: Insight;
  groupId: string;
  workspaceMode: "grouping" | "voting";
  isSelectedByOther: boolean;
  isPresentationMode: boolean;
  isPlacingDot: boolean;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onInsightDragStart?: (e: React.DragEvent, insightId: string) => void;
  onInsightDragOver?: (e: React.DragEvent) => void;
  onInsightDragLeave?: (e: React.DragEvent) => void;
  onInsightDrop?: (e: React.DragEvent, groupId: string) => void;
  onInsightDragEnd?: (e: React.DragEvent) => void;
  insightCardStyle?: React.CSSProperties;
  index?: number;
}

const TYPE_CONFIG = {
  "pain-point": {
    emoji: "😫",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-500",
    label: "Pain",
    textColor: "text-red-900",
  },
  "quote": {
    emoji: "💬",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-500",
    label: "Quote",
    textColor: "text-blue-900",
  },
  "insight": {
    emoji: "💡",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-500",
    label: "Idea",
    textColor: "text-purple-900",
  },
  "question": {
    emoji: "🤔",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-500",
    label: "Question",
    textColor: "text-amber-900",
  },
} as const;

const InsightCardComponent = ({
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
  index = 0,
}: InsightCardProps) => {
  const type = insight.type as keyof typeof TYPE_CONFIG;
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.insight;
  const [isHovered, setIsHovered] = useState(false);

  const isDraggable = 
    workspaceMode === "grouping" &&
    !isSelectedByOther &&
    !isPresentationMode &&
    !isPlacingDot;

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (isDraggable && onInsightDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      onInsightDragStart(e, insight.id);
    }
  }, [isDraggable, onInsightDragStart, insight.id]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isDraggable && onInsightDragOver) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      onInsightDragOver(e);
    }
  }, [isDraggable, onInsightDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isDraggable && onInsightDrop) {
      e.preventDefault();
      onInsightDrop(e, groupId);
    }
  }, [isDraggable, onInsightDrop, groupId]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (isDraggable && onInsightDragEnd) {
      onInsightDragEnd(e);
    }
  }, [isDraggable, onInsightDragEnd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { delay: index * 0.03, type: "spring", stiffness: 300, damping: 25 }
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative group p-4 rounded-md transition-all duration-200
        ${config.bg} ${config.border}
        border-b-4 shadow-sm hover:shadow-md hover:-translate-y-0.5
        ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
      `}
      style={insightCardStyle}
      draggable={isDraggable}
      onDragStart={handleDragStart as never}
      onDragOver={handleDragOver as never}
      onDrop={handleDrop as never}
      onDragEnd={handleDragEnd as never}
    >
      {/* Drag Handle & Type Badge */}
      <div className="flex items-center gap-2 mb-3">
        {isDraggable && (
          <div className="text-gray-400 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={14} />
          </div>
        )}
        
        <span className="text-sm">{config.emoji}</span>
        
        <span className={`${config.badge} text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider`}>
          {config.label}
        </span>
      </div>

      {/* Content */}
      <p className={`text-base leading-relaxed font-medium ${config.textColor}`}>
        {insight.text}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {insight.createdByName && (
            <>
              <div className="w-5 h-5 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">
                {insight.createdByName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[60px]">{insight.createdByName}</span>
            </>
          )}
        </div>

        {workspaceMode === "grouping" && onRemoveInsight && !isPresentationMode && !isPlacingDot && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveInsight(insight.id, groupId);
            }}
            className="
              flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive 
              px-2 py-1 rounded-lg hover:bg-destructive/10 
              opacity-0 group-hover:opacity-100 transition-all
            "
            title="Remove from group"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Remove</span>
          </motion.button>
        )}
      </div>

      {/* Fun corner emoji */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="absolute -top-2 -right-2 pointer-events-none text-xl"
          >
            {config.emoji}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const InsightCard = memo(InsightCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.insight.id === nextProps.insight.id &&
    prevProps.groupId === nextProps.groupId &&
    prevProps.workspaceMode === nextProps.workspaceMode &&
    prevProps.isSelectedByOther === nextProps.isSelectedByOther &&
    prevProps.isPresentationMode === nextProps.isPresentationMode &&
    prevProps.isPlacingDot === nextProps.isPlacingDot &&
    prevProps.index === nextProps.index
  );
});
