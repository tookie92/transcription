"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StickyNoteData, StickyColor, Size } from "@/types/figjam";
import { useDraggable } from "@/hooks/useDraggable";

// ─── Color palette (FigJam authentic) ────────────────────────────────────────

export const STICKY_COLORS: Record<
  StickyColor,
  { bg: string; header: string; text: string; accent: string; shadow: string }
> = {
  yellow:  { bg: "#FFF59D", header: "#FFF176", text: "#3E2723", accent: "#F9A825", shadow: "rgba(255, 193, 7, 0.3)" },
  pink:    { bg: "#F8BBD9", header: "#F48FB1", text: "#4A148C", accent: "#E91E63", shadow: "rgba(233, 30, 99, 0.25)" },
  green:   { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047", shadow: "rgba(76, 175, 80, 0.25)" },
  blue:    { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2", shadow: "rgba(25, 118, 210, 0.25)" },
  purple:  { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA", shadow: "rgba(142, 36, 170, 0.25)" },
  orange:  { bg: "#FFE0B2", header: "#FFCC80", text: "#E65100", accent: "#FB8C00", shadow: "rgba(251, 140, 0, 0.25)" },
  white:   { bg: "#FAFAFA", header: "#EEEEEE", text: "#424242", accent: "#757575", shadow: "rgba(0, 0, 0, 0.1)" },
  // Insight type colors
  "pain-point":  { bg: "#FFCDD2", header: "#EF9A9A", text: "#B71C1C", accent: "#E53935", shadow: "rgba(229, 57, 53, 0.25)" },
  "quote":       { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA", shadow: "rgba(142, 36, 170, 0.25)" },
  "insight":     { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047", shadow: "rgba(76, 175, 80, 0.25)" },
  "follow-up":   { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2", shadow: "rgba(25, 118, 210, 0.25)" },
};

const INSIGHT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  "pain-point": { label: "Pain Point", color: "#E53935" },
  "quote": { label: "Quote", color: "#8E24AA" },
  "insight": { label: "Insight", color: "#43A047" },
  "follow-up": { label: "Follow-up", color: "#1976D2" },
};

function InsightTypeBadge({ type }: { type: string }) {
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

const MIN_STICKY_SIZE = { width: 140, height: 120 };
const MAX_STICKY_SIZE = { width: 600, height: 600 };
const HEADER_HEIGHT = 28;
const FOOTER_HEIGHT = 32;
const PADDING = 12;
const BASE_FONT_SIZE = 14;
const LINE_HEIGHT = 1.5;

// ─── Props ──────────────────────────────────────────────────────────────────

interface StickyNoteProps {
  note: StickyNoteData;
  zoom: number;
  isSelected: boolean;
  isVotingMode?: boolean;
  isLocked?: boolean;
  lockedByName?: string;
  isFiltered?: boolean;
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
  selectedIds?: string[];
  clusterLabel?: string;
  clusterBounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
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
  selectedIds = [],
  isLocked = false,
  lockedByName,
  clusterLabel,
  clusterBounds,
  isFiltered = false,
}: StickyNoteProps) {
  const colors = STICKY_COLORS[note.color];
  const stickySize = note.size ?? { width: 180, height: 160 };
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(note.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLDivElement>(null);

  // Check if content overflows
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [editorHeight, setEditorHeight] = useState<number | null>(null);

  // Sync editingContent when note.content changes from outside
  useEffect(() => {
    if (!isEditing) {
      setEditingContent(note.content);
    }
  }, [note.content, isEditing]);

  // Measure if text overflows
  useEffect(() => {
    if (!textMeasureRef.current || !contentAreaRef.current || isEditing) {
      setIsOverflowing(false);
      return;
    }

    const measureEl = textMeasureRef.current;
    const contentArea = contentAreaRef.current;
    const availableHeight = contentArea.clientHeight;

    // Small delay to ensure DOM is updated
    requestAnimationFrame(() => {
      const actualHeight = measureEl.scrollHeight;
      setIsOverflowing(actualHeight > availableHeight + 4);
    });
  }, [note.content, stickySize, isEditing]);

  // Auto-grow textarea while editing
  useEffect(() => {
    if (!isEditing || !textareaRef.current) {
      setEditorHeight(null);
      return;
    }

    const textarea = textareaRef.current;
    const updateHeight = () => {
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 60;
      const maxHeight = 400;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      setEditorHeight(newHeight);
    };

    updateHeight();

    // Update on content change
    const observer = new ResizeObserver(updateHeight);
    observer.observe(textarea);

    return () => observer.disconnect();
  }, [isEditing, editingContent]);

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
    stickyWidth: stickySize.width,
    stickyHeight: stickySize.height,
    selectedIds,
    bounds: clusterBounds ?? undefined,
  });

  const isDragging = isDraggingRef.current;

  const handleDoubleClick = useCallback(() => {
    if (isLocked) return;
    setIsEditing(true);
    setIsExpanded(true);
    setEditingContent(note.content);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
  }, [isLocked, note.content]);

  const finishEditing = useCallback(() => {
    if (editingContent !== note.content) {
      onUpdate(note.id, { content: editingContent });
    }
    setIsEditing(false);
    // Keep expanded if content is still long
    if (textMeasureRef.current && contentAreaRef.current) {
      const measureEl = textMeasureRef.current;
      const contentArea = contentAreaRef.current;
      requestAnimationFrame(() => {
        const actualHeight = measureEl.scrollHeight;
        const availableHeight = contentArea.clientHeight;
        if (actualHeight <= availableHeight + 4) {
          setIsExpanded(false);
        }
      });
    }
  }, [editingContent, note.content, note.id, onUpdate]);

  const handlePointerDownWrapper = useCallback(
    (e: React.PointerEvent) => {
      if (isLocked) return;
      e.stopPropagation();

      const multi = e.shiftKey || e.ctrlKey || e.metaKey;

      if (multi) {
        onSelect(note.id, true);
        return;
      }

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

  // Calculate content area height
  const contentHeight = stickySize.height - HEADER_HEIGHT - FOOTER_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="absolute group sticky-note"
      data-sticky-id={note.id}
      style={{
        left: visualPosition.x,
        top: visualPosition.y,
        zIndex: note.zIndex,
        cursor: isVotingMode ? "default" : cursorStyle,
        filter: isDragging
          ? `drop-shadow(6px 12px 20px ${colors.shadow})`
          : isSelected
          ? `drop-shadow(0 4px 16px ${colors.shadow})`
          : `drop-shadow(0 2px 8px rgba(0,0,0,0.08))`,
        transform: isDragging ? "rotate(-2deg) scale(1.02)" : "rotate(0deg)",
        transition: isDragging ? "none" : "transform 0.2s ease, filter 0.2s ease",
        opacity: isVotingMode ? 0.85 : isFiltered ? 0.25 : 1,
        pointerEvents: isFiltered ? "none" as const : "auto" as const,
      }}
      onPointerDown={isFiltered ? undefined : handlePointerDownWrapper}
      onDoubleClick={handleDoubleClick}
    >
      {/* Card body */}
      <div
        className="relative overflow-hidden"
        style={{
          width: stickySize.width,
          height: isExpanded && isEditing ? undefined : stickySize.height,
          minHeight: stickySize.height,
          background: colors.bg,
          borderRadius: 6,
          outline: isSelected ? `2px solid ${colors.accent}` : "1px solid rgba(0,0,0,0.06)",
          outlineOffset: 2,
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMenu(true);
        }}
      >
        {/* Lock indicator */}
        {isLocked && lockedByName && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-amber-100/90 backdrop-blur-sm rounded-md text-xs text-amber-800 z-10 shadow-sm"
            title={`Verrouillé par ${lockedByName}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span className="font-medium">{lockedByName}</span>
          </div>
        )}

        {/* Cluster badge */}
        {clusterLabel && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium opacity-60 hover:opacity-100 transition-opacity max-w-[80%] group/cluster"
            style={{
              backgroundColor: `${colors.accent}20`,
              color: colors.accent,
              border: `1px solid ${colors.accent}40`,
            }}
            title={`Cluster: ${clusterLabel}`}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span className="truncate">{clusterLabel}</span>
          </div>
        )}

        {/* Text content area */}
        <div
          ref={contentAreaRef}
          className="absolute left-0 right-0 flex flex-col"
          style={{
            top: HEADER_HEIGHT,
            bottom: FOOTER_HEIGHT,
            padding: `0 ${PADDING}px`,
          }}
        >
          {isEditing ? (
            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                ref={textareaRef}
                className="w-full resize-none outline-none bg-transparent flex-shrink-0"
                style={{
                  color: colors.text,
                  fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
                  fontSize: BASE_FONT_SIZE,
                  lineHeight: LINE_HEIGHT,
                  minHeight: editorHeight ?? 60,
                  maxHeight: 400,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditingContent(note.content);
                    finishEditing();
                  }
                  // Don't stop propagation for normal typing
                  if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
                    e.preventDefault();
                    finishEditing();
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Écrivez votre insight..."
              />
            </div>
          ) : (
            <div
              className="relative w-full h-full cursor-text"
              onClick={() => {
                if (!isLocked) {
                  setIsEditing(true);
                  setIsExpanded(true);
                  setEditingContent(note.content);
                  setTimeout(() => {
                    textareaRef.current?.focus();
                    textareaRef.current?.select();
                  }, 0);
                }
              }}
            >
              {/* Hidden measure element - always full height */}
              <div
                ref={textMeasureRef}
                className="absolute inset-0 overflow-visible pointer-events-none"
                style={{
                  color: colors.text,
                  fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
                  fontSize: BASE_FONT_SIZE,
                  lineHeight: LINE_HEIGHT,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  visibility: "hidden",
                }}
              >
                {note.content || " "}
              </div>

              {/* Visible text with truncation */}
              <div
                className={`w-full h-full break-words whitespace-pre-wrap ${
                  isOverflowing && !isExpanded ? "overflow-hidden" : "overflow-hidden"
                }`}
                style={{
                  color: note.content ? colors.text : `${colors.text}60`,
                  fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
                  fontSize: BASE_FONT_SIZE,
                  lineHeight: LINE_HEIGHT,
                  display: "-webkit-box",
                  WebkitLineClamp: isOverflowing && !isExpanded ? undefined : undefined,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {note.content || (
                  <span className="italic">Double-cliquez pour éditer</span>
                )}
              </div>

              {/* Truncation indicator with gradient fade */}
              {isOverflowing && !isExpanded && !isEditing && (
                <button
                  className="absolute bottom-0 left-0 right-0 pt-6 cursor-pointer group/btn"
                  style={{
                    background: `linear-gradient(to top, ${colors.bg} 30%, transparent)`,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                >
                  <div
                    className="flex items-center justify-center gap-1 py-1 text-xs font-medium transition-transform group-hover/btn:scale-105"
                    style={{ color: colors.accent }}
                  >
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${colors.accent}15`,
                      }}
                    >
                      ...
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="opacity-0 group-hover/btn:opacity-100 transition-opacity"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Expanded state - show collapse button */}
              {isExpanded && !isEditing && isOverflowing && (
                <button
                  className="absolute bottom-0 right-0 cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                >
                  <div
                    className="flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-medium transition-all hover:scale-105"
                    style={{
                      color: colors.accent,
                      backgroundColor: `${colors.accent}15`,
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer: author + source badge */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3"
          style={{ height: FOOTER_HEIGHT }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {note.authorName && (
              <span
                className="text-[10px] font-medium truncate opacity-60"
                style={{ color: colors.text }}
                title={note.authorName}
              >
                {note.authorName}
              </span>
            )}
            {note.source && (note.source === "pain-point" || note.source === "quote" || note.source === "insight" || note.source === "follow-up") && (
              <InsightTypeBadge type={note.source} />
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 flex items-center justify-end cursor-se-resize z-10 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
          style={{ padding: "0 4px 4px 0" }}
          onPointerDown={handleResizePointerDown}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 8 L8 8 L8 2" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <ContextMenu
          currentColor={note.color}
          onColorChange={(color, type) => onUpdate(note.id, { color, source: type })}
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
  onColorChange: (color: StickyColor, type: string) => void;
  currentColor: StickyColor;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringFront: () => void;
  onClose: () => void;
  isLocked?: boolean;
}) {
  const insightTypes: { id: StickyColor; label: string; desc: string }[] = [
    { id: "pain-point", label: "Pain Point", desc: "Problèmes" },
    { id: "insight", label: "Insight", desc: "Découvertes" },
    { id: "quote", label: "Quote", desc: "Citations" },
    { id: "follow-up", label: "Follow-up", desc: "À suivre" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div
        className="absolute right-0 top-8 z-50 bg-card rounded-xl shadow-2xl border border-border p-2 min-w-[200px]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isLocked && (
          <div className="flex items-center gap-2 px-2 py-1 mb-2 text-xs text-amber-600 bg-amber-50 rounded-lg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
            </svg>
            Verrouillé par un autre utilisateur
          </div>
        )}

        {/* Type d'insight */}
        <div className="text-xs font-medium text-muted-foreground px-2 pb-2">Type</div>
        <div className="space-y-1 mb-2">
          {insightTypes.map((type) => (
            <button
              key={type.id}
              disabled={isLocked}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
              } ${currentColor === type.id ? "bg-accent" : ""}`}
              onClick={() => {
                if (isLocked) return;
                onColorChange(type.id, type.id);
                onClose();
              }}
            >
              <div
                className="w-5 h-5 rounded"
                style={{ backgroundColor: STICKY_COLORS[type.id].bg }}
              />
              <div className="text-left">
                <div className="text-sm font-medium">{type.label}</div>
                <div className="text-[10px] text-muted-foreground">{type.desc}</div>
              </div>
              {currentColor === type.id && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-primary">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="border-t border-border pt-2 mt-1 space-y-1">
          <button
            disabled={isLocked}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
              isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent text-foreground"
            }`}
            onClick={onDuplicate}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Dupliquer</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘D</span>
          </button>
          <button
            disabled={isLocked}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
              isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent text-foreground"
            }`}
            onClick={onBringFront}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M4 16V4a2 2 0 0 1 2-2h12" />
            </svg>
            <span>Mettre au premier plan</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={onDelete}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Supprimer</span>
            <span className="ml-auto text-xs text-muted-foreground">⌫</span>
          </button>
        </div>
      </div>
    </>
  );
}
