"use client";

import React, { useCallback, useRef, useState, memo, useEffect } from "react";
import type { ClusterLabelData, StickyNoteData } from "@/types/figjam";
import { X, MoreHorizontal, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteDotData {
  id: string;
  userId: string;
  color: string;
  name: string;
  position: { x: number; y: number };
  isCurrentUser?: boolean;
}

interface ClusterLabelProps {
  cluster: ClusterLabelData;
  memberStickies: StickyNoteData[];
  isDragging: boolean;
  isLocked?: boolean;
  isDropTarget?: boolean;
  isVotingActive?: boolean;
  isVotingRevealed?: boolean;
  voteCount?: number;
  voteColors?: string[];
  voteUsers?: Array<{ userId: string; name: string; color: string }>;
  // Vote dots with positions
  voteDots?: VoteDotData[];
  // Current user info for voting
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
  onDrop?: (stickyId: string) => void;
  onContextMenu?: (e: React.MouseEvent, clusterId: string) => void;
  onResize?: (clusterId: string, newHeight: number) => void;
  onClusterClick?: (clusterId: string, position?: { x: number; y: number }) => void;
  onAutoFit?: (clusterId: string) => void;
  triggerEdit?: boolean;
  triggerAutoFit?: boolean;
}

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

const CARD_WIDTH = 160;
const CARD_GAP = 10;
const MAX_COLS = 4;
const HEADER_OFFSET = 40;
const CLUSTER_PADDING = 12;

function RealStickyCard({ 
  sticky, 
  onRemove,
  onClick,
  onDragStart 
}: { 
  sticky: StickyNoteData; 
  onRemove?: (id: string) => void;
  onClick?: (id: string) => void;
  onDragStart?: (id: string) => void;
}) {
  const colors = STICKY_COLORS[sticky.color] || STICKY_COLORS.yellow;
  const contentRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    if (contentRef.current) {
      const updateHeight = () => {
        const scrollHeight = contentRef.current?.scrollHeight || 100;
        const minHeight = 166;
        const maxHeight = 250;
        setCardHeight(Math.min(maxHeight, Math.max(minHeight, scrollHeight + 60)));
      };
      updateHeight();
    }
  }, [sticky.content]);

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
    e.stopPropagation();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/sticky-id", sticky.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(sticky.id);
  };

  return (
    <div 
      className="relative group cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Clickable sticky note */}
      <div
        className="relative cursor-pointer group"
        onClick={handleCardClick}
      >
        <div
          className="relative rounded-[3px] p-3 flex flex-col"
          style={{
            width: CARD_WIDTH,
            minHeight: cardHeight,
            backgroundColor: colors.bg,
            boxShadow: isHovered
              ? "4px 8px 20px rgba(0,0,0,0.2)"
              : "2px 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
            transform: isHovered ? "scale(1.02)" : "scale(1)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
        >
          {/* Remove button - subtle in top right corner */}
          <button
            onClick={handleRemoveClick}
            className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/10"
            style={{ color: colors.text }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          
          {/* Content area */}
          <div ref={contentRef} className="flex-1 pr-5">
            <p 
              className="text-[13px] font-medium leading-relaxed text-[#1d1d1d]"
              style={{ color: colors.text }}
            >
              {sticky.content || "Empty"}
            </p>
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

export const ClusterLabel = memo(function ClusterLabelComponent({
  cluster,
  memberStickies,
  isDragging,
  isLocked = false,
  isDropTarget = false,
  isVotingActive = false,
  isVotingRevealed = false,
  voteCount = 0,
  voteColors = [],
  voteUsers = [],
  voteDots = [],
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
  onDrop,
  onContextMenu,
  onResize,
  onClusterClick,
  onAutoFit,
  triggerEdit,
  triggerAutoFit,
}: ClusterLabelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [needsAutoFit, setNeedsAutoFit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  
  const isDraggingActive = isDragging;
  const canInteract = !isLocked && !isEditing;

  // Calculate grid dimensions
  const CLUSTER_WIDTH = cluster.width ?? 400;
  const COLS = Math.min(MAX_COLS, Math.max(1, Math.floor((CLUSTER_WIDTH - CLUSTER_PADDING * 2) / (CARD_WIDTH + CARD_GAP))));
  const rows = Math.ceil(memberStickies.length / COLS) || 1;
  const ESTIMATED_STICKY_HEIGHT = 140;
  const contentHeight = rows * (ESTIMATED_STICKY_HEIGHT + CARD_GAP) - CARD_GAP + CLUSTER_PADDING * 2;
  const AUTO_HEIGHT = Math.max(200, contentHeight + HEADER_OFFSET + 20);

  // Resize cluster when content changes or when auto-fit is triggered
  useEffect(() => {
    if (onResize && cluster.height !== AUTO_HEIGHT) {
      onResize(cluster.id, AUTO_HEIGHT);
    }
  }, [AUTO_HEIGHT, cluster.id, cluster.height, onResize]);

  // Auto-fit when explicitly requested
  useEffect(() => {
    if (needsAutoFit && onResize) {
      onResize(cluster.id, AUTO_HEIGHT);
      setNeedsAutoFit(false);
    }
  }, [needsAutoFit, AUTO_HEIGHT, cluster.id, onResize]);

  // Expose auto-fit function via ref
  useEffect(() => {
    if (clusterRef.current) {
      (clusterRef.current as any).autoFit = () => {
        setNeedsAutoFit(true);
      };
    }
  }, []);

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

  // Handle external auto-fit trigger
  useEffect(() => {
    if (triggerAutoFit && onResize) {
      onResize(cluster.id, AUTO_HEIGHT);
    }
  }, [triggerAutoFit, AUTO_HEIGHT, cluster.id, onResize]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canInteract) return;
      if (e.button !== 0) return;
      
      const target = e.target as HTMLElement;
      if (target.closest('input')) return;
      if (target.closest('[data-sticky-card]')) return;
      if (target.closest('button')) return;

      e.stopPropagation();
      e.preventDefault();

      if (onSelect) {
        onSelect(cluster.id, e.shiftKey || e.ctrlKey || e.metaKey);
      }

      onDragStart();

      const startX = e.clientX;
      const startY = e.clientY;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        onDrag(dx, dy);
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        const finalX = cluster.position.x + (upEvent.clientX - startX);
        const finalY = cluster.position.y + (upEvent.clientY - startY);
        onDragEnd(finalX, finalY);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [canInteract, cluster.id, cluster.position.x, cluster.position.y, onDragStart, onDrag, onDragEnd, onSelect]
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
        className="absolute inset-0 rounded-xl transition-all duration-150"
        style={{
          border: `2px dashed ${borderColor}`,
          backgroundColor: bgColor,
          borderRadius: 12,
        }}
      />

      {/* Header with title */}
      <div
        className="absolute"
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
        )}
      </div>

      {/* Count and menu button */}
      <div
        className="absolute flex items-center gap-2"
        style={{
          top: -28,
          right: 0,
        }}
      >
        {/* Vote count badge - only show when revealed */}
        {isVotingRevealed && voteCount > 0 && (
          <div 
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: `${voteColors[0] || "#8B5CF6"}`, color: "white" }}
          >
            {voteCount}
          </div>
        )}

        {/* Sticky count */}
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
        
        {isHovered && !isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu?.(e, cluster.id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 transition-colors cursor-pointer"
            style={{ color: labelColor }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Voting Area - Enhanced voting experience */}
      {isVotingActive && !isVotingRevealed && (
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{ pointerEvents: 'auto' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }}
          onMouseLeave={() => setMousePos(null)}
          onClick={(e) => {
            e.stopPropagation();
            if (mousePos) {
              onClusterClick?.(cluster.id, mousePos);
            }
          }}
        >
          {/* User's own votes */}
          {voteDots.filter(v => v.isCurrentUser).map((dot) => (
            <div
              key={dot.id}
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in duration-200"
              style={{
                left: dot.position.x,
                top: dot.position.y,
              }}
            >
              <div
                className="w-full h-full rounded-full border-[3px] border-white shadow-lg"
                style={{ backgroundColor: dot.color }}
                title={`${dot.name} voted here`}
              />
            </div>
          ))}
          
          {/* Preview dot on hover */}
          {mousePos && !hasUserVoted && (
            <div
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse"
              style={{
                left: mousePos.x,
                top: mousePos.y,
              }}
            >
              <div
                className="w-full h-full rounded-full border-[3px] border-white shadow-lg opacity-70"
                style={{ backgroundColor: currentUserColor || '#8B5CF6' }}
              />
            </div>
          )}
          
          {/* Vote prompt overlay */}
          {mousePos && !hasUserVoted && (
            <div
              className="absolute bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-1.5 text-xs font-medium text-gray-800 -translate-x-1/2 whitespace-nowrap"
              style={{
                left: mousePos.x,
                top: Math.max(20, mousePos.y - 30),
              }}
            >
              Click to vote
            </div>
          )}
          
          {/* Already voted indicator */}
          {hasUserVoted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 text-sm font-medium text-gray-800 flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: currentUserColor || '#8B5CF6' }}
                />
                You voted here
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Revealed votes display */}
      {isVotingRevealed && voteDots.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {voteDots.map((dot, i) => (
            <div
              key={dot.id}
              className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in"
              style={{
                left: dot.position.x,
                top: dot.position.y,
                animationDelay: `${i * 50}ms`,
              }}
            >
              <div
                className="w-full h-full rounded-full border-[2px] border-white shadow-md hover:scale-110 transition-transform"
                style={{ backgroundColor: dot.color }}
                title={dot.name}
              />
            </div>
          ))}
        </div>
      )}

      {/* Stickies grid */}
      <div
        data-sticky-grid
        className="absolute overflow-visible"
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
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
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
            style={{ pointerEvents: "auto" }}
            onPointerDown={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/sticky-id", sticky.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={(e) => {
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
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {memberStickies.length === 0 && (
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
    </div>
  );
});
