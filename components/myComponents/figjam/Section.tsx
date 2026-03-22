/**
 * FigJam-style Section Component for Clusters
 * 
 * Features:
 * - Dotted border (FigJam style)
 * - Individual colors
 * - Lock/unlock section
 * - Opacity control
 * - Aspect ratio constraints
 * - Auto-fit content
 * - Resizable with handles
 */

"use client";

import React, { useState, useCallback, useRef, useEffect, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { CLUSTER_MIN_WIDTH, CLUSTER_MIN_HEIGHT, STICKY_WIDTH, STICKY_HEIGHT } from "@/lib/canvas-utils";
import { MessageCircle, Lock, Unlock, Maximize2, SlidersHorizontal } from "lucide-react";
import { GroupNameAssistant } from "../GroupNameAssistant";

export const SECTION_COLORS = [
  { name: "Purple", value: "#9747FF" },
  { name: "Blue", value: "#4499FF" },
  { name: "Green", value: "#0ACF83" },
  { name: "Orange", value: "#FF9500" },
  { name: "Red", value: "#FF4444" },
  { name: "Pink", value: "#FF6EB0" },
] as const;

export type SectionColor = typeof SECTION_COLORS[number]["value"];

interface NameSuggestion {
  title: string;
  reason: string;
  confidence: number;
  category: "descriptive" | "actionable" | "thematic" | "problem-focused";
}

interface SectionProps {
  group: AffinityGroupType;
  insightCount: number;
  insights?: Insight[];
  scale?: number;
  isSelected?: boolean;
  isDropTarget?: boolean;
  onClick?: (group: AffinityGroupType, e: React.MouseEvent) => void;
  onTitleChange?: (id: string, title: string) => void;
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onColorChange?: (id: string, color: SectionColor) => void;
  onDelete?: (id: string) => void;
  onOpenComments?: (groupId: string, rect: DOMRect) => void;
  onLockChange?: (id: string, locked: boolean) => void;
  onOpacityChange?: (id: string, opacity: number) => void;
  onAutoFit?: (id: string) => void;
  autoSize?: { width: number; height: number };
  unreadCount?: number;
  amIMentioned?: boolean;
  projectContext?: string;
}

export const Section = memo(function Section({
  group,
  insightCount,
  insights = [],
  scale = 1,
  isSelected = false,
  isDropTarget = false,
  onClick,
  onTitleChange,
  onPositionChange,
  onSizeChange,
  onColorChange,
  onDelete,
  onOpenComments,
  onLockChange,
  onOpacityChange,
  onAutoFit,
  autoSize,
  unreadCount,
  amIMentioned,
  projectContext,
}: SectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; aspectRatio: number } | null>(null);
  const currentPosRef = useRef(group.position);
  const currentSizeRef = useRef({ width: CLUSTER_MIN_WIDTH, height: CLUSTER_MIN_HEIGHT });
  const isDraggingRef = useRef(false);

  const [localPosition, setLocalPosition] = useState(group.position);
  const [localSize, setLocalSize] = useState(
    group.size || autoSize || { width: CLUSTER_MIN_WIDTH, height: CLUSTER_MIN_HEIGHT }
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(group.title);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    currentPosRef.current = group.position;
    if (!isDraggingRef.current) {
      setLocalPosition(group.position);
    }
  }, [group.position]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Only update size from group.size when it changes (not from autoSize)
  useEffect(() => {
    if (group.size && !isDraggingRef.current) {
      setLocalSize(group.size);
    }
  }, [group.size]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const colorInfo = useMemo(() => {
    return SECTION_COLORS.find((c) => c.value === group.color) || SECTION_COLORS[0];
  }, [group.color]);

  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || isEditingTitle || isLocked) return;
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      isDraggingRef.current = true;

      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: localPosition.x,
        posY: localPosition.y,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStartRef.current) return;
        const dx = (moveEvent.clientX - dragStartRef.current.x) / scale;
        const dy = (moveEvent.clientY - dragStartRef.current.y) / scale;
        const newPos = {
          x: dragStartRef.current.posX + dx,
          y: dragStartRef.current.posY + dy,
        };
        setLocalPosition(newPos);
        currentPosRef.current = newPos;
      };

      const handleMouseUp = () => {
        if (dragStartRef.current && onPositionChange) {
          onPositionChange(group.id, currentPosRef.current);
        }
        setIsDragging(false);
        isDraggingRef.current = false;
        dragStartRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [localPosition, scale, group.id, onPositionChange, isEditingTitle, isLocked]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, corner: "se" | "e" | "s") => {
      if (isLocked) return;
      e.preventDefault();
      e.stopPropagation();

      const aspectRatio = localSize.width / localSize.height;

      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: localSize.width,
        height: localSize.height,
        aspectRatio,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeStartRef.current) return;
        const dx = (moveEvent.clientX - resizeStartRef.current.x) / scale;
        const dy = (moveEvent.clientY - resizeStartRef.current.y) / scale;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;

        if (corner === "se" || corner === "e") {
          newWidth = Math.max(CLUSTER_MIN_WIDTH, resizeStartRef.current.width + dx);
        }
        if (corner === "se" || corner === "s") {
          newHeight = Math.max(CLUSTER_MIN_HEIGHT, resizeStartRef.current.height + dy);
        }

        if (maintainAspectRatio && corner === "se") {
          const ratio = resizeStartRef.current.aspectRatio;
          if (Math.abs(dx) > Math.abs(dy)) {
            newHeight = newWidth / ratio;
          } else {
            newWidth = newHeight * ratio;
          }
        }

        const newSize = { width: newWidth, height: newHeight };
        setLocalSize(newSize);
        currentSizeRef.current = newSize;
      };

      const handleMouseUp = () => {
        if (resizeStartRef.current && onSizeChange) {
          onSizeChange(group.id, currentSizeRef.current);
        }
        resizeStartRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [localSize, scale, group.id, onSizeChange, isLocked, maintainAspectRatio]
  );

  const handleAutoFit = useCallback(() => {
    if (insights.length === 0) return;

    const cols = Math.ceil(Math.sqrt(insights.length));
    const rows = Math.ceil(insights.length / cols);

    const padding = 40;
    const headerHeight = 60;
    const spacingX = STICKY_WIDTH + 20;
    const spacingY = STICKY_HEIGHT + 20;

    const newWidth = padding * 2 + cols * spacingX;
    const newHeight = headerHeight + padding * 2 + rows * spacingY;

    const newSize = { width: newWidth, height: newHeight };
    setLocalSize(newSize);
    currentSizeRef.current = newSize;
    onSizeChange?.(group.id, newSize);
    onAutoFit?.(group.id);
  }, [insights.length, group.id, onSizeChange, onAutoFit]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(group, e);
    },
    [group, onClick]
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setIsEditingTitle(true);
    setTitleValue(group.title);
  }, [group.title, isLocked]);

  const handleTitleSave = useCallback(() => {
    if (titleValue.trim() && titleValue !== group.title) {
      onTitleChange?.(group.id, titleValue.trim());
    }
    setIsEditingTitle(false);
  }, [titleValue, group.id, group.title, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleTitleSave();
      else if (e.key === "Escape") {
        setTitleValue(group.title);
        setIsEditingTitle(false);
      }
    },
    [handleTitleSave, group.title]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  const handleLockToggle = useCallback(() => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    onLockChange?.(group.id, newLocked);
    setShowContextMenu(false);
  }, [isLocked, group.id, onLockChange]);

  const handleOpacityChange = useCallback((newOpacity: number) => {
    setOpacity(newOpacity);
    onOpacityChange?.(group.id, newOpacity);
  }, [group.id, onOpacityChange]);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
      setShowSettings(false);
    };
    if (showContextMenu || showSettings) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showContextMenu, showSettings]);

  return (
    <>
      <div
        ref={sectionRef}
        className={cn(
          "absolute transition-shadow",
          isLocked && "pointer-events-none",
          !isLocked && "cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        style={{
          left: localPosition.x,
          top: localPosition.y,
          width: localSize.width,
          height: localSize.height,
          zIndex: isSelected || isDropTarget ? 5 : 1,
          opacity: opacity / 100,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Border */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl border-[2.5px] border-dash transition-all",
            (isHovered || isDropTarget) && "shadow-xl"
          )}
          style={{
            borderColor: isDropTarget ? "#9747FF" : isHovered ? colorInfo.value : `${colorInfo.value}80`,
            borderStyle: "dashed",
          }}
        />

        {/* Selection outline */}
        {isSelected && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ outline: `2px solid ${colorInfo.value}`, outlineOffset: 4 }}
          />
        )}

        {/* Lock indicator */}
        {isLocked && (
          <div className="absolute inset-0 rounded-2xl bg-muted/20 pointer-events-auto flex items-center justify-center">
            <div className="bg-card/90 px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
              <Lock size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Locked</span>
            </div>
          </div>
        )}

        {/* Drop indicator */}
        {(isHovered || isDropTarget) && !isLocked && (
          <div
            className="absolute inset-2 rounded-xl border-2 border-dashed flex items-center justify-center pointer-events-none animate-pulse"
            style={{ borderColor: isDropTarget ? "#9747FF" : `${colorInfo.value}80` }}
          >
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{
                color: isDropTarget ? "#fff" : colorInfo.value,
                backgroundColor: isDropTarget ? "#9747FF" : `${colorInfo.value}20`,
              }}
            >
              {isDropTarget ? "Release to drop" : "Drop here"}
            </span>
          </div>
        )}

        {/* Header */}
        <div
          className={cn(
            "absolute -top-9 left-0 flex items-center gap-1.5",
            !isLocked && "cursor-move"
          )}
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {/* Lock button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLockToggle();
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              isLocked
                ? "bg-muted text-muted-foreground"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
            title={isLocked ? "Unlock section" : "Lock section"}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>

          {/* Title */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] font-semibold text-foreground bg-background border border-primary rounded px-2 py-0.5 outline-none"
            />
          ) : (
            <span className="text-[13px] font-semibold text-foreground bg-card px-2 py-0.5 rounded shadow-sm border border-border">
              {group.title}
            </span>
          )}

          {/* Count badge */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shadow-sm"
            style={{ backgroundColor: `${colorInfo.value}20`, color: colorInfo.value }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorInfo.value }} />
            {insightCount}
          </span>

          {/* AI suggestion button */}
          {insights.length > 0 && !isLocked && onTitleChange && (
            <GroupNameAssistant
              group={group}
              insights={insights}
              currentTitle={group.title}
              onTitleUpdate={(newTitle) => onTitleChange(group.id, newTitle)}
              projectContext={projectContext}
            />
          )}

          {/* Comments button */}
          {onOpenComments && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onOpenComments(group.id, rect);
              }}
              className={cn(
                "p-1.5 rounded-lg transition-all relative hover:bg-accent",
                amIMentioned ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:text-primary"
              )}
              title="Comments"
            >
              <MessageCircle size={14} />
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {amIMentioned && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-background" />}
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              showSettings ? "bg-accent text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
            title="Section settings"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* Auto-fit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAutoFit();
            }}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
            title="Fit content"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Resize handles */}
        {!isLocked && (
          <>
            {/* Bottom-right corner */}
            <div
              className="absolute -bottom-2.5 -right-2.5 w-5 h-5 cursor-se-resize z-10 flex items-center justify-center"
              onMouseDown={(e) => handleResizeMouseDown(e, "se")}
            >
              <svg viewBox="0 0 16 16" className="w-full h-full" style={{ color: colorInfo.value }}>
                <path d="M14 14L8 14M14 14L14 8M14 14L6 6" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            {/* Bottom edge */}
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-2 cursor-s-resize z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, "s")}
            >
              <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            {/* Right edge */}
            <div
              className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-16 cursor-e-resize z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeMouseDown(e, "e")}
            >
              <div className="w-1 h-8 bg-muted-foreground/30 rounded-full" />
            </div>
          </>
        )}
      </div>

      {/* Settings dropdown */}
      {showSettings && (
        <div
          className="absolute top-full left-0 mt-2 z-[100] bg-card rounded-xl shadow-xl border border-border p-3 min-w-[200px] dark:shadow-none"
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Section Settings</h4>

          {/* Opacity */}
          <div className="mb-3">
            <label className="text-xs font-medium text-foreground mb-1 block">Opacity</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="30"
                max="100"
                value={opacity}
                onChange={(e) => handleOpacityChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-8">{opacity}%</span>
            </div>
          </div>

          {/* Aspect ratio */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-xs font-medium text-foreground">Maintain aspect ratio</span>
            </label>
          </div>

          {/* Fit content button */}
          <button
            onClick={() => {
              handleAutoFit();
              setShowSettings(false);
            }}
            className="w-full px-3 py-2 text-xs font-medium text-foreground bg-muted hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
          >
            <Maximize2 size={12} />
            Fit content to section
          </button>
        </div>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <div
          className="fixed z-[200] bg-card rounded-xl shadow-xl border border-border py-1 min-w-[160px] dark:shadow-none"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Lock/Unlock */}
          <button
            onClick={handleLockToggle}
            className="w-full px-3 py-2 text-left text-[13px] hover:bg-accent flex items-center gap-2 text-foreground"
          >
            {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
            {isLocked ? "Unlock section" : "Lock section"}
          </button>

          <div className="border-t border-border my-1" />

          {/* Color picker */}
          <div className="px-3 py-1.5">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Color</span>
            <div className="flex gap-1 mt-1.5">
              {SECTION_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    onColorChange?.(group.id, c.value);
                    setShowContextMenu(false);
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                    colorInfo.value === c.value ? "border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-border my-1" />

          {/* Rename */}
          <button
            onClick={() => {
              setIsEditingTitle(true);
              setTitleValue(group.title);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-[13px] hover:bg-accent flex items-center gap-2 text-foreground"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Rename
          </button>

          {/* Auto-fit */}
          <button
            onClick={() => {
              handleAutoFit();
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-[13px] hover:bg-accent flex items-center gap-2 text-foreground"
          >
            <Maximize2 size={14} />
            Fit content
          </button>

          <div className="border-t border-border my-1" />

          {/* Delete */}
          <button
            onClick={() => {
              setShowContextMenu(false);
              if (confirm("Delete this cluster and all its notes?")) {
                onDelete?.(group.id);
              }
            }}
            className="w-full px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-2"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  );
});
