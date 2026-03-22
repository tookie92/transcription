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
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  disabled?: boolean;
  /** Optional bounds to constrain dragging (useful for stickies in auto-resize sections) */
  bounds?: DragBounds;
  /** Sticky dimensions for bounds calculation */
  stickyWidth?: number;
  stickyHeight?: number;
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
  onDragStart,
  onDragEnd,
  disabled = false,
  bounds,
  stickyWidth = 200,
  stickyHeight = 180,
}: UseDraggableOptions): UseDraggableReturn {
  const [isDragging, setIsDragging] = useState(false);
  const startPointer = useRef<Position>({ x: 0, y: 0 });
  const startPos = useRef<Position>(position);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      // Don't start dragging if Ctrl/Cmd is pressed - let click handler manage selection
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      startPointer.current = { x: e.clientX, y: e.clientY };
      startPos.current = { ...position };
      setIsDragging(true);
      onDragStart?.(id);

      const onMove_ = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - startPointer.current.x) / zoom;
        const dy = (moveEvent.clientY - startPointer.current.y) / zoom;

        let newX = startPos.current.x + dx;
        let newY = startPos.current.y + dy;

        // Apply bounds constraint if provided
        if (bounds) {
          newX = Math.max(bounds.minX, Math.min(bounds.maxX - stickyWidth, newX));
          newY = Math.max(bounds.minY, Math.min(bounds.maxY - stickyHeight, newY));
        }

        onMove(id, { x: newX, y: newY });
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
    [disabled, id, position, zoom, onMove, onDragStart, onDragEnd, bounds, stickyWidth, stickyHeight]
  );

  return { isDragging, handlePointerDown };
}
