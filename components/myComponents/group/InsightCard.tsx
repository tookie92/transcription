"use client";

import React, { useState } from "react";
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
    gradient: "from-red-50 to-red-100",
    border: "border-red-200",
    badge: "bg-red-500",
    label: "Pain",
  },
  "quote": {
    emoji: "💬",
    gradient: "from-blue-50 to-blue-100",
    border: "border-blue-200",
    badge: "bg-blue-500",
    label: "Quote",
  },
  "insight": {
    emoji: "💡",
    gradient: "from-purple-50 to-purple-100",
    border: "border-purple-200",
    badge: "bg-purple-500",
    label: "Idea",
  },
  "question": {
    emoji: "🤔",
    gradient: "from-amber-50 to-amber-100",
    border: "border-amber-200",
    badge: "bg-amber-500",
    label: "Question",
  },
} as const;

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
  index = 0,
}: InsightCardProps) {
  const type = insight.type as keyof typeof TYPE_CONFIG;
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.insight;
  const [isHovered, setIsHovered] = useState(false);

  const isDraggable = 
    workspaceMode === "grouping" &&
    !isSelectedByOther &&
    !isPresentationMode &&
    !isPlacingDot;

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
        relative group p-3.5 rounded-2xl transition-all duration-200
        bg-gradient-to-br ${config.gradient}
        border-2 ${config.border}
        hover:shadow-lg hover:shadow-black/5
        ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
      `}
      style={insightCardStyle}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (isDraggable && onInsightDragStart) {
          onInsightDragStart(e as unknown as React.DragEvent, insight.id);
        }
      }}
      onDragOver={(e) => {
        if (isDraggable && onInsightDragOver) {
          e.preventDefault();
          onInsightDragOver(e as unknown as React.DragEvent);
        }
      }}
      onDrop={(e) => {
        if (isDraggable && onInsightDrop) {
          onInsightDrop(e as unknown as React.DragEvent, groupId);
        }
      }}
      onDragEnd={(e) => {
        if (isDraggable && onInsightDragEnd) {
          onInsightDragEnd(e as unknown as React.DragEvent);
        }
      }}
    >
      {/* Drag Handle & Type Badge */}
      <div className="flex items-center gap-2 mb-2">
        {isDraggable && (
          <div className="text-gray-400 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={14} />
          </div>
        )}
        
        <span className="text-xs">{config.emoji}</span>
        
        <span className={`${config.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
          {config.label}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed text-gray-700 font-medium">
        {insight.text}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {insight.createdBy && (
            <>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">
                {insight.createdBy.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[60px]">{insight.createdBy}</span>
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
              flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 
              px-2 py-1 rounded-lg hover:bg-red-50 
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
