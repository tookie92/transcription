"use client";

import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { SectionData, StickyNoteData, Position } from "@/types/figjam";

/**
 * Section Component - Replaces ClusterLabel
 * Behaves like Figma frames: when dragged, all contained stickies move with it
 */
interface SectionProps {
  data: SectionData;
  isSelected: boolean;
  zoom: number;
  pan: Position;
  containedStickies: StickyNoteData[];
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, patch: Partial<SectionData | StickyNoteData>) => void;
  onDelete: (id: string) => void;
}

export function Section({
  data,
  isSelected,
  zoom,
  pan,
  containedStickies,
  onSelect,
  onUpdate,
  onDelete
}: SectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start drag if clicking on input or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (e.button !== 0) return; // Only left button

    setDragStartPos({ x: data.position.x, y: data.position.y });
    setIsDragging(true);
    onSelect(data.id, e.shiftKey || e.ctrlKey);
  }, [data.id, data.position, onSelect]);

  // Drag with contained stickies moving together
  useEffect(() => {
    if (!isDragging || !dragStartPos) return;

    const handlePointerMove = (e: PointerEvent) => {
      const canvas = document.querySelector('.figjam-canvas')?.getBoundingClientRect();
      if (!canvas) return;

      // Calculate new section position
      const x = (e.clientX - canvas.left - pan.x) / zoom;
      const y = (e.clientY - canvas.top - pan.y) / zoom;

      // Calculate delta from drag start
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;

      // Update section position
      onUpdate(data.id, { position: { x, y } });

      // Update all contained stickies with the same delta
      containedStickies.forEach(sticky => {
        const newX = sticky.position.x + deltaX;
        const newY = sticky.position.y + deltaY;
        onUpdate(sticky.id, { position: { x: newX, y: newY } });
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setDragStartPos(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragStartPos, zoom, pan, data, containedStickies, onUpdate]);

  const backgroundColor = data.backgroundColor || 'rgba(184, 180, 255, 0.1)';

  return (
    <div
      className={cn(
        "absolute group border-2 rounded-xl",
        isSelected ? "border-blue-500" : "border-dashed border-purple-300"
      )}
      style={{
        left: data.position.x,
        top: data.position.y,
        width: data.size.width,
        height: data.size.height,
        backgroundColor,
        borderColor: data.borderColor || undefined,
        zIndex: data.zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'border-color 0.2s ease',
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Title */}
      <div className="absolute -top-7 left-0">
        {isEditingTitle ? (
          <input
            autoFocus
            defaultValue={data.title}
            onBlur={(e) => {
              onUpdate(data.id, { title: e.target.value });
              setIsEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.currentTarget.blur();
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="px-2 py-1 text-sm font-medium bg-white/90 backdrop-blur rounded border border-purple-300 outline-none min-w-[120px]"
          />
        ) : (
          <span
            className="px-2 py-1 text-sm font-medium bg-white/90 backdrop-blur rounded border border-purple-300 cursor-pointer"
            onDoubleClick={() => setIsEditingTitle(true)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {data.title || 'Untitled Section'}
          </span>
        )}
      </div>

      {/* Sticky count badge */}
      {containedStickies.length > 0 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/70 backdrop-blur rounded-full text-xs font-medium text-purple-700">
          {containedStickies.length}
        </div>
      )}

      {/* Resize handles */}
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-purple-300/30 transition-colors"
        onPointerDown={(e) => {
          e.stopPropagation();
          // TODO: Implement resize logic
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-purple-300/30 transition-colors"
        onPointerDown={(e) => {
          e.stopPropagation();
          // TODO: Implement resize logic
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-purple-300/30 transition-colors"
        onPointerDown={(e) => {
          e.stopPropagation();
          // TODO: Implement resize logic
        }}
      />
    </div>
  );
}
