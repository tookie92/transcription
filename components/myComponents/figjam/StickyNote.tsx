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
};

const MIN_STICKY_SIZE = { width: 120, height: 100 };
const MAX_STICKY_SIZE = { width: 600, height: 600 };
const HEADER_HEIGHT = 32;
const FOOTER_HEIGHT = 36;
const PADDING = 12;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

// ─── Props ──────────────────────────────────────────────────────────────────

interface StickyNoteProps {
  note: StickyNoteData;
  zoom: number;
  isSelected: boolean;
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
    if (!text.trim()) return MAX_FONT_SIZE;
    
    // Simple heuristic based on content length and container size
    const charCount = text.length;
    const area = containerWidth * containerHeight;
    
    // More characters = smaller font
    let calculatedSize = MAX_FONT_SIZE;
    if (charCount > 200) calculatedSize = 12;
    else if (charCount > 100) calculatedSize = 14;
    else if (charCount > 50) calculatedSize = 16;
    else if (charCount > 20) calculatedSize = 18;
    
    // Adjust based on container size
    const minDim = Math.min(containerWidth, containerHeight);
    if (minDim < 150) calculatedSize = Math.min(calculatedSize, 12);
    else if (minDim < 200) calculatedSize = Math.min(calculatedSize, 14);
    
    return calculatedSize;
  }, [text, containerWidth, containerHeight]);

  return fontSize;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StickyNote({
  note,
  zoom,
  isSelected,
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

  const { isDragging, handlePointerDown } = useDraggable({
    id: note.id,
    position: note.position,
    zoom,
    onMove,
    onMoveSelected,
    onDragStart: (id) => {
      onSelect(id, false);
      onBringToFront(id);
      setShowMenu(false);
      onDragStart?.(id);
    },
    onDragEnd: (id) => {
      onDragEnd?.(id);
    },
    disabled: isEditing || isResizing,
    bounds: dragBounds,
    stickyWidth: stickySize.width,
    stickyHeight: stickySize.height,
    selectedIds,
  });

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handlePointerDownWrapper = useCallback(
    (e: React.PointerEvent) => {
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
        left: note.position.x,
        top: note.position.y,
        zIndex: note.zIndex,
        cursor: cursorStyle,
        filter: isDragging
          ? "drop-shadow(4px 8px 16px rgba(0,0,0,0.25))"
          : isSelected
          ? "drop-shadow(0 4px 12px rgba(0,0,0,0.15))"
          : "drop-shadow(0 2px 8px rgba(0,0,0,0.1))",
        transform: isDragging ? "rotate(-2deg) scale(1.02)" : "rotate(0deg)",
        transition: isDragging ? "none" : "transform 0.15s ease, filter 0.15s ease",
      }}
      onPointerDown={handlePointerDownWrapper}
      onDoubleClick={handleDoubleClick}
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
              className="w-full h-full resize-none outline-none bg-transparent text-sm"
              style={{
                color: colors.text,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: Math.max(MIN_FONT_SIZE, fontSize),
                lineHeight: 1.5,
              }}
              value={note.content}
              onChange={(e) => onUpdate(note.id, { content: e.target.value })}
              onBlur={handleBlur}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              ref={textRef}
              className="w-full h-full overflow-hidden break-words whitespace-pre-wrap text-sm"
              style={{
                color: note.content ? colors.text : "#aaa",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: Math.max(MIN_FONT_SIZE, fontSize),
                lineHeight: 1.5,
              }}
            >
              {note.content || (
                <span className="opacity-60">Double-click to edit</span>
              )}
            </div>
          )}
        </div>

        {/* Footer: author + vote badge */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3"
          style={{ height: FOOTER_HEIGHT }}
        >
          {note.author && (
            <span 
              className="text-[10px] font-medium truncate max-w-[120px] opacity-60"
              style={{ color: colors.text }}
            >
              {note.author}
            </span>
          )}
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
}: {
  onColorChange: (color: StickyColor) => void;
  currentColor: StickyColor;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringFront: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div
        className="absolute right-0 top-10 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[180px] overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Color picker section */}
        <div className="px-3 pb-2 mb-1 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-2 font-medium">Color</p>
          <div className="flex gap-1.5">
            {(Object.keys(STICKY_COLORS) as StickyColor[]).map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                style={{
                  background: STICKY_COLORS[c].bg,
                  border: currentColor === c ? "2px solid #0d99ff" : "1px solid rgba(0,0,0,0.1)",
                  boxShadow: currentColor === c ? "0 0 0 2px rgba(13, 153, 255, 0.3)" : "none",
                }}
                onClick={() => {
                  onColorChange(c);
                  onClose();
                }}
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
            className={`w-full flex items-center justify-between gap-4 px-4 py-2 text-sm text-left transition-colors ${
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-gray-700 hover:bg-gray-50"
            }`}
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
