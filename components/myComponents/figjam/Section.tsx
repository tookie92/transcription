/**
 * FigJam-style Section/Frame Component for Clusters
 * - Individual colors
 * - Right-click context menu
 * - Resizable
 */

"use client";

import React, { useState, useCallback, useRef, useEffect, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AffinityGroup as AffinityGroupType } from "@/types";

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
  insights?: Array<{ text: string; type: string }>;
  scale?: number;
  isSelected?: boolean;
  isDropTarget?: boolean;
  onClick?: (group: AffinityGroupType, e: React.MouseEvent) => void;
  onTitleChange?: (id: string, title: string) => void;
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onColorChange?: (id: string, color: SectionColor) => void;
  onDelete?: (id: string) => void;
  autoSize?: { width: number; height: number };
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
  autoSize,
}: SectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const [localPosition, setLocalPosition] = useState(group.position);
  const [localSize, setLocalSize] = useState(autoSize || { width: 400, height: 280 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(group.title);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalPosition(group.position);
  }, [group.position]);

  useEffect(() => {
    if (autoSize) {
      setLocalSize(autoSize);
    }
  }, [autoSize]);

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
      if (e.button !== 0 || isEditingTitle) return;
      e.preventDefault();
      e.stopPropagation();

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
        setLocalPosition({
          x: dragStartRef.current.posX + dx,
          y: dragStartRef.current.posY + dy,
        });
      };

      const handleMouseUp = () => {
        if (dragStartRef.current && onPositionChange) {
          onPositionChange(group.id, localPosition);
        }
        dragStartRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [localPosition, scale, group.id, onPositionChange, isEditingTitle]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: localSize.width,
        height: localSize.height,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeStartRef.current) return;
        const dx = (moveEvent.clientX - resizeStartRef.current.x) / scale;
        const dy = (moveEvent.clientY - resizeStartRef.current.y) / scale;
        setLocalSize({
          width: Math.max(200, resizeStartRef.current.width + dx),
          height: Math.max(150, resizeStartRef.current.height + dy),
        });
      };

      const handleMouseUp = () => {
        if (resizeStartRef.current && onSizeChange) {
          onSizeChange(group.id, localSize);
        }
        resizeStartRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [localSize, scale, group.id, onSizeChange]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(group, e);
    },
    [group, onClick]
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setTitleValue(group.title);
  }, [group.title]);

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

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
      setShowSuggestions(false);
    };
    if (showContextMenu || showSuggestions) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showContextMenu, showSuggestions]);

  const fetchSuggestions = useCallback(async () => {
    if (insights.length === 0) return;
    
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch("/api/suggest-group-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: insights.map(i => ({ text: i.text, type: i.type })),
          currentTitle: group.title,
        }),
      });
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [insights, group.title]);

  const handleSelectSuggestion = useCallback((title: string) => {
    onTitleChange?.(group.id, title);
    setShowSuggestions(false);
    setTitleValue(title);
  }, [group.id, onTitleChange]);

  return (
    <>
      <div
        ref={sectionRef}
        className="absolute transition-shadow"
        style={{
          left: localPosition.x,
          top: localPosition.y,
          width: localSize.width,
          height: localSize.height,
          zIndex: isSelected || isDropTarget ? 5 : 1,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-2xl border-[2.5px] border-dash transition-all",
            (isHovered || isDropTarget) && "shadow-xl"
          )}
          style={{
            borderColor: isDropTarget ? "#9747FF" : isHovered ? colorInfo.value : `${colorInfo.value}80`,
            backgroundColor: isDropTarget ? "rgba(151, 71, 255, 0.15)" : `${colorInfo.value}08`,
            borderStyle: "dashed",
          }}
        />

        {isSelected && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ outline: `2px solid ${colorInfo.value}`, outlineOffset: 4 }}
          />
        )}

        {/* Drop indicator */}
        {(isHovered || isDropTarget) && (
          <div
            className="absolute inset-2 rounded-xl border-2 border-dashed flex items-center justify-center pointer-events-none animate-pulse"
            style={{ borderColor: isDropTarget ? "#9747FF" : `${colorInfo.value}80` }}
          >
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ 
              color: isDropTarget ? "#fff" : colorInfo.value, 
              backgroundColor: isDropTarget ? "#9747FF" : `${colorInfo.value}20` 
            }}>
              {isDropTarget ? "Release to drop" : "Drop here"}
            </span>
          </div>
        )}

        <div
          className="absolute -top-9 left-0 flex items-center gap-2 cursor-move"
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-[13px] font-semibold text-[#1d1d1d] bg-white border border-[#9747FF] rounded px-2 py-0.5 outline-none"
            />
          ) : (
            <span className="text-[13px] font-semibold text-[#1d1d1d]">
              {group.title}
            </span>
          )}

          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: `${colorInfo.value}20`, color: colorInfo.value }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorInfo.value }} />
            {insightCount} {insightCount === 1 ? "idea" : "ideas"}
          </span>

          {insights.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!showSuggestions) {
                  fetchSuggestions();
                }
              }}
              disabled={isLoadingSuggestions}
              className="px-2 py-0.5 text-[11px] font-medium bg-white border border-[#e8e8e8] rounded-full hover:bg-[#f5f5f5] transition-colors flex items-center gap-1"
            >
              {isLoadingSuggestions ? (
                <span className="w-3 h-3 border-2 border-[#9747FF] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              )}
              Suggest name
            </button>
          )}
        </div>

        <div
          className="absolute -bottom-2 -right-2 w-4 h-4 cursor-se-resize z-10"
          onMouseDown={handleResizeMouseDown}
        >
          <svg viewBox="0 0 16 16" className="w-full h-full" style={{ color: colorInfo.value }}>
            <path d="M14 14L8 14M14 14L14 8M14 14L6 6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
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
            {SECTION_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  onColorChange?.(group.id, c.value);
                  setShowContextMenu(false);
                }}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                  colorInfo.value === c.value ? "border-[#1d1d1d]" : "border-transparent"
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <div className="border-t border-[#e8e8e8] my-1" />
          <button
            onClick={() => {
              setIsEditingTitle(true);
              setTitleValue(group.title);
              setShowContextMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f5f5f5] flex items-center gap-2"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Rename
          </button>
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

      {showSuggestions && (
        <div
          className="absolute top-full left-0 mt-2 z-[100] bg-white rounded-xl shadow-2xl border border-[#e8e8e8] p-3 min-w-[280px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-[#1d1d1d]">Suggested names</h4>
            <button
              onClick={() => setShowSuggestions(false)}
              className="p-1 hover:bg-[#f5f5f5] rounded"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-[12px] text-[#8a8a8a]">No suggestions available</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion.title)}
                  className="w-full p-2 text-left rounded-lg hover:bg-[#f5f5f5] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#1d1d1d] group-hover:text-[#9747FF]">
                      {suggestion.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#f5f5f5] rounded text-[#8a8a8a]">
                      {suggestion.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a8a8a] mt-0.5 line-clamp-2">
                    {suggestion.reason}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
});
