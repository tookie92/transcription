/**
 * FigJam-style Sticky Note Component
 * - Individual colors per note
 * - Right-click context menu for actions
 */

"use client";

import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { Insight } from "@/types";

export const STICKY_COLORS = [
  { name: "Yellow", value: "#FFF4A0" },
  { name: "Green", value: "#C7F2D0" },
  { name: "Pink", value: "#FFD6E8" },
  { name: "Blue", value: "#D6E8FF" },
  { name: "Purple", value: "#E8D6FF" },
  { name: "Orange", value: "#FFE8C7" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#FFCDD2" },
] as const;

export type StickyColor = typeof STICKY_COLORS[number]["value"];

interface StickyNoteProps {
  insight: Insight;
  position: { x: number; y: number };
  isSelected?: boolean;
  isDragging?: boolean;
  scale?: number;
  author?: { name: string; color: string; initials: string };
  votes?: number;
  color?: StickyColor;
  onClick?: (insight: Insight, e: React.MouseEvent) => void;
  onDoubleClick?: (insight: Insight) => void;
  onDragStart?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onDragOver?: (position: { x: number; y: number }) => void;
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
  onColorChange?: (id: string, color: StickyColor) => void;
  onDelete?: (id: string) => void;
  onVote?: (id: string) => void;
  zIndex?: number;
}

export const StickyNote = memo(function StickyNote({
  insight,
  position,
  isSelected = false,
  isDragging = false,
  scale = 1,
  author,
  votes = 0,
  color = STICKY_COLORS[0].value,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onPositionChange,
  onColorChange,
  onDelete,
  onVote,
  zIndex = 10,
}: StickyNoteProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const currentPosRef = useRef(position); // Use ref to avoid closure issue
  const [localPosition, setLocalPosition] = useState(position);
  const [isHovered, setIsHovered] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // Update ref when position changes
  useEffect(() => {
    currentPosRef.current = position;
  }, [position]);

  useEffect(() => {
    setLocalPosition(position);
  }, [position]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      
      onDragStart?.();

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
        currentPosRef.current = newPos; // Keep ref in sync
      };

      const handleMouseUp = () => {
        const finalPos = currentPosRef.current;
        if (dragStartRef.current && onPositionChange) {
          onPositionChange(insight.id, finalPos);
        }
        dragStartRef.current = null;
        onDragEnd?.(finalPos);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [localPosition, scale, insight.id, onPositionChange, onDragStart, onDragEnd]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(insight, e);
    },
    [insight, onClick]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(insight);
    },
    [insight, onDoubleClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    },
    []
  );

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <>
      <div
        ref={noteRef}
        className={cn(
          "absolute rounded-[3px] p-3 flex flex-col cursor-grab active:cursor-grabbing select-none transition-shadow",
          isDragging && "opacity-50"
        )}
        style={{
          left: localPosition.x,
          top: localPosition.y,
          width: 180,
          minHeight: 80,
          backgroundColor: color,
          boxShadow: isDragging
            ? "0 25px 50px -12px rgba(0,0,0,0.4)"
            : isHovered
            ? "4px 8px 20px rgba(0,0,0,0.2)"
            : "2px 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
          zIndex: isSelected ? 100 : zIndex,
          transform: isDragging ? "scale(1.02)" : "scale(1)",
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isSelected && (
          <div
            className="absolute inset-0 rounded-[3px] pointer-events-none"
            style={{ outline: "2px solid #9747FF", outlineOffset: 2 }}
          />
        )}

        <p className="text-[13px] font-medium leading-relaxed text-[#1d1d1d] flex-1 break-words whitespace-pre-wrap">
          {insight.text}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2">
          {votes > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#8a8a8a]">
              <span>👍</span>
              <span>{votes}</span>
            </span>
          )}
          <div className="ml-auto" />
          {author && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: author.color }}
            >
              {author.initials}
            </div>
          )}
        </div>
      </div>

      {showContextMenu && (
        <div
          className="fixed z-[200] bg-white rounded-xl shadow-xl border border-[#e8e8e8] py-1 min-w-[160px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] text-[#8a8a8a] font-medium uppercase tracking-wide">
            Change color
          </div>
          <div className="flex gap-1 px-3 py-1.5">
            {STICKY_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  onColorChange?.(insight.id, c.value);
                  setShowContextMenu(false);
                }}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                  color === c.value ? "border-[#1d1d1d]" : "border-transparent"
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <div className="border-t border-[#e8e8e8] my-1" />
          {votes > 0 && (
            <button
              onClick={() => {
                onVote?.(insight.id);
                setShowContextMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f5f5f5] flex items-center gap-2"
            >
              <span>👍</span> Remove vote
            </button>
          )}
          <button
            onClick={() => {
              setShowContextMenu(false);
              onDoubleClick?.(insight);
            }}
            className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f5f5f5] flex items-center gap-2"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit text
          </button>
          <button
            onClick={() => {
              setShowContextMenu(false);
              if (confirm("Delete this note?")) {
                onDelete?.(insight.id);
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
