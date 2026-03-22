"use client";

import React, { useCallback, useRef, useState } from "react";
import type { StickyNoteData, StickyColor } from "@/types/figjam";
import { useDraggable } from "@/hooks/useDraggable";

// ─── Color palette ──────────────────────────────────────────────────────────

export const STICKY_COLORS: Record<
  StickyColor,
  { bg: string; header: string; text: string; dot: string }
> = {
  yellow:  { bg: "#FFF176", header: "#F9E02B", text: "#333",   dot: "#F9C600" },
  pink:    { bg: "#FCE4EC", header: "#F48FB1", text: "#333",   dot: "#E91E63" },
  green:   { bg: "#E8F5E9", header: "#A5D6A7", text: "#333",   dot: "#4CAF50" },
  blue:    { bg: "#E3F2FD", header: "#90CAF9", text: "#333",   dot: "#2196F3" },
  purple:  { bg: "#F3E5F5", header: "#CE93D8", text: "#333",   dot: "#9C27B0" },
  orange:  { bg: "#FFF3E0", header: "#FFCC80", text: "#333",   dot: "#FF9800" },
  white:   { bg: "#FFFFFF", header: "#E0E0E0", text: "#333",   dot: "#9E9E9E" },
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface StickyNoteProps {
  note: StickyNoteData;
  zoom: number;
  isSelected: boolean;
  isVotingMode: boolean;
  currentUserId: string;
  votesUsed: number;
  maxVotes: number;
  onSelect: (id: string, multi: boolean) => void;
  onMove: (id: string, pos: { x: number; y: number }) => void;
  onUpdate: (id: string, patch: Partial<StickyNoteData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onBringToFront: (id: string) => void;
  onCastVote: (id: string) => void;
  onRemoveVote: (id: string) => void;
  /** Called when drag starts — board uses it to highlight the hovered section */
  onDragStart?: (id: string) => void;
  /** Called when drag ends */
  onDragEnd?: (id: string) => void;
  /** Bounds to constrain dragging (when in auto-resize section) */
  dragBounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StickyNote({
  note,
  zoom,
  isSelected,
  isVotingMode,
  currentUserId,
  votesUsed,
  maxVotes,
  onSelect,
  onMove,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onCastVote,
  onRemoveVote,
  onDragStart,
  onDragEnd,
  dragBounds,
}: StickyNoteProps) {
  const colors = STICKY_COLORS[note.color];
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const hasVoted = note.votedBy.includes(currentUserId);
  const canVote = !hasVoted && votesUsed < maxVotes;

  const { isDragging, handlePointerDown } = useDraggable({
    id: note.id,
    position: note.position,
    zoom,
    onMove,
    onDragStart: (id) => {
      onSelect(id, false);
      onBringToFront(id);
      setShowMenu(false);
      onDragStart?.(id);
    },
    onDragEnd: (id) => {
      onDragEnd?.(id);
    },
    disabled: isEditing || isVotingMode,
    bounds: dragBounds,
  });

  const handleDoubleClick = useCallback(() => {
    if (isVotingMode) return;
    setIsEditing(true);
    setTimeout(() => textRef.current?.focus(), 0);
  }, [isVotingMode]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleVoteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasVoted) onRemoveVote(note.id);
      else if (canVote) onCastVote(note.id);
    },
    [hasVoted, canVote, note.id, onCastVote, onRemoveVote]
  );

  const handlePointerDownWrapper = useCallback(
    (e: React.PointerEvent) => {
      if (isVotingMode) {
        e.stopPropagation();
        return;
      }
      onSelect(note.id, e.shiftKey || e.metaKey);
      handlePointerDown(e);
    },
    [isVotingMode, note.id, onSelect, handlePointerDown]
  );

  return (
    <div
      className={`absolute group ${note.parentSectionId ? "ring-2 ring-blue-400/30 ring-offset-1" : ""}`}
      style={{
        left: note.position.x,
        top: note.position.y,
        zIndex: note.zIndex,
        width: 200,
        cursor: isEditing ? "text" : isDragging ? "grabbing" : isVotingMode ? "pointer" : "grab",
        filter: isDragging ? "drop-shadow(0 12px 24px rgba(0,0,0,0.18))" : note.parentSectionId ? "drop-shadow(0 2px 12px rgba(59,130,246,0.25))" : "drop-shadow(0 2px 8px rgba(0,0,0,0.12))",
        transform: isDragging ? "rotate(-1deg) scale(1.03)" : "rotate(0deg) scale(1)",
        transition: isDragging ? "none" : "transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease",
      }}
      onPointerDown={handlePointerDownWrapper}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        if (isVotingMode) {
          e.stopPropagation();
          handleVoteClick(e as any);
        }
      }}
    >
      {/* Card body */}
      <div
        className="rounded-sm overflow-hidden flex flex-col"
        style={{
          width: 200,
          minHeight: 160,
          background: colors.bg,
          outline: isSelected && !isVotingMode ? "2px solid #0d99ff" : "none",
          outlineOffset: 2,
        }}
      >
        {/* Header strip (drag handle) */}
        <div
          className="flex items-center justify-between px-2 shrink-0"
          style={{ background: colors.header, height: 28 }}
        >
          {/* Left side: attach indicator + color dots */}
          <div className="flex items-center gap-1.5">
            {/* Chain icon - shows when attached to a section */}
            {note.parentSectionId && (
              <div 
                className="text-gray-500 hover:text-gray-700 cursor-help"
                title="Attached to section"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
            )}
            
            {/* Color dots */}
            <div className="flex gap-1">
              {(Object.keys(STICKY_COLORS) as StickyColor[]).map((c) => (
                <button
                  key={c}
                  className="w-3 h-3 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                  style={{ background: STICKY_COLORS[c].dot }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(note.id, { color: c });
                  }}
                />
              ))}
            </div>
          </div>

          {/* Context menu trigger */}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-900 w-5 h-5 flex items-center justify-center rounded"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((v) => !v);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
        </div>

        {/* Text area */}
        <div className="flex-1 relative" style={{ minHeight: 120 }}>
          {isEditing ? (
            <textarea
              ref={textRef}
              className="absolute inset-0 w-full h-full resize-none outline-none p-3 text-sm leading-snug bg-transparent"
              style={{ color: colors.text, fontFamily: "'Caveat', cursive, sans-serif", fontSize: 15 }}
              value={note.content}
              onChange={(e) => onUpdate(note.id, { content: e.target.value })}
              onBlur={handleBlur}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className="absolute inset-0 p-3 text-sm leading-snug overflow-hidden break-words whitespace-pre-wrap"
              style={{
                color: note.content ? colors.text : "#aaa",
                fontFamily: "'Caveat', cursive, sans-serif",
                fontSize: 15,
              }}
            >
              {note.content || "Double-click to edit…"}
            </p>
          )}
        </div>

        {/* Footer: vote badge */}
        {(isVotingMode || note.votes > 0) && (
          <div className="flex justify-end p-2 shrink-0">
            <VoteDot
              count={note.votes}
              hasVoted={hasVoted}
              canVote={canVote}
              isVotingMode={isVotingMode}
              onClick={handleVoteClick}
              dotColor={colors.dot}
            />
          </div>
        )}
      </div>

      {/* Context menu */}
      {showMenu && (
        <ContextMenu
          onDuplicate={() => { onDuplicate(note.id); setShowMenu(false); }}
          onDelete={() => { onDelete(note.id); setShowMenu(false); }}
          onBringFront={() => { onBringToFront(note.id); setShowMenu(false); }}
          onClose={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function VoteDot({
  count,
  hasVoted,
  canVote,
  isVotingMode,
  onClick,
  dotColor,
}: {
  count: number;
  hasVoted: boolean;
  canVote: boolean;
  isVotingMode: boolean;
  onClick: (e: React.MouseEvent) => void;
  dotColor: string;
}) {
  return (
    <button
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-bold transition-all"
      style={{
        background: hasVoted ? dotColor : count > 0 ? dotColor + "99" : "#ccc",
        opacity: isVotingMode && !canVote && !hasVoted ? 0.5 : 1,
        cursor: isVotingMode ? (canVote || hasVoted ? "pointer" : "not-allowed") : "default",
        transform: hasVoted ? "scale(1.1)" : "scale(1)",
        boxShadow: hasVoted ? `0 2px 8px ${dotColor}80` : "none",
        pointerEvents: isVotingMode ? "auto" : "none",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="8" r="8"/>
      </svg>
      <span>{count}</span>
    </button>
  );
}

function ContextMenu({
  onDuplicate,
  onDelete,
  onBringFront,
  onClose,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  onBringFront: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />

      <div
        className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[160px]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {[
          { label: "Duplicate", icon: "⧉", action: onDuplicate },
          { label: "Bring to front", icon: "↑", action: onBringFront },
          { label: "Delete", icon: "✕", action: onDelete, danger: true },
        ].map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${item.danger ? "text-red-500 hover:bg-red-50" : "text-gray-700"}`}
            onClick={item.action}
          >
            <span className="text-xs opacity-60">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
