"use client";

import React, { useCallback, useRef, useState } from "react";
import type { SectionData } from "@/types/figjam";

// ─── Section color palette ───────────────────────────────────────────────────

export const SECTION_COLORS = [
  { bg: "#e8f4fd", border: "#90CAF9", label: "Blue"   },
  { bg: "#e8f5e9", border: "#A5D6A7", label: "Green"  },
  { bg: "#fce4ec", border: "#F48FB1", label: "Pink"   },
  { bg: "#fff8e1", border: "#FFE082", label: "Yellow" },
  { bg: "#f3e5f5", border: "#CE93D8", label: "Purple" },
  { bg: "#fbe9e7", border: "#FFAB91", label: "Orange" },
  { bg: "#f5f5f5", border: "#E0E0E0", label: "Gray"   },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface SectionProps {
  section: SectionData;
  zoom: number;
  isSelected: boolean;
  /** True when a sticky being dragged hovers over this section */
  isHovered?: boolean;
  onSelect: (id: string, multi: boolean) => void;
  /**
   * Move the section AND all its children by (dx, dy) canvas units.
   * Called on every pointer-move frame during drag.
   */
  onMoveWithChildren: (sectionId: string, dx: number, dy: number) => void;
  onUpdate: (id: string, patch: Partial<SectionData>) => void;
  onDelete: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Section({
  section,
  zoom,
  isSelected,
  isHovered = false,
  onSelect,
  onMoveWithChildren,
  onUpdate,
  onDelete,
}: SectionProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const colorConfig =
    SECTION_COLORS.find((c) => c.bg === section.color) ?? SECTION_COLORS[0];

  // Default to false for sections that don't have this field yet
  const autoResize = section.autoResize ?? false;

  // ── Drag — moves section + all child stickies atomically ─────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isEditingTitle) return;
      if (e.button !== 0) return;

      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      onSelect(section.id, e.shiftKey || e.metaKey);

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      let lastDx = 0;
      let lastDy = 0;

      setIsDragging(true);

      const onMovePtr = (mv: PointerEvent) => {
        // Total delta from drag start (in canvas units)
        const totalDx = (mv.clientX - startClientX) / zoom;
        const totalDy = (mv.clientY - startClientY) / zoom;
        // Frame delta = total - what we already applied
        const frameDx = totalDx - lastDx;
        const frameDy = totalDy - lastDy;
        lastDx = totalDx;
        lastDy = totalDy;
        onMoveWithChildren(section.id, frameDx, frameDy);
      };

      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", onMovePtr);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMovePtr);
      window.addEventListener("pointerup", onUp);
    },
    [isEditingTitle, section.id, zoom, onSelect, onMoveWithChildren]
  );

  // ── Resize — SE corner handle ─────────────────────────────────────────────

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

  // ── Border style ───────────────────────────────────────────────────────────

  const border = isSelected
    ? "2px solid #0d99ff"
    : isHovered
    ? `2px dashed ${colorConfig.border}`
    : `2px solid ${colorConfig.border}`;

  return (
    <div
      className="absolute"
      style={{
        left:   section.position.x,
        top:    section.position.y,
        width:  section.size.width,
        height: section.size.height,
        zIndex: section.zIndex,
        // Subtle lift during drag
        filter: isDragging ? "drop-shadow(0 8px 24px rgba(0,0,0,0.12))" : "none",
        transition: isDragging ? "none" : "filter 0.2s ease",
      }}
    >
      {/* ── Section body ── */}
      <div
        className="w-full h-full rounded-xl flex flex-col"
        style={{
          background: colorConfig.bg,
          border,
          cursor: isDragging ? "grabbing" : "grab",
          // Highlight ring when a sticky hovers over this section
          boxShadow: isHovered
            ? `0 0 0 3px ${colorConfig.border}88`
            : "none",
          transition: "box-shadow 0.15s ease, border 0.15s ease",
        }}
        onPointerDown={handlePointerDown}
      >
        {/* ── Title bar ── */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-xl shrink-0"
          style={{
            background:   colorConfig.border + "44",
            borderBottom: `1px solid ${colorConfig.border}`,
            height: 40,
          }}
        >
          {/* Color dot / picker */}
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

          {/* Title — double-click to edit */}
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

          {/* Auto-resize toggle */}
          <button
            className={`w-6 h-6 flex items-center justify-center rounded-md text-xs shrink-0 transition-all ${
              autoResize
                ? "bg-green-500 text-white hover:bg-green-600 shadow-sm"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-dashed border-gray-300"
            }`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(section.id, { autoResize: !autoResize });
            }}
            title={autoResize ? "Auto-fit: Section automatically adjusts to fit content. Click to disable." : "Click to enable auto-fit: Section will grow to fit sticky notes inside."}
          >
            {autoResize ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
            )}
          </button>

          {/* Delete button */}
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
        </div>

        {/* ── Size badge (bottom-left) ── */}
        <div
          className="absolute bottom-2 left-3 text-[10px] text-gray-300 select-none pointer-events-none"
          style={{ fontFamily: "monospace" }}
        >
          {Math.round(section.size.width)} × {Math.round(section.size.height)}
        </div>
      </div>

      {/* ── Resize handle (SE corner) ── */}
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
  );
}
