"use client";

import React, { useCallback, useRef, useState, memo, useEffect, useLayoutEffect } from "react";
import type { ClusterLabelData, StickyNoteData } from "@/types/figjam";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SlipFace, SlipStamp, slipKindOf } from "@/components/myComponents/affinity/SlipFace";
import { VoteSticker } from "@/components/myComponents/affinity/VoteSticker";
import {
  PACKET_EMPTY,
  PACKET_HEADER,
  PACKET_PAD,
  SLIP_GAP,
  SLIP_MIN_HEIGHT,
  SLIP_MIN_WIDTH,
  packetColumns,
  packetHeight,
  packetHugWidth,
} from "@/lib/packetLayout";
import { slipTilt } from "@/lib/slip";

const DEFAULT_BORDER = "var(--border)";
const HOVER_BORDER = "var(--foreground)";
const DROP_BORDER = "var(--primary)";

function formatStamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  return `${Math.floor(seconds / 60)}:${Math.round(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function RealStickyCard({ 
  sticky, 
  onRemove,
  onClick,
  onDragStart,
  onUpdate,
  onStartEdit,
  onAlsoFile,
  currentUserId,
}: { 
  sticky: StickyNoteData; 
  onRemove?: (id: string) => void;
  onClick?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<StickyNoteData>) => void;
  onStartEdit?: (id: string) => void;
  onAlsoFile?: (id: string) => void;
  currentUserId?: string;
}) {
  const kind = slipKindOf(sticky.color, sticky.source);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(sticky.content);
  const [isRemoving, setIsRemoving] = useState(false);
  
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
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
  };

  const handlePeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClick?.(sticky.id);
  };
  
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Animate out before removing
    setIsRemoving(true);
    setTimeout(() => {
      onRemove?.(sticky.id);
    }, 150);
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    e.stopPropagation();
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isRemoving) {
      e.preventDefault();
      return;
    }
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
        !isLockedByOther && !isRemoving && "cursor-grab active:cursor-grabbing"
      )}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={!isEditing && !isLockedByOther && !isRemoving}
      onDragStart={isRemoving ? undefined : handleDragStart}
      style={{
        transition: isRemoving ? "opacity 150ms ease-out, transform 150ms ease-out" : undefined,
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? "translateY(4px)" : "none",
      }}
    >
      <div
        className="relative group"
        onClick={handleCardClick}
        onDoubleClick={handleDoubleClick}
      >
        <SlipFace
          kind={kind}
          className="w-full h-full p-2.5 flex flex-col min-w-0"
          style={{
            minHeight: SLIP_MIN_HEIGHT,
            transform:
              isHovered && !isEditing && !isLockedByOther
                ? `rotate(${slipTilt(sticky.id)}deg) translateY(-2px)`
                : `rotate(${slipTilt(sticky.id)}deg)`,
            transition: "transform 160ms ease-out",
            opacity: isLockedByOther ? 0.7 : 1,
          }}
        >
          {/* Lock indicator */}
          {isLockedByOther && (
            <div className="absolute -top-6 left-2 flex items-center gap-1.5 px-2 py-1 bg-card border border-border text-xs text-foreground z-10 whitespace-nowrap">
              <span>{editingUserName || "Someone"} editing</span>
            </div>
          )}

          {/* Remove button - only if not locked */}
          {!isLockedByOther && (
            <div className="absolute top-1 right-1 flex items-center">
              {onAlsoFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onAlsoFile(sticky.id);
                  }}
                  className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-accent text-muted-foreground"
                  title="Also file"
                  aria-label="Also file in another packet"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={handleRemoveClick}
                className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-accent text-muted-foreground"
                aria-label="Remove from packet"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Content area */}
          <div ref={contentRef} className="flex-1 pr-5 overflow-hidden pt-2">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="w-full h-full min-h-[60px] resize-none outline-none bg-transparent text-[13px] leading-relaxed break-words text-foreground"
                style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
              />
            ) : (
              <p
                className={cn(
                  "text-[13px] leading-relaxed text-foreground break-words",
                  kind === "quote" && "italic"
                )}
                style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
              >
                {sticky.content || (isLockedByOther ? "Being edited..." : "Double-click to edit")}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-auto pt-2 min-w-0">
            {kind === "follow-up" && (
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 border border-foreground/50" />
            )}
            <SlipStamp kind={kind} />
            {typeof sticky.timestamp === "number" && sticky.timestamp >= 0 && (
              <button
                type="button"
                onClick={handlePeek}
                onPointerDown={(e) => e.stopPropagation()}
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                {formatStamp(sticky.timestamp)}
              </button>
            )}
            {sticky.authorName ? (
              <span className="text-[11px] truncate min-w-0 flex-1 text-right text-muted-foreground">
                {sticky.authorName}
              </span>
            ) : null}
          </div>
        </SlipFace>
      </div>
    </div>
  );
}

interface ClusterLabelProps {
  cluster: ClusterLabelData;
  memberStickies: StickyNoteData[];
  zoom: number;
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
  onDrag?: (dx: number, dy: number) => void;
  onDragEnd: (finalX: number, finalY: number) => void;
  onLabelChange?: (newLabel: string) => void;
  onSelect?: (id: string, multi: boolean) => void;
  onRemoveSticky?: (stickyId: string) => void;
  onStickyClick?: (stickyId: string) => void;
  onStickyUpdate?: (stickyId: string, patch: Partial<StickyNoteData>) => void;
  onStickyStartEdit?: (stickyId: string) => void;
  onAlsoFile?: (stickyId: string) => void;
  onDrop?: (stickyId: string) => void;
  onContextMenu?: (e: React.MouseEvent, clusterId: string) => void;
  onResize?: (clusterId: string, newHeight: number) => void;
  onWidthChange?: (clusterId: string, newWidth: number) => void;
  onFitFrame?: (clusterId: string, size: { width?: number; height?: number }) => void;
  onClusterClick?: (clusterId: string) => void;
  onAutoFit?: (clusterId: string) => void;
  triggerEdit?: boolean;
  triggerAutoFit?: boolean;
  onOpenAIRename?: (clusterId: string) => void;
  dotsRemaining?: number;
  onVotePanStart?: () => void;
  onVotePanDelta?: (dx: number, dy: number) => void;
}

export const ClusterLabel = memo(function ClusterLabelComponent({
  cluster,
  memberStickies,
  zoom,
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
  onAlsoFile,
  onDrop,
  onContextMenu,
  onResize,
  onWidthChange,
  onFitFrame,
  onClusterClick,
  onAutoFit,
  triggerEdit,
  triggerAutoFit,
  dotsRemaining = 0,
  onVotePanStart,
  onVotePanDelta,
}: ClusterLabelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [needsAutoFit, setNeedsAutoFit] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [fittedHeight, setFittedHeight] = useState(PACKET_EMPTY.height);

  // Track previous stickies count for smart auto-resize
  // React state for drag (replaces DOM refs)
  const [isLocalDragging, setIsLocalDragging] = useState(false);
  const visualPositionRef = useRef<{ x: number; y: number }>(cluster.position);
  const [visualPosition, setVisualPosition] = useState<{ x: number; y: number }>(cluster.position);

  // Sync ref when position changes externally (but NOT during local drag)
  useEffect(() => {
    if (!isLocalDragging) {
      visualPositionRef.current = { ...cluster.position };
      setVisualPosition({ ...cluster.position });
    }
  }, [cluster.position.x, cluster.position.y, isLocalDragging]);

  const isDraggingActive = isLocalDragging || isDragging;
  const canInteract = !isLocked && !isEditing;

  // Calculate grid dimensions based on actual sticky content
  const CLUSTER_WIDTH = cluster.width ?? PACKET_EMPTY.width;
  const COLS = packetColumns(CLUSTER_WIDTH, memberStickies.length);
  const MIN_CLUSTER_HEIGHT = PACKET_EMPTY.height;
  const MIN_CLUSTER_WIDTH = SLIP_MIN_WIDTH + PACKET_PAD * 2;
  const contentHeight = packetHeight(memberStickies.length, COLS);
  const AUTO_HEIGHT = Math.max(MIN_CLUSTER_HEIGHT, contentHeight);
  const FRAME_HEIGHT = isResizing
    ? Math.max(MIN_CLUSTER_HEIGHT, cluster.height ?? AUTO_HEIGHT)
    : Math.max(AUTO_HEIGHT, fittedHeight);

  const onFitFrameRef = useRef(onFitFrame);
  onFitFrameRef.current = onFitFrame;
  const lastFitRef = useRef({ width: CLUSTER_WIDTH, height: cluster.height ?? PACKET_EMPTY.height });

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => {
      if (isResizing) return;
      const next = Math.max(
        PACKET_EMPTY.height,
        PACKET_HEADER + grid.scrollHeight + PACKET_PAD
      );
      setFittedHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
      const currentHeight = lastFitRef.current.height;
      if (Math.abs(next - currentHeight) > 8) {
        lastFitRef.current.height = next;
        onFitFrameRef.current?.(cluster.id, { height: next });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [memberStickies.length, isResizing, cluster.id]);

  useEffect(() => {
    if (isResizing) return;
    const hug = packetHugWidth(Math.max(1, memberStickies.length));
    if (lastFitRef.current.width + 1 < hug) {
      lastFitRef.current.width = hug;
      onFitFrameRef.current?.(cluster.id, { width: hug });
    }
  }, [memberStickies.length, cluster.id, isResizing]);

  // Auto-fit when explicitly requested
  const autoFitTriggeredRef = useRef(false);
  useEffect(() => {
    if (needsAutoFit && onFitFrame && !autoFitTriggeredRef.current) {
      autoFitTriggeredRef.current = true;
      const newHeight = AUTO_HEIGHT;
      onFitFrame(cluster.id, { height: newHeight });
      setNeedsAutoFit(false);
      setTimeout(() => {
        autoFitTriggeredRef.current = false;
      }, 100);
    }
  }, [needsAutoFit, cluster.id, onFitFrame, AUTO_HEIGHT]);

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

  // Handle external auto-fit trigger - only once per trigger
  const autoFitHandledRef = useRef(false);
  useEffect(() => {
    if (triggerAutoFit && onFitFrame && !autoFitHandledRef.current) {
      autoFitHandledRef.current = true;
      onFitFrame(cluster.id, { height: AUTO_HEIGHT });
    }
    if (!triggerAutoFit) {
      autoFitHandledRef.current = false;
    }
  }, [triggerAutoFit, cluster.id, onFitFrame]);

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
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest("input")) return;
      if (target.closest("button")) return;

      // During voting, locked packets still accept dots (lock is edit-only)
      if (isVotingActive && !isVotingRevealed) {
        if (target.closest("[data-sticky-card]")) {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        let hasMoved = false;
        onVotePanStart?.();

        const handleVoteMove = (moveEvent: PointerEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
            onVotePanDelta?.(dx, dy);
          }
        };

        const handleVoteUp = () => {
          window.removeEventListener("pointermove", handleVoteMove);
          window.removeEventListener("pointerup", handleVoteUp);
          if (!hasMoved) {
            onClusterClick?.(cluster.id);
          }
        };

        window.addEventListener("pointermove", handleVoteMove);
        window.addEventListener("pointerup", handleVoteUp);
        return;
      }

      if (!canInteract) return;

      // During voting mode - clicking sticky cards still works, clicking cluster votes
      if (target.closest("[data-sticky-card]")) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      onDragStart();

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = cluster.position.x;
      const startPosY = cluster.position.y;
      let hasMoved = false;

      setIsLocalDragging(true);
      visualPositionRef.current = { x: startPosX, y: startPosY };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMoved = true;
        }

        const newX = startPosX + dx / zoom;
        const newY = startPosY + dy / zoom;

        visualPositionRef.current = { x: newX, y: newY };
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);

        setIsLocalDragging(false);

        if (!hasMoved) {
          if (onSelect) {
            onSelect(cluster.id, e.shiftKey || e.ctrlKey || e.metaKey);
          }
        } else {
          const finalX = startPosX + (upEvent.clientX - startX) / zoom;
          const finalY = startPosY + (upEvent.clientY - startY) / zoom;
          visualPositionRef.current = { x: finalX, y: finalY };
          setVisualPosition({ x: finalX, y: finalY });
          onDragEnd(finalX, finalY);
        }
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [
      canInteract,
      isVotingActive,
      isVotingRevealed,
      cluster.id,
      cluster.position.x,
      cluster.position.y,
      zoom,
      onDragStart,
      onDragEnd,
      onSelect,
      onClusterClick,
      onVotePanStart,
      onVotePanDelta,
    ]
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

  const borderColor = isDragOver ? DROP_BORDER : isDraggingActive || isHovered ? HOVER_BORDER : DEFAULT_BORDER;
  const bgColor = isDragOver
    ? "color-mix(in oklab, var(--card) 88%, var(--primary))"
    : "var(--card)";
  const selectionBorderColor = isLocked ? "var(--destructive)" : "var(--foreground)";
  const isVoteSpent = isVotingActive && !isVotingRevealed && dotsRemaining <= 0 && !hasUserVoted;

  // Use ref for position during drag for instant updates
  const effectivePosition = isLocalDragging ? visualPositionRef.current : cluster.position;

  return (
    <div
      ref={clusterRef}
      data-cluster-id={cluster.id}
      className="absolute select-none"
      style={{
        left: effectivePosition.x,
        top: effectivePosition.y,
        width: CLUSTER_WIDTH,
        height: FRAME_HEIGHT,
        overflow: "visible",
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
        className="absolute inset-0"
        style={{
          border: `1px solid ${
            isLocked || isSelected ? selectionBorderColor : borderColor
          }`,
          backgroundColor: isLocked
            ? "color-mix(in oklab, var(--destructive) 8%, var(--card))"
            : bgColor,
          transform: isDragOver ? "translateY(-3px)" : "none",
          transition:
            "transform 150ms ease-out, border-color 150ms ease-out, background-color 150ms ease-out",
          opacity: isLocked && !(isVotingActive && !isVotingRevealed) ? 0.85 : 1,
        }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-2.5 w-7 -translate-x-1/2 -translate-y-1/2 border border-border bg-muted"
        />
        <span
          aria-hidden
          className="absolute right-0 top-0 h-3.5 w-3.5 border-b border-l border-border bg-muted"
        />
      </div>

      {isLocked && (
        <div className="absolute top-2 right-2 z-10 bg-card px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase text-destructive border border-destructive">
          Locked
        </div>
      )}

      <div
        className="absolute flex min-w-0 items-center gap-2"
        style={{
          top: 8,
          left: PACKET_PAD,
          right: isVotingActive || isVotingRevealed ? 88 : 52,
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
            className="outline-none bg-transparent border-none px-0 py-0 m-0 w-full font-mono text-[11px] tracking-widest uppercase text-foreground"
            onFocus={(e) => e.target.select()}
          />
        ) : (
          <span
            className={cn(
              "cursor-text min-w-0 flex-1 truncate font-mono text-[11px] tracking-widest uppercase",
              cluster.text ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {cluster.text || "Untitled"}
          </span>
        )}
      </div>

      <div
        className="absolute z-10 flex items-center"
        style={{
          top: 0,
          right: 2,
          height: PACKET_HEADER,
        }}
      >
        {isVotingRevealed && voteCount > 0 && (
          <div className="flex items-center gap-1 pr-1">
            <div className="flex -space-x-1">
              {voteUsers.slice(0, 6).map((voter, i) => (
                <Tooltip key={`${voter.userId}-${i}`} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <VoteSticker
                        color={voter.color}
                        label={voter.name}
                        rotate={((i % 5) - 2) * 6}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="rounded-none text-xs">
                    {voter.name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-foreground">
              ×{voteCount}
            </span>
          </div>
        )}

        {isVotingActive && !isVotingRevealed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClusterClick?.(cluster.id);
            }}
            className={cn(
              "flex h-11 w-11 cursor-pointer items-center justify-center",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
              isVoteSpent && "cursor-not-allowed opacity-50"
            )}
            title={
              hasUserVoted
                ? "Pull your dot"
                : isVoteSpent
                  ? "Spent — no dots left"
                  : "Place a dot"
            }
            aria-label={
              hasUserVoted
                ? "Pull your dot"
                : isVoteSpent
                  ? "Spent, no dots left"
                  : "Place a dot"
            }
            aria-pressed={hasUserVoted}
          >
            <VoteSticker
              color={
                hasUserVoted
                  ? currentUserColor || "var(--foreground)"
                  : "var(--foreground)"
              }
              filled={hasUserVoted}
              size="md"
              rotate={hasUserVoted ? -10 : 0}
              label={hasUserVoted ? "Yours" : undefined}
            />
          </button>
        )}

        {!isVotingActive && (
          <span className="pointer-events-none pr-2 font-mono text-[11px] tabular-nums text-muted-foreground">
            ×{memberStickies.length}
          </span>
        )}
      </div>

      {/* Stickies grid */}
      <div
        ref={gridRef}
        data-sticky-grid
        className={cn(
          "absolute overflow-visible",
          isVotingActive && !isVotingRevealed && "pointer-events-none"
        )}
        style={{
          left: PACKET_PAD,
          right: PACKET_PAD,
          bottom: "auto",
          height: "auto",
          top: PACKET_HEADER,
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          gap: SLIP_GAP,
          alignContent: "start",
          alignItems: "stretch",
          justifyItems: "stretch",
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
        {memberStickies.length === 0 && (
          <div className="min-h-[72px] bg-muted/25" />
        )}
        {memberStickies.map((sticky) => (
          <div
            key={sticky.id}
            data-sticky-card
            className={cn(
              "min-w-0",
              isVotingActive && !isVotingRevealed ? "select-none" : ""
            )}
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
            onDragStart={(e) => {
              if (isVotingActive && !isVotingRevealed) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData("application/sticky-id", sticky.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              // Ne rien faire - le Canvas gère la logique de cluster
            }}
          >
            <RealStickyCard
              sticky={sticky}
              onRemove={onRemoveSticky}
              onClick={onStickyClick}
              onUpdate={onStickyUpdate}
              onStartEdit={onStickyStartEdit}
              onAlsoFile={onAlsoFile}
              currentUserId={currentUserId}
            />
          </div>
        ))}
      </div>

      {/* Resize handles - visible on hover */}
      {isHovered && !isVotingActive && (
        <>
          {/* Right edge handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
            onPointerDown={handleResizeStart}
            style={{ zIndex: 10 }}
          >
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-foreground/40" />
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
              const startHeight = FRAME_HEIGHT;
              
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
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 bg-foreground/40" />
          </div>
        </>
      )}
    </div>
  );
});
