"use client";

import React, { useCallback, useRef, useState, memo } from "react";
import type { ClusterLabelData } from "@/types/figjam";
import { usePureDrag } from "@/hooks/usePureDrag";

export const LABEL_COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  { bg: "#e9d5ff", border: "#a855f7", text: "#6b21a8" },
  { bg: "#f3f4f6", border: "#6b7280", text: "#374151" },
];

interface ClusterLabelProps {
  label: ClusterLabelData;
  zoom: number;
  isSelected: boolean;
  isHighlighted?: boolean;
  highlightDistance?: number;
  isLocked?: boolean;
  isVotingMode?: boolean;
  voteCount?: number;
  hasVoted?: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, patch: Partial<ClusterLabelData>) => void;
  onDelete: (id: string) => void;
  onMove?: (id: string, pos: { x: number; y: number }) => void;
  onVote?: (id: string) => void;
}

export const ClusterLabel = memo(function ClusterLabelComponent({
  label,
  zoom,
  isSelected,
  isHighlighted = false,
  highlightDistance = 0,
  isLocked = false,
  isVotingMode = false,
  voteCount = 0,
  hasVoted = false,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
  onVote,
}: ClusterLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMove = useCallback((labelId: string, pos: { x: number; y: number }) => {
    onMove?.(labelId, pos);
  }, [onMove]);

  const { handlePointerDown: dragPointerDown, setElementRef } = usePureDrag({
    id: label.id,
    position: label.position,
    zoom,
    onMove: handleMove,
    onDragStart: (id: string) => {
      onSelect(id, false);
    },
    onDragEnd: () => {},
    disabled: isLocked || isEditing,
  });

  const colorConfig = LABEL_COLORS.find(c => c.border === label.color) ?? LABEL_COLORS[0];

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isLocked || isEditing) return;
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('input')) return;

    e.stopPropagation();

    // In voting mode, clicking votes
    if (isVotingMode && onVote) {
      onVote(label.id);
      return;
    }

    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    onSelect(label.id, multi);

    dragPointerDown(e);
  }, [isLocked, isEditing, isVotingMode, onVote, onSelect, label.id, dragPointerDown]);

  const handleDoubleClick = useCallback(() => {
    if (isLocked) return;
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [isLocked]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setIsEditing(false);
    }
  }, []);

  const INFLUENCE_RADIUS = 350; // Always show subtle influence zone
  const glowIntensity = isHighlighted ? Math.max(0.4, 1 - highlightDistance / 400) : 0.12;
  const glowSize = isHighlighted 
    ? INFLUENCE_RADIUS + 30 + (1 - highlightDistance / 400) * 50 
    : INFLUENCE_RADIUS;

  return (
    <div
      ref={(el) => setElementRef(el)}
      className="absolute select-none group"
      style={{
        left: label.position.x,
        top: label.position.y,
        zIndex: label.zIndex,
        cursor: isLocked ? "default" : isEditing ? "text" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Proximity zone - always visible as subtle circle */}
      <div
        className="absolute pointer-events-none transition-all"
        style={{
          left: -INFLUENCE_RADIUS,
          top: -INFLUENCE_RADIUS,
          width: glowSize * 2,
          height: glowSize * 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colorConfig.border}${Math.round(glowIntensity * 25).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          border: isHighlighted 
            ? `2px dashed ${colorConfig.border}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}` 
            : `1px dashed ${colorConfig.border}40`,
          opacity: isHighlighted ? 1 : 0.4,
          transform: isHighlighted ? `scale(1)` : `scale(1)`,
        }}
      />
      
      {/* Distance indicator line when dragging */}
      {isHighlighted && highlightDistance > 50 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: -highlightDistance / 2,
            top: -highlightDistance / 2,
            width: highlightDistance,
            height: highlightDistance,
            borderLeft: `1px dashed ${colorConfig.border}60`,
            borderBottom: `1px dashed ${colorConfig.border}60`,
            transform: "rotate(-45deg)",
            transformOrigin: "top left",
          }}
        />
      )}
      
      <div
        className={`px-3 py-1.5 rounded-lg border-2 transition-all ${isVotingMode ? 'cursor-pointer hover:scale-105' : ''}`}
        style={{
          backgroundColor: isVotingMode 
            ? (hasVoted ? colorConfig.border + '30' : colorConfig.bg)
            : colorConfig.bg,
          borderColor: isSelected 
            ? "#0d99ff" 
            : isVotingMode && hasVoted 
              ? colorConfig.border 
              : colorConfig.border,
          boxShadow: isSelected 
            ? "0 0 0 2px rgba(13, 153, 255, 0.3), 0 0 15px rgba(13, 153, 255, 0.2)" 
            : isHighlighted
            ? `0 0 20px ${colorConfig.border}80, 0 0 40px ${colorConfig.border}40, 0 2px 8px rgba(0,0,0,0.15)`
            : isVotingMode && hasVoted
            ? `0 0 15px ${colorConfig.border}50`
            : "0 1px 3px rgba(0,0,0,0.1)",
          transform: isHighlighted ? "scale(1.08)" : "scale(1)",
        }}
      >
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              autoFocus
              className="outline-none text-sm font-semibold min-w-[80px] bg-transparent"
              style={{ 
                color: colorConfig.text,
              }}
              value={label.text}
              onChange={(e) => onUpdate(label.id, { text: e.target.value })}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className="text-sm font-semibold whitespace-nowrap"
              style={{ color: colorConfig.text }}
            >
              {label.text || "Cluster"}
            </span>
          )}
          
          {/* Vote count badge */}
          {voteCount > 0 && (
            <span 
              className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: colorConfig.border,
                color: 'white',
              }}
            >
              {voteCount}
            </span>
          )}
        </div>
      </div>
      
      {!isLocked && !isVotingMode && (
        <button
          className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: isSelected ? 1 : 0 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(label.id);
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
});
