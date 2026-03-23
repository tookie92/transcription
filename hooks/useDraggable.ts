"use client";

import { useCallback, useRef, useState } from "react";
import type { Position } from "../types/figjam";

interface DragBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface UseDraggableOptions {
  id: string;
  position: Position;
  zoom: number;
  onMove: (id: string, pos: Position) => void;
  onMoveSelected?: (ids: string[], dx: number, dy: number) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  disabled?: boolean;
  /** Optional bounds to constrain dragging (useful for stickies in auto-resize sections) */
  bounds?: DragBounds;
  /** Sticky dimensions for bounds calculation */
  stickyWidth?: number;
  stickyHeight?: number;
  /** IDs of all currently selected elements (for multi-selection drag) */
  selectedIds?: string[];
}

interface UseDraggableReturn {
  isDragging: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
}

/**
 * Makes a FigJam element draggable on the infinite canvas.
 * Accounts for canvas zoom so 1px drag = 1/zoom canvas units.
 */
export function useDraggable({
  id,
  position,
  zoom,
  onMove,
  onMoveSelected,
  onDragStart,
  onDragEnd,
  disabled = false,
  bounds,
  stickyWidth = 200,
  stickyHeight = 180,
  selectedIds = [],
}: UseDraggableOptions): UseDraggableReturn {
  const [isDragging, setIsDragging] = useState(false);
  const startPointer = useRef<Position>({ x: 0, y: 0 });
  const lastPointer = useRef<Position>({ x: 0, y: 0 });
  const startPos = useRef<Position>(position);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      startPointer.current = { x: e.clientX, y: e.clientY };
      lastPointer.current = { x: e.clientX, y: e.clientY };
      startPos.current = { ...position };
      setIsDragging(true);
      onDragStart?.(id);

      const isMultiSelect = selectedIds.length > 1 && selectedIds.includes(id);

      const onMove_ = (moveEvent: PointerEvent) => {
        // Frame delta for multi-select (only the increment since last frame)
        const frameDx = (moveEvent.clientX - lastPointer.current.x) / zoom;
        const frameDy = (moveEvent.clientY - lastPointer.current.y) / zoom;
        lastPointer.current = { x: moveEvent.clientX, y: moveEvent.clientY };

        if (isMultiSelect && onMoveSelected) {
          // Move all selected elements together by the frame delta
          onMoveSelected(selectedIds, frameDx, frameDy);
        } else {
          // Single element move - use total delta from drag start
          const totalDx = (moveEvent.clientX - startPointer.current.x) / zoom;
          const totalDy = (moveEvent.clientY - startPointer.current.y) / zoom;
          let newX = startPos.current.x + totalDx;
          let newY = startPos.current.y + totalDy;

          // Apply bounds constraint if provided
          if (bounds) {
            newX = Math.max(bounds.minX, Math.min(bounds.maxX - stickyWidth, newX));
            newY = Math.max(bounds.minY, Math.min(bounds.maxY - stickyHeight, newY));
          }

          onMove(id, { x: newX, y: newY });
        }
      };

      const onUp = () => {
        setIsDragging(false);
        onDragEnd?.(id);
        window.removeEventListener("pointermove", onMove_);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove_);
      window.addEventListener("pointerup", onUp);
    },
    [disabled, id, position, zoom, onMove, onMoveSelected, onDragStart, onDragEnd, bounds, stickyWidth, stickyHeight, selectedIds]
  );

  return { isDragging, handlePointerDown };
}
