"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu";
import type { SectionData, DotData } from "@/types/figjam";
import type { DotVote } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trophy } from "lucide-react";

export const SECTION_COLORS = [
  { bg: "#e8f4fd", border: "#90CAF9", label: "Blue"   },
  { bg: "#e8f5e9", border: "#A5D6A7", label: "Green"  },
  { bg: "#fce4ec", border: "#F48FB1", label: "Pink"   },
  { bg: "#fff8e1", border: "#FFE082", label: "Yellow" },
  { bg: "#f3e5f5", border: "#CE93D8", label: "Purple" },
  { bg: "#fbe9e7", border: "#FFAB91", label: "Orange" },
  { bg: "#f5f5f5", border: "#E0E0E0", label: "Gray"   },
];

interface SectionProps {
  section: SectionData;
  dots?: (DotData | DotVote)[];
  voteCount?: number;
  hasUserVoted?: boolean;
  zoom: number;
  isSelected: boolean;
  isHovered?: boolean;
  isVotingMode?: boolean;
  isRevealed?: boolean;
  isLocked?: boolean;
  lockedByName?: string;
  onSelect: (id: string, multi: boolean) => void;
  onMoveWithChildren: (sectionId: string, dx: number, dy: number) => void;
  onMoveSelected?: (ids: string[], dx: number, dy: number) => void;
  onUpdate: (id: string, patch: Partial<SectionData>) => void;
  onDelete: (id: string) => void;
  onArrangeSection: (sectionId: string) => void;
  renameTrigger?: string | null;
  selectedIds?: string[];
  onRemoveDot?: (dotId: string) => void;
  onHoverChange?: (isHovered: boolean) => void;
}

export function Section({
  section,
  dots = [],
  voteCount = 0,
  hasUserVoted = false,
  zoom,
  isSelected,
  isHovered = false,
  isVotingMode = false,
  isRevealed = false,
  isLocked = false,
  lockedByName,
  onSelect,
  onMoveWithChildren,
  onMoveSelected,
  onUpdate,
  onDelete,
  onArrangeSection,
  renameTrigger,
  selectedIds = [],
  onRemoveDot,
  onHoverChange,
}: SectionProps) {
  const [isHoveredLocal, setIsHoveredLocal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const lastRenameTrigger = useRef<string | null>(null);

  if (renameTrigger !== lastRenameTrigger.current) {
    lastRenameTrigger.current = renameTrigger ?? null;
    if (renameTrigger === section.id && !isEditingTitle) {
      setIsEditingTitle(true);
      setTimeout(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
      }, 0);
    }
  }

  const colorConfig =
    SECTION_COLORS.find((c) => c.bg === section.color) ?? SECTION_COLORS[0];

  const autoResize = section.autoResize ?? false;

  const lastClickTime = useRef(0);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isLocked || isEditingTitle) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      const isOnTitle = target.closest('span');
      const now = Date.now();
      const isDoubleClick = isOnTitle && (now - lastClickTime.current < 300);
      lastClickTime.current = now;

      if (isDoubleClick) return;

      e.stopPropagation();

      const multi = e.shiftKey || e.ctrlKey || e.metaKey;

      if (multi) {
        onSelect(section.id, true);
        return;
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      onSelect(section.id, false);

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      let lastDx = 0;
      let lastDy = 0;

      const isMultiSelect = selectedIds.length > 1 && selectedIds.includes(section.id);

      const onMovePtr = (mv: PointerEvent) => {
        if (!isDraggingRef.current) {
          const totalDx = (mv.clientX - startClientX) / zoom;
          const totalDy = (mv.clientY - startClientY) / zoom;
          const totalMoved = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
          if (totalMoved < 3) return;
          isDraggingRef.current = true;
          setIsDragging(true);
        }

        const totalDx = (mv.clientX - startClientX) / zoom;
        const totalDy = (mv.clientY - startClientY) / zoom;
        const frameDx = totalDx - lastDx;
        const frameDy = totalDy - lastDy;
        lastDx = totalDx;
        lastDy = totalDy;

        if (isMultiSelect && onMoveSelected) {
          onMoveSelected(selectedIds, frameDx, frameDy);
        } else {
          onMoveWithChildren(section.id, frameDx, frameDy);
        }
      };

      const onUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        window.removeEventListener("pointermove", onMovePtr);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMovePtr);
      window.addEventListener("pointerup", onUp);
    },
    [isEditingTitle, section.id, zoom, onSelect, onMoveWithChildren, onMoveSelected, selectedIds]
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = section.size.width;
      const startH = section.size.height;

      const onMovePtr = (mv: PointerEvent) => {
        const newW = Math.max(200, startW + (mv.clientX - startX) / zoom);
        const newH = Math.max(120, startH + (mv.clientY - startY) / zoom);
        onUpdate(section.id, { size: { width: newW, height: newH } });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMovePtr);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMovePtr);
      window.addEventListener("pointerup", onUp);
    },
    [section.id, section.size, zoom, onUpdate]
  );

  const border = isSelected
    ? "2px solid #0d99ff"
    : isVotingMode && hasUserVoted
    ? "2px dashed #86efac"
    : isHovered
    ? `2px dashed ${colorConfig.border}`
    : `2px solid ${colorConfig.border}`;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="absolute"
          data-section-id={section.id}
          style={{
            left:   section.position.x,
            top:    section.position.y,
            width:  section.size.width,
            height: section.size.height,
            zIndex: section.zIndex,
            filter: isDragging ? "drop-shadow(0 8px 24px rgba(0,0,0,0.12))" : "none",
            transition: isDragging ? "none" : "filter 0.2s ease",
          }}
          onMouseEnter={() => {
            setIsHoveredLocal(true);
            onHoverChange?.(true);
          }}
          onMouseLeave={() => {
            setIsHoveredLocal(false);
            onHoverChange?.(false);
          }}
        >
          <div
            className="w-full h-full rounded-xl flex flex-col"
            style={{
              background: colorConfig.bg,
              border,
              cursor: isDragging ? "grabbing" : "grab",
              boxShadow: isHovered ? `0 0 0 3px ${colorConfig.border}88` : "none",
              transition: "box-shadow 0.15s ease, border 0.15s ease",
            }}
            onPointerDown={handlePointerDown}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-t-xl shrink-0"
              style={{
                background:   colorConfig.border + "44",
                borderBottom: `1px solid ${colorConfig.border}`,
                height: 40,
              }}
            >
              {!isVotingMode && (
                <div className="relative shrink-0">
                  <button
                    className="w-4 h-4 rounded-full border border-white/60 shadow-sm hover:scale-110 transition-transform"
                    style={{ background: colorConfig.border }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorPicker((v) => !v);
                    }}
                  />
                  {showColorPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onPointerDown={() => setShowColorPicker(false)} />
                      <div
                        className="absolute left-0 top-6 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex gap-1.5"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {SECTION_COLORS.map((c) => (
                          <button
                            key={c.bg}
                            title={c.label}
                            className="w-5 h-5 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
                            style={{ background: c.border }}
                            onClick={() => {
                              onUpdate(section.id, { color: c.bg });
                              setShowColorPicker(false);
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Vote count badge - shown when revealed */}
              {(isRevealed || voteCount > 0) && isVotingMode && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 hover:bg-white shadow-sm transition-colors"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-bold text-gray-700">{voteCount}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" side="top" align="start">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Vote Details</p>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm font-medium">{voteCount} votes</span>
                      </div>
                      {dots.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {dots.map((dot, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full border border-white shadow-sm"
                              style={{ backgroundColor: dot.color }}
                              title={`Vote from user`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {isEditingTitle ? (
                <input
                  ref={titleRef}
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-700 min-w-0"
                  value={section.title}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdate(section.id, { title: e.target.value })}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") setIsEditingTitle(false);
                  }}
                />
              ) : (
                <span
                  className="flex-1 text-sm font-semibold text-gray-700 truncate select-none"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                    setTimeout(() => titleRef.current?.focus(), 0);
                  }}
                >
                  {section.title}
                </span>
              )}

              {!isVotingMode && (
                <>
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onArrangeSection(section.id);
                    }}
                    title="Arrange"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                    </svg>
                  </button>

                  <button
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs shrink-0"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(section.id);
                    }}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>

            {/* Vote count badge - show on hover after voting ends */}
            {!isVotingMode && voteCount > 0 && isHoveredLocal && (
              <div className="absolute -top-3 left-4 z-20">
                <div className="px-2 py-1 rounded-full bg-green-500 text-white text-xs font-bold shadow-lg flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                  {voteCount} vote{voteCount > 1 ? "s" : ""}
                </div>
              </div>
            )}

            {/* Dots - positioned randomly within section */}
            {dots.map((dot) => {
              const dotId = "id" in dot ? dot.id : dot._id;
              return (
                <div
                  key={dotId}
                  className={`absolute rounded-full border-2 border-white shadow-md transition-all ${
                    isVotingMode 
                      ? "w-7 h-7 cursor-pointer hover:scale-110 hover:brightness-110" 
                      : "w-6 h-6"
                  }`}
                  style={{
                    backgroundColor: dot.color,
                    left: dot.position.x - section.position.x,
                    top: dot.position.y - section.position.y,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isVotingMode) {
                      onRemoveDot?.(dotId);
                    }
                  }}
                />
              );
            })}

            <div
              className="absolute bottom-2 left-3 text-[10px] text-gray-300 select-none pointer-events-none"
              style={{ fontFamily: "monospace" }}
            >
              {Math.round(section.size.width)} × {Math.round(section.size.height)}
            </div>
          </div>

          <div
            className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center cursor-se-resize z-10 rounded-br-xl"
            style={{ transform: "translate(20%, 20%)" }}
            onPointerDown={handleResizePointerDown}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 8 L8 8 L8 2" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("renameSection", { detail: section.id }));
          }
        }}>
          Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onArrangeSection(section.id)}>
          Arrange stickies
        </ContextMenuItem>
        <ContextMenuCheckboxItem
          checked={autoResize}
          onCheckedChange={(checked) => onUpdate(section.id, { autoResize: checked })}
        >
          Auto-resize
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
          Change color
        </ContextMenuLabel>
        <div className="flex gap-1 px-2 py-1.5">
          {SECTION_COLORS.map((c) => (
            <button
              key={c.bg}
              className="w-5 h-5 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
              style={{ background: c.border }}
              onClick={() => onUpdate(section.id, { color: c.bg })}
            />
          ))}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("duplicateSection", { detail: section.id }));
          }
        }}>
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onSelect={() => onDelete(section.id)}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
