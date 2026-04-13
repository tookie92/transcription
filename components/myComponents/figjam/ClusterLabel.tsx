"use client";

import React, { useCallback, useRef, useState, memo, useEffect } from "react";
import { motion } from "framer-motion";
import type { ClusterLabelData, StickyNoteData } from "@/types/figjam";
import { MoreHorizontal, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const DEFAULT_BORDER_COLOR = "#B8B4FF";
const DEFAULT_BG_COLOR = "rgba(184, 180, 255, 0.05)";
const HOVER_BORDER_COLOR = "#9C7BFF";
const HOVER_BG_COLOR = "rgba(156, 123, 255, 0.07)";
const LABEL_COLOR_NORMAL = "#8B7FCC";
const LABEL_COLOR_DRAGGING = "#7C4DFF";

const STICKY_COLORS: Record<string, { bg: string; header: string; text: string; accent: string }> = {
  yellow:  { bg: "#FFF9C4", header: "#FFF176", text: "#3E2723", accent: "#F9A825" },
  pink:    { bg: "#F8BBD9", header: "#F48FB1", text: "#4A148C", accent: "#E91E63" },
  green:   { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047" },
  blue:    { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2" },
  purple:  { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA" },
  orange:  { bg: "#FFE0B2", header: "#FFCC80", text: "#E65100", accent: "#FB8C00" },
  white:   { bg: "#FAFAFA", header: "#EEEEEE", text: "#424242", accent: "#757575" },
  "pain-point":  { bg: "#FFCDD2", header: "#EF9A9A", text: "#B71C1C", accent: "#E53935" },
  "quote":       { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA" },
  "insight":     { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047" },
  "follow-up":   { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2" },
};

const INSIGHT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  "pain-point": { label: "PP", color: "#E53935" },
  "quote": { label: "Q", color: "#8E24AA" },
  "insight": { label: "I", color: "#43A047" },
  "follow-up": { label: "F", color: "#1976D2" },
};

function InsightTypeBadge({ type }: { type: string }) {
  const info = INSIGHT_TYPE_LABELS[type];
  if (!info) return null;

  return (
    <span
      className="text-[8px] px-1 py-0.5 rounded font-bold"
      style={{
        color: info.color,
        backgroundColor: `${info.color}20`,
      }}
      title={info.label}
    >
      {info.label}
    </span>
  );
}

const CARD_WIDTH = 280;
const CARD_GAP = 20;
const MAX_COLS = 4;
const HEADER_OFFSET = 40;
const CLUSTER_PADDING = 16;
const MIN_CLUSTER_WIDTH = 320;
const MIN_CLUSTER_HEIGHT = 280;

function RealStickyCard({ 
  sticky, 
  onRemove,
  onClick,
  onDragStart,
  onUpdate,
  onStartEdit,
  currentUserId,
}: { 
  sticky: StickyNoteData; 
  onRemove?: (id: string) => void;
  onClick?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<StickyNoteData>) => void;
  onStartEdit?: (id: string) => void;
  currentUserId?: string;
}) {
  const colors = STICKY_COLORS[sticky.color] || STICKY_COLORS.yellow;
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cardHeight, setCardHeight] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(sticky.content);
  
  useEffect(() => {
    if (contentRef.current) {
      const updateHeight = () => {
        const scrollHeight = contentRef.current?.scrollHeight || 160;
        const minHeight = 160;
        const maxHeight = 400;
        setCardHeight(Math.min(maxHeight, Math.max(minHeight, scrollHeight + 50)));
      };
      updateHeight();
    }
  }, [sticky.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Check if someone else is editing
    const isLockedByOther = sticky.editingBy && sticky.editingBy !== currentUserId;
    if (isLockedByOther) {
      return; // Can't edit if someone else is editing
    }
    
    e.stopPropagation();
    e.preventDefault();
    setEditingContent(sticky.content);
    setIsEditing(true);
    onStartEdit?.(sticky.id);
  };

  const handleSave = () => {
    const contentChanged = editingContent !== sticky.content;
    setIsEditing(false);
    if (onUpdate) {
      if (contentChanged) {
        onUpdate(sticky.id, { content: editingContent });
      } else {
        // Just close without changes
        onUpdate(sticky.id, {});
      }
    }
  };

  const handleCancel = () => {
    setEditingContent(sticky.content);
    setIsEditing(false);
    onStartEdit?.(sticky.id); // Signal editing ended
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      handleSave();
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.stopPropagation();
    onClick?.(sticky.id);
  };
  
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove?.(sticky.id);
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    e.stopPropagation();
  };

  const handleDragStart = (e: React.DragEvent) => {
    const isLockedByOther = sticky.editingBy && sticky.editingBy !== currentUserId;
    if (isEditing || isLockedByOther) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/sticky-id", sticky.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(sticky.id);
  };

  const isLockedByOther = sticky.editingBy && sticky.editingBy !== currentUserId;
  const editingUserName = sticky.editingByName;

  return (
    <div 
      className={cn(
        "relative group",
        !isLockedByOther && "cursor-grab active:cursor-grabbing"
      )}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={!isEditing && !isLockedByOther}
      onDragStart={handleDragStart}
    >
      {/* Clickable sticky note */}
      <div
        className="relative cursor-pointer group"
        onClick={handleCardClick}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="relative rounded-[3px] p-3 flex flex-col"
          style={{
            width: CARD_WIDTH,
            minHeight: cardHeight,
            backgroundColor: colors.bg,
            boxShadow: isHovered && !isLockedByOther
              ? "4px 8px 20px rgba(0,0,0,0.2)"
              : "2px 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
            transform: isHovered && !isEditing && !isLockedByOther ? "scale(1.02)" : "scale(1)",
            transition: "transform 0.15s, box-shadow 0.15s",
            opacity: isLockedByOther ? 0.7 : 1,
          }}
        >
          {/* Lock indicator */}
          {isLockedByOther && (
            <div className="absolute -top-6 left-2 flex items-center gap-1.5 px-2 py-1 bg-amber-100/95 backdrop-blur-sm rounded-md text-xs text-amber-800 z-10 shadow-sm whitespace-nowrap">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <span className="font-medium">{editingUserName || "Someone"} editing</span>
            </div>
          )}

          {/* Remove button - only if not locked */}
          {!isLockedByOther && (
            <button
              onClick={handleRemoveClick}
              className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/10"
              style={{ color: colors.text }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {/* Content area */}
          <div ref={contentRef} className="flex-1 pr-5 overflow-hidden pt-4">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="w-full h-full min-h-[60px] resize-none outline-none bg-transparent text-[13px] font-medium leading-relaxed break-words"
                style={{ color: colors.text, wordBreak: "break-word", overflowWrap: "break-word" }}
              />
            ) : (
              <p 
                className="text-[13px] font-medium leading-relaxed text-[#1d1d1b] break-words"
                style={{ color: colors.text, wordBreak: "break-word", overflowWrap: "break-word" }}
              >
                {sticky.content || (isLockedByOther ? "Being edited..." : "Double-click to edit")}
              </p>
            )}
          </div>
          
          {/* Footer with author and type */}
          <div className="flex items-center justify-between mt-auto pt-2">
            {sticky.authorName ? (
              <span 
                className="text-[11px] truncate max-w-[70px]"
                style={{ color: colors.text, opacity: 0.5 }}
              >
                {sticky.authorName}
              </span>
            ) : <div />}
            {sticky.source && <InsightTypeBadge type={sticky.source} />}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ClusterLabelProps {
  cluster: ClusterLabelData;
  memberStickies: StickyNoteData[];
  isDragging: boolean;
  isLocked?: boolean;
  isSelected?: boolean;
  isDropTarget?: boolean;
  isVotingActive?: boolean;
  isVotingRevealed?: boolean;
  voteCount?: number;
  voteUsers?: Array<{ userId: string; name: string; color: string }>;
  currentUserId?: string;
  currentUserColor?: string;
  currentUserName?: string;
  hasUserVoted?: boolean;
  onDragStart: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDragEnd: (finalX: number, finalY: number) => void;
  onLabelChange?: (newLabel: string) => void;
  onSelect?: (id: string, multi: boolean) => void;
  onRemoveSticky?: (stickyId: string) => void;
  onStickyClick?: (stickyId: string) => void;
  onStickyUpdate?: (stickyId: string, patch: Partial<StickyNoteData>) => void;
  onStickyStartEdit?: (stickyId: string) => void;
  onDrop?: (stickyId: string) => void;
  onContextMenu?: (e: React.MouseEvent, clusterId: string) => void;
  onResize?: (clusterId: string, newHeight: number) => void;
  onWidthChange?: (clusterId: string, newWidth: number) => void;
  onClusterClick?: (clusterId: string) => void;
  onAutoFit?: (clusterId: string) => void;
  triggerEdit?: boolean;
  triggerAutoFit?: boolean;
  onOpenAIRename?: (clusterId: string) => void;
  autoFitEnabled?: boolean;
  onToggleAutoFit?: (clusterId: string, enabled: boolean) => void;
}

export const ClusterLabel = memo(function ClusterLabelComponent({
  cluster,
  memberStickies,
  isDragging,
  isLocked = false,
  isSelected = false,
  isDropTarget = false,
  isVotingActive = false,
  isVotingRevealed = false,
  voteCount = 0,
  voteUsers = [],
  currentUserId,
  currentUserColor,
  currentUserName,
  hasUserVoted = false,
  onDragStart,
  onDrag,
  onDragEnd,
  onLabelChange,
  onSelect,
  onRemoveSticky,
  onStickyClick,
  onStickyUpdate,
  onStickyStartEdit,
  onDrop,
  onContextMenu,
  onResize,
  onWidthChange,
  onClusterClick,
  onAutoFit,
  triggerEdit,
  triggerAutoFit,
  onOpenAIRename,
  autoFitEnabled = false,
  onToggleAutoFit,
}: ClusterLabelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [needsAutoFit, setNeedsAutoFit] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);

  // Track previous stickies count for smart auto-resize
  const prevStickiesCountRef = useRef(memberStickies.length);
  const isAutoFittingRef = useRef(false);

  const isDraggingActive = isDragging;
  const canInteract = !isLocked && !isEditing;
  const hasInsights = memberStickies.length > 0;

  // Calculate grid dimensions based on actual sticky content
  const CLUSTER_WIDTH = cluster.width ?? 500;
  const COLS = Math.min(MAX_COLS, Math.max(1, Math.floor((CLUSTER_WIDTH - CLUSTER_PADDING * 2) / (CARD_WIDTH + CARD_GAP))));
  const rows = Math.ceil(memberStickies.length / COLS) || 1;
  
  // Calculate height based on actual sticky content
  const CARD_HEIGHT_WITH_PADDING = 210; // minHeight + padding
  const MIN_CLUSTER_HEIGHT = 200;
  const HEADER_AND_PADDING = HEADER_OFFSET + CLUSTER_PADDING + 20;
  const calculatedHeight = rows * (CARD_HEIGHT_WITH_PADDING + CARD_GAP) - CARD_GAP + HEADER_AND_PADDING;
  const AUTO_HEIGHT = Math.max(MIN_CLUSTER_HEIGHT, calculatedHeight);

  // Auto-fit when explicitly requested
  const autoFitTriggeredRef = useRef(false);
  useEffect(() => {
    if (needsAutoFit && onResize && !autoFitTriggeredRef.current) {
      autoFitTriggeredRef.current = true;
      const newHeight = Math.max(MIN_CLUSTER_HEIGHT, calculatedHeight);
      onResize(cluster.id, newHeight);
      setNeedsAutoFit(false);
      setTimeout(() => {
        autoFitTriggeredRef.current = false;
      }, 100);
    }
  }, [needsAutoFit, cluster.id, onResize, calculatedHeight]);

  // Expose auto-fit function via ref
  useEffect(() => {
    if (clusterRef.current) {
      (clusterRef.current as any).autoFit = () => {
        setNeedsAutoFit(true);
      };
    }
  }, []);

  // Smart auto-resize: automatically resize when stickies are added/removed
  useEffect(() => {
    const currentCount = memberStickies.length;
    const prevCount = prevStickiesCountRef.current;

    // Only auto-resize if enabled AND not currently resizing AND count changed
    if (autoFitEnabled && !isResizing && !isAutoFittingRef.current && currentCount !== prevCount) {
      isAutoFittingRef.current = true;
      const newHeight = Math.max(MIN_CLUSTER_HEIGHT, calculatedHeight);

      // Smooth resize with animation
      if (onResize) {
        onResize(cluster.id, newHeight);
        console.log(`[AUTO-FIT] Cluster ${cluster.id} resized to ${newHeight}px (${currentCount} stickies)`);
      }

      // Reset the flag after animation completes
      setTimeout(() => {
        isAutoFittingRef.current = false;
        prevStickiesCountRef.current = currentCount;
      }, 300);
    } else if (!autoFitEnabled) {
      // When auto-fit is disabled, just track count
      prevStickiesCountRef.current = currentCount;
    }
  }, [memberStickies.length, autoFitEnabled, isResizing, calculatedHeight, cluster.id, onResize]);

  // Handle external edit trigger
  useEffect(() => {
    if (triggerEdit && !isEditing) {
      setIsEditing(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [triggerEdit, isEditing]);

  // Handle external auto-fit trigger - only once per trigger
  const autoFitHandledRef = useRef(false);
  useEffect(() => {
    if (triggerAutoFit && onResize && !autoFitHandledRef.current) {
      autoFitHandledRef.current = true;
      onResize(cluster.id, AUTO_HEIGHT);
    }
    if (!triggerAutoFit) {
      autoFitHandledRef.current = false;
    }
  }, [triggerAutoFit, cluster.id, onResize]);

  // Handle width resize from right edge
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    if (!canInteract) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = CLUSTER_WIDTH;
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const newWidth = Math.max(MIN_CLUSTER_WIDTH, startWidth + dx);
      if (onWidthChange) {
        onWidthChange(cluster.id, newWidth);
      }
    };
    
    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [canInteract, cluster.id, CLUSTER_WIDTH, onWidthChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canInteract) return;
      if (e.button !== 0) return;
      
      const target = e.target as HTMLElement;
      if (target.closest('input')) return;
      if (target.closest('button')) return;

      // During voting mode - clicking sticky cards still works, clicking cluster votes
      if (target.closest('[data-sticky-card]')) {
        // Let sticky cards handle their own events
        return;
      }

      // During voting - click anywhere on cluster (not sticky) to vote
      if (isVotingActive && !isVotingRevealed) {
        e.stopPropagation();
        onClusterClick?.(cluster.id);
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      if (onSelect) {
        onSelect(cluster.id, e.shiftKey || e.ctrlKey || e.metaKey);
      }

      onDragStart();

      const startX = e.clientX;
      const startY = e.clientY;
      let hasMoved = false;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        // Visual feedback only - no state update during drag
        // Position updates only on drag end
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        if (!hasMoved) {
          // This was a click, not a drag - voting
          if (isVotingActive && !isVotingRevealed) {
            onClusterClick?.(cluster.id);
          }
        } else {
          const finalX = cluster.position.x + (upEvent.clientX - startX);
          const finalY = cluster.position.y + (upEvent.clientY - startY);
          onDragEnd(finalX, finalY);
        }
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [canInteract, isVotingActive, isVotingRevealed, cluster.id, cluster.position.x, cluster.position.y, onDragStart, onDragEnd, onSelect, onClusterClick]
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-sticky-card]')) return;
    if (!canInteract) return;
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [canInteract]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setIsEditing(false);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onLabelChange?.(e.target.value);
  }, [onLabelChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const stickyId = e.dataTransfer.getData("application/sticky-id");
    if (stickyId && onDrop) {
      onDrop(stickyId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, cluster.id);
  };

  const borderColor = isDragOver ? "#22c55e" : isDraggingActive || isHovered ? HOVER_BORDER_COLOR : DEFAULT_BORDER_COLOR;
  const bgColor = isDragOver ? "rgba(34, 197, 94, 0.1)" : isDraggingActive || isHovered ? HOVER_BG_COLOR : DEFAULT_BG_COLOR;
  const labelColor = isDraggingActive ? LABEL_COLOR_DRAGGING : LABEL_COLOR_NORMAL;

  // Auto-fit visual indicator - subtle glow when enabled
  const autoFitBorderColor = autoFitEnabled ? "#a855f7" : borderColor;
  const autoFitGlow = autoFitEnabled ? "0 0 20px rgba(168, 85, 247, 0.15)" : "none";

  // Selection and lock styling
  const isSolidBorder = isSelected || isLocked;
  const selectionBorderColor = isLocked ? "#ef4444" : "#3b82f6"; // Red if locked, blue if selected
  const selectionBorderStyle = isSolidBorder ? "2px solid" : "2px dashed";

  return (
    <div
      ref={clusterRef}
      data-cluster-id={cluster.id}
      className="absolute select-none"
      style={{
        left: cluster.position.x,
        top: cluster.position.y,
        width: CLUSTER_WIDTH,
        height: AUTO_HEIGHT,
        zIndex: cluster.zIndex,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-xl",
          autoFitEnabled && "transition-all duration-300 ease-out"
        )}
        style={{
          border: isLocked
            ? `2px solid ${selectionBorderColor}`
            : isSelected
              ? `2px solid ${selectionBorderColor}`
              : autoFitEnabled
                ? `2px solid ${autoFitBorderColor}`
                : `2px dashed ${borderColor}`,
          backgroundColor: isLocked ? "rgba(239, 68, 68, 0.1)" : bgColor,
          borderRadius: 12,
          opacity: isLocked ? 0.7 : 1,
          boxShadow: autoFitEnabled ? autoFitGlow : "none",
        }}
      />
      
      {/* Lock indicator */}
      {isLocked && (
        <div 
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-medium"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Locked
        </div>
      )}

      {/* Header with title and AI button */}
      <div
        className="absolute group flex items-center gap-1"
        style={{
          top: -28,
          left: 0,
          right: 50,
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={cluster.text}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            className="outline-none bg-transparent border-none px-0 py-0 m-0 w-full"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: labelColor,
              letterSpacing: "0.3px",
              caretColor: labelColor,
            }}
            onFocus={(e) => e.target.select()}
          />
        ) : (
          <>
            <span 
              className="cursor-text"
              style={{ 
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                color: labelColor,
                letterSpacing: "0.3px",
                whiteSpace: "nowrap",
              }}
            >
              {cluster.text || "New Cluster"}
            </span>
            {/* AI Rename Button - Show on hover when cluster has insights */}
            {hasInsights && (
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onOpenAIRename?.(cluster.id);
                }}
                className="p-1 rounded-md bg-primary/20 hover:bg-primary/30 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                title="Rename with AI"
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Cluster header section */}
      <div
        className="absolute flex items-center gap-2"
        style={{
          top: -28,
          right: 0,
        }}
      >
        {/* Real sticker-style dots for votes */}
        {((isVotingActive && !isVotingRevealed && voteCount > 0) || (isVotingRevealed && voteCount > 0)) && (
          <div className="absolute -top-3 left-0 flex -space-x-1">
            {/* Show user's dot during voting */}
            {isVotingActive && !isVotingRevealed && hasUserVoted && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-5 h-5 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: currentUserColor }}
              />
            )}
            {/* Show hidden count during voting */}
            {isVotingActive && !isVotingRevealed && voteCount > 0 && (
              <div className="w-5 h-5 rounded-full bg-slate-800 border-2 border-white shadow-md flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">?</span>
              </div>
            )}
            {/* Show revealed dots with tooltips */}
            {isVotingRevealed && voteUsers && voteUsers.length > 0 && (
              <>
                {voteUsers.slice(0, 8).map((voter, i) => (
                  <Tooltip key={voter.userId} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ scale: 0, y: -10 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="w-5 h-5 rounded-full border-2 border-white shadow-md cursor-default"
                        style={{ backgroundColor: voter.color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{voter.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {voteUsers.length > 8 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-full bg-slate-700 border-2 border-white shadow-md flex items-center justify-center cursor-help">
                        <span className="text-[8px] font-bold text-white">+{voteUsers.length - 8}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium mb-1">Also voted:</p>
                      <div className="space-y-0.5">
                        {voteUsers.slice(8).map(voter => (
                          <p key={voter.userId} className="flex items-center gap-1.5">
                            <span 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: voter.color }}
                            />
                            {voter.name}
                          </p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        )}

        {/* Vote button during voting - always visible */}
        {isVotingActive && !isVotingRevealed && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClusterClick?.(cluster.id);
            }}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center",
              "border-2 shadow-md transition-all duration-200 cursor-pointer",
              hasUserVoted
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-white border-slate-300 text-slate-400 hover:border-primary hover:text-primary"
            )}
            style={!hasUserVoted ? { 
              borderColor: currentUserColor,
              boxShadow: `0 0 0 2px ${currentUserColor}40`
            } : {}}
            title={hasUserVoted ? "Remove vote" : "Vote!"}
          >
            {hasUserVoted ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentUserColor }}
              />
            )}
          </motion.button>
        )}

        {/* Sticky count - hidden during voting */}
        {!isVotingActive && (
          <span
            className="pointer-events-none"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              color: labelColor,
              opacity: 0.7,
            }}
          >
            {memberStickies.length}
          </span>
        )}
      </div>

      {/* Stickies grid */}
      <div
        data-sticky-grid
        className={cn(
          "absolute overflow-visible",
          isVotingActive && !isVotingRevealed && "pointer-events-none"
        )}
        style={{
          left: CLUSTER_PADDING,
          right: CLUSTER_PADDING,
          bottom: CLUSTER_PADDING,
          top: HEADER_OFFSET,
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CARD_WIDTH}px)`,
          gap: CARD_GAP,
          alignContent: "start",
          justifyContent: "start",
        }}
        onDragOver={(e) => {
          if (isVotingActive && !isVotingRevealed) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (isVotingActive && !isVotingRevealed) return;
          e.preventDefault();
          const stickyId = e.dataTransfer.getData("application/sticky-id");
          if (stickyId && onDrop) {
            onDrop(stickyId);
          }
        }}
      >
        {memberStickies.map((sticky) => (
          <div 
            key={sticky.id} 
            data-sticky-card 
            style={{ 
              pointerEvents: isVotingActive && !isVotingRevealed ? "none" : "auto",
            }}
            onPointerDown={(e) => {
              if (isVotingActive && !isVotingRevealed) {
                e.stopPropagation();
                onClusterClick?.(cluster.id);
              } else {
                e.stopPropagation();
              }
            }}
            onClick={(e) => {
              if (isVotingActive && !isVotingRevealed) {
                e.stopPropagation();
                onClusterClick?.(cluster.id);
              }
            }}
            className={isVotingActive && !isVotingRevealed ? "select-none" : ""}
            onDragStart={(e) => {
              if (isVotingActive && !isVotingRevealed) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData("application/sticky-id", sticky.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={(e) => {
              if (isVotingActive && !isVotingRevealed) return;
              // If drag ended outside this cluster, remove the sticky
              const rect = clusterRef.current?.getBoundingClientRect();
              if (rect) {
                const isOutside = (
                  e.clientX < rect.left ||
                  e.clientX > rect.right ||
                  e.clientY < rect.top ||
                  e.clientY > rect.bottom
                );
                if (isOutside && onRemoveSticky) {
                  onRemoveSticky(sticky.id);
                }
              }
            }}
          >
            <RealStickyCard
              sticky={sticky}
              onRemove={onRemoveSticky}
              onClick={onStickyClick}
              onUpdate={onStickyUpdate}
              onStartEdit={onStickyStartEdit}
              currentUserId={currentUserId}
            />
          </div>
        ))}
      </div>

      {/* Empty state - hidden during voting */}
      {memberStickies.length === 0 && !isVotingActive && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ top: HEADER_OFFSET }}
        >
          <p
            className="text-xs opacity-40"
            style={{ color: labelColor }}
          >
            Drop insights here
          </p>
        </div>
      )}

      {/* Resize handles - visible on hover */}
      {isHovered && !isVotingActive && (
        <>
          {/* Right edge handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
            onPointerDown={handleResizeStart}
            style={{ zIndex: 10 }}
          >
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-full opacity-80" />
          </div>
          
          {/* Bottom edge handle */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
            onPointerDown={(e) => {
              if (!canInteract) return;
              e.stopPropagation();
              e.preventDefault();
              setIsResizing(true);
              
              const startY = e.clientY;
              const startHeight = AUTO_HEIGHT;
              
              const handlePointerMove = (moveEvent: PointerEvent) => {
                const dy = moveEvent.clientY - startY;
                const newHeight = Math.max(MIN_CLUSTER_HEIGHT, startHeight + dy);
                if (onResize) {
                  onResize(cluster.id, newHeight);
                }
              };
              
              const handlePointerUp = () => {
                setIsResizing(false);
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
              };
              
              window.addEventListener("pointermove", handlePointerMove);
              window.addEventListener("pointerup", handlePointerUp);
            }}
            style={{ zIndex: 10 }}
          >
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-primary rounded-full opacity-80" />
          </div>
          
          {/* Bottom-right corner handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20"
            onPointerDown={(e) => {
              if (!canInteract) return;
              e.stopPropagation();
              e.preventDefault();
              setIsResizing(true);
              
              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = CLUSTER_WIDTH;
              const startHeight = AUTO_HEIGHT;
              
              const handlePointerMove = (moveEvent: PointerEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                const newWidth = Math.max(MIN_CLUSTER_WIDTH, startWidth + dx);
                const newHeight = Math.max(MIN_CLUSTER_HEIGHT, startHeight + dy);
                if (onWidthChange) {
                  onWidthChange(cluster.id, newWidth);
                }
                if (onResize) {
                  onResize(cluster.id, newHeight);
                }
              };
              
              const handlePointerUp = () => {
                setIsResizing(false);
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
              };
              
              window.addEventListener("pointermove", handlePointerMove);
              window.addEventListener("pointerup", handlePointerUp);
            }}
          >
            <svg className="w-3 h-3 absolute bottom-0 right-0 text-primary" viewBox="0 0 12 12" fill="none">
              <path d="M10 2 L10 10 L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </>
      )}
    </div>
  );
});
