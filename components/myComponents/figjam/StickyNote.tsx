"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StickyNoteData, StickyColor, Size } from "@/types/figjam";
import { useDraggable } from "@/hooks/useDraggable";

// ─── Color palette (FigJam authentic) ────────────────────────────────────────

export const STICKY_COLORS: Record<
  StickyColor,
  { bg: string; header: string; text: string; accent: string }
> = {
  yellow:  { bg: "#FFF59D", header: "#FFF176", text: "#3E2723", accent: "#F9A825" },
  pink:    { bg: "#F8BBD9", header: "#F48FB1", text: "#4A148C", accent: "#E91E63" },
  green:   { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047" },
  blue:    { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2" },
  purple:  { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA" },
  orange:  { bg: "#FFE0B2", header: "#FFCC80", text: "#E65100", accent: "#FB8C00" },
  white:   { bg: "#FAFAFA", header: "#EEEEEE", text: "#424242", accent: "#757575" },
  // Insight type colors
  "pain-point":  { bg: "#FFCDD2", header: "#EF9A9A", text: "#B71C1C", accent: "#E53935" },
  "quote":        { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA" },
  "insight":     { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047" },
  "follow-up":   { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2" },
};

const INSIGHT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  "pain-point": { label: "Pain Point", color: "#E53935" },
  "quote": { label: "Quote", color: "#8E24AA" },
  "insight": { label: "Insight", color: "#43A047" },
  "follow-up": { label: "Follow-up", color: "#1976D2" },
};

function InsightTypeBadge({ type, colors }: { type: string; colors: { text: string } }) {
  const info = INSIGHT_TYPE_LABELS[type];
  if (!info) return null;
  
  return (
    <span 
      className="text-[9px] px-1.5 py-0.5 rounded font-medium truncate"
      style={{ 
        color: info.color,
        backgroundColor: `${info.color}15`,
        border: `1px solid ${info.color}30`,
      }}
      title={info.label}
    >
      {info.label}
    </span>
  );
}

const MIN_STICKY_SIZE = { width: 120, height: 100 };
const MAX_STICKY_SIZE = { width: 600, height: 600 };
const HEADER_HEIGHT = 32;
const FOOTER_HEIGHT = 36;
const PADDING = 12;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 20;

// ─── Props ──────────────────────────────────────────────────────────────────

interface StickyNoteProps {
  note: StickyNoteData;
  zoom: number;
  isSelected: boolean;
  isVotingMode?: boolean;
  isLocked?: boolean;
  lockedByName?: string;
  onSelect: (id: string, multi: boolean) => void;
  onMove: (id: string, pos: { x: number; y: number }) => void;
  onMoveSelected?: (ids: string[], dx: number, dy: number) => void;
  onUpdate: (id: string, patch: Partial<StickyNoteData>) => void;
  onResize: (id: string, size: Size) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onBringToFront: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  dragBounds?: { minX: number; minY: number; maxX: number; maxY: number };
  selectedIds?: string[];
}

// ─── Auto-sizing text hook (simplified) ─────────────────────────────────────

function useAutoFontSize(text: string, containerWidth: number, containerHeight: number): number {
  const fontSize = useMemo(() => {
    // Fixed font size - more readable
    return 16;
  }, [text, containerWidth, containerHeight]);

  return fontSize;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StickyNote({
  note,
  zoom,
  isSelected,
  isVotingMode = false,
  onSelect,
  onMove,
  onMoveSelected,
  onUpdate,
  onResize,
  onDelete,
  onDuplicate,
  onBringToFront,
  onDragStart,
  onDragEnd,
  dragBounds,
  selectedIds = [],
  isLocked = false,
  lockedByName,
}: StickyNoteProps) {
  const colors = STICKY_COLORS[note.color];
  const stickySize = note.size ?? { width: 200, height: 200 };
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate text area dimensions
  const textAreaHeight = stickySize.height - HEADER_HEIGHT - FOOTER_HEIGHT - PADDING * 2;
  const textAreaWidth = stickySize.width - PADDING * 2;

  // Auto-size font to fit
  const fontSize = useAutoFontSize(note.content, textAreaWidth, textAreaHeight);

  const isDraggingRef = useRef(false);
  const { visualPosition, handlePointerDown } = useDraggable({
    id: note.id,
    position: note.position,
    zoom,
    onMove,
    onMoveSelected,
    onDragStart: (id) => {
      if (isLocked) return;
      isDraggingRef.current = true;
      onSelect(id, false);
      onBringToFront(id);
      setShowMenu(false);
      onDragStart?.(id);
    },
    onDragEnd: (id) => {
      isDraggingRef.current = false;
      onDragEnd?.(id);
    },
    disabled: isEditing || isResizing || isLocked,
    bounds: dragBounds,
    stickyWidth: stickySize.width,
    stickyHeight: stickySize.height,
    selectedIds,
  });

  const isDragging = isDraggingRef.current;

  const handleDoubleClick = useCallback(() => {
    if (isLocked) return;
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handlePointerDownWrapper = useCallback(
    (e: React.PointerEvent) => {
      if (isLocked) return;
      
      const multi = e.shiftKey || e.ctrlKey || e.metaKey;

      // For multi-select (Ctrl+click), select but don't start dragging
      if (multi) {
        e.stopPropagation();
        onSelect(note.id, true);
        return;
      }

      // Normal click - select and start dragging
      onSelect(note.id, false);
      handlePointerDown(e);
    },
    [note.id, onSelect, handlePointerDown]
  );

  // ── Resize handle ────────────────────────────────────────────────────────

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsResizing(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = stickySize.width;
      const startH = stickySize.height;

      const onMovePtr = (mv: PointerEvent) => {
        const dx = (mv.clientX - startX) / zoom;
        const dy = (mv.clientY - startY) / zoom;
        const newW = Math.max(MIN_STICKY_SIZE.width, Math.min(MAX_STICKY_SIZE.width, startW + dx));
        const newH = Math.max(MIN_STICKY_SIZE.height, Math.min(MAX_STICKY_SIZE.height, startH + dy));
        onResize(note.id, { width: newW, height: newH });
      };

      const onUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", onMovePtr);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMovePtr);
      window.addEventListener("pointerup", onUp);
    },
    [note.id, stickySize, zoom, onResize]
  );

  const cursorStyle = isEditing
    ? "text"
    : isDragging
    ? "grabbing"
    : isResizing
    ? "se-resize"
    : "grab";

  return (
    <div
      ref={containerRef}
      className="absolute group"
      style={{
        left: visualPosition.x,
        top: visualPosition.y,
        zIndex: note.zIndex,
        cursor: isVotingMode ? "default" : cursorStyle,
        opacity: isVotingMode ? 0.6 : 1,
        pointerEvents: isVotingMode ? "none" : "auto",
        filter: isDragging
          ? "drop-shadow(4px 8px 16px rgba(0,0,0,0.25))"
          : isSelected
          ? "drop-shadow(0 4px 12px rgba(0,0,0,0.15))"
          : "drop-shadow(0 2px 8px rgba(0,0,0,0.1))",
        transform: isDragging ? "rotate(-2deg) scale(1.02)" : "rotate(0deg)",
        transition: "none",
      }}
      onPointerDown={isVotingMode ? undefined : handlePointerDownWrapper}
      onDoubleClick={isVotingMode ? undefined : handleDoubleClick}
    >
      {/* Card body */}
      <div
        className="relative overflow-hidden"
        style={{
          width: stickySize.width,
          height: stickySize.height,
          background: colors.bg,
          borderRadius: 4,
          outline: isSelected ? "2px solid #0d99ff" : "1px solid rgba(0,0,0,0.08)",
          outlineOffset: 2,
        }}
      >
        {/* Minimal header - just menu button */}
        <div
          className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ height: HEADER_HEIGHT }}
        >
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-black/10"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-gray-500">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
        </div>

        {/* Lock indicator */}
        {isLocked && lockedByName && (
          <div 
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-amber-100 rounded text-xs text-amber-800 z-10"
            title={`Locked by ${lockedByName}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span className="font-medium">{lockedByName}</span>
          </div>
        )}

        {/* Chain indicator (subtle) */}
        {note.parentSectionId && (
          <div 
            className="absolute top-2 left-2 opacity-40" 
            title="Attached to section"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
        )}

        {/* Text area */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: HEADER_HEIGHT,
            bottom: FOOTER_HEIGHT,
            padding: PADDING,
          }}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              className="w-full h-full resize-none outline-none bg-transparent"
              style={{
                color: colors.text,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 16,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
              value={note.content}
              onChange={(e) => {
                onUpdate(note.id, { content: e.target.value });
              }}
              onBlur={() => {
                setIsEditing(false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Type your insight here..."
            />
          ) : (
            <div
              ref={textRef}
              className="w-full h-full overflow-hidden break-words whitespace-pre-wrap text-sm"
              style={{
                color: note.content ? colors.text : "#aaa",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: Math.max(MIN_FONT_SIZE, fontSize),
                lineHeight: 1.6,
              }}
            >
              {note.content || (
                <span className="opacity-60">Double-click to edit</span>
              )}
            </div>
          )}
        </div>

        {/* Footer: author + source + vote badge */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3"
          style={{ height: FOOTER_HEIGHT }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {note.authorName && (
              <span 
                className="text-[10px] font-medium truncate opacity-70"
                style={{ color: colors.text }}
                title={note.authorName}
              >
                {note.authorName}
              </span>
            )}
            {note.source && (note.source === "pain-point" || note.source === "quote" || note.source === "insight" || note.source === "follow-up") && (
              <InsightTypeBadge type={note.source} colors={colors} />
            )}
          </div>
        </div>

        {/* Resize handle (bottom-right corner) */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 flex items-center justify-end cursor-se-resize z-10"
          style={{ padding: "0 4px 4px 0" }}
          onPointerDown={handleResizePointerDown}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 8 L8 8 L8 2" stroke={colors.accent} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <ContextMenu
          currentColor={note.color}
          onColorChange={(color) => onUpdate(note.id, { color })}
          onDuplicate={() => { onDuplicate(note.id); setShowMenu(false); }}
          onDelete={() => { onDelete(note.id); setShowMenu(false); }}
          onBringFront={() => { onBringToFront(note.id); setShowMenu(false); }}
          onClose={() => setShowMenu(false)}
          isLocked={isLocked}
        />
      )}
    </div>
  );
}

function ContextMenu({
  onColorChange,
  currentColor,
  onDuplicate,
  onDelete,
  onBringFront,
  onClose,
  isLocked,
}: {
  onColorChange: (color: StickyColor) => void;
  currentColor: StickyColor;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringFront: () => void;
  onClose: () => void;
  isLocked?: boolean;
}) {
  const insightTypes: StickyColor[] = ["pain-point", "quote", "insight", "follow-up"];

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div
        className="absolute right-0 top-10 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[180px] overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Insight type picker section */}
        <div className="px-3 pb-2 mb-1 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-medium">Insight Type</p>
            {isLocked && (
              <span className="text-[10px] text-amber-600 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                Locked
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {insightTypes.map((c) => (
              <button
                key={c}
                disabled={isLocked}
                className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{
                  background: STICKY_COLORS[c].bg,
                  border: currentColor === c ? "2px solid #0d99ff" : "1px solid rgba(0,0,0,0.1)",
                  boxShadow: currentColor === c ? "0 0 0 2px rgba(13, 153, 255, 0.3)" : "none",
                }}
                onClick={() => {
                  if (isLocked) return;
                  onColorChange(c);
                  onClose();
                }}
                title={c.charAt(0).toUpperCase() + c.slice(1).replace("-", " ")}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        {[
          { label: "Duplicate", shortcut: "⌘D", action: onDuplicate },
          { label: "Bring to front", shortcut: "", action: onBringFront },
          { label: "Delete", shortcut: "⌫", action: onDelete, danger: true },
        ].map((item) => (
          <button
            key={item.label}
            disabled={isLocked && item.label !== "Delete"}
            className={`w-full flex items-center justify-between gap-4 px-4 py-2 text-sm text-left transition-colors ${
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-gray-700 hover:bg-gray-50"
            } ${isLocked && item.label !== "Delete" ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={item.action}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-400">{item.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
