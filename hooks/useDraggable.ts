"use client";

import { useCallback, useRef, useState, useEffect } from "react";
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
  bounds?: DragBounds;
  stickyWidth?: number;
  stickyHeight?: number;
  selectedIds?: string[];
  noMomentum?: boolean;
  onPositionChange?: (pos: Position) => void;
}

interface UseDraggableReturn {
  visualPosition: Position;
  handlePointerDown: (e: React.PointerEvent) => void;
}

export function useDraggable({
  id,
  position,
  zoom,
  onMove,
  onMoveSelected,
  onDragStart,
  onDragEnd,
  onPositionChange,
  disabled = false,
  bounds,
  stickyWidth = 200,
  stickyHeight = 180,
  selectedIds = [],
}: UseDraggableOptions): UseDraggableReturn {
  const [visualPosition, setVisualPosition] = useState<Position>({ ...position });

  const startPointerRef = useRef<Position>({ x: 0, y: 0 });
  const startPositionRef = useRef<Position>({ x: 0, y: 0 });
  const lastFramePointerRef = useRef<Position>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const visualPositionRef = useRef<Position>({ ...position });
  
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    visualPositionRef.current = { ...position };
    if (!isDraggingRef.current) {
      setVisualPosition({ ...position });
    }
  }, [position]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      elementRef.current = e.currentTarget as HTMLElement;

      isDraggingRef.current = true;

      const currentPos = visualPositionRef.current;
      startPointerRef.current = { x: e.clientX, y: e.clientY };
      startPositionRef.current = { ...currentPos };
      lastFramePointerRef.current = { x: e.clientX, y: e.clientY };

      onDragStart?.(id);

      const isMultiSelect = selectedIds.length > 1 && selectedIds.includes(id);

      const MIN_MOVE_THRESHOLD = 2;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const totalDx = (moveEvent.clientX - startPointerRef.current.x) / zoom;
        const totalDy = (moveEvent.clientY - startPointerRef.current.y) / zoom;

        if (!isDraggingRef.current) {
          const moved = Math.abs(totalDx) + Math.abs(totalDy);
          if (moved > MIN_MOVE_THRESHOLD) {
            isDraggingRef.current = true;
          } else {
            return;
          }
        }

        if (isMultiSelect && onMoveSelected) {
          const frameDx = (moveEvent.clientX - lastFramePointerRef.current.x) / zoom;
          const frameDy = (moveEvent.clientY - lastFramePointerRef.current.y) / zoom;
          lastFramePointerRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };

          onMoveSelected(selectedIds, frameDx, frameDy);
        } else {
          let newX = startPositionRef.current.x + totalDx;
          let newY = startPositionRef.current.y + totalDy;

          if (bounds) {
            newX = Math.max(bounds.minX, Math.min(bounds.maxX - stickyWidth, newX));
            newY = Math.max(bounds.minY, Math.min(bounds.maxY - stickyHeight, newY));
          }

          const newPos = { x: newX, y: newY };
          visualPositionRef.current = newPos;
          
          // Update DOM directly for smooth movement
          if (elementRef.current) {
            elementRef.current.style.left = `${newX}px`;
            elementRef.current.style.top = `${newY}px`;
          }
          
          // Notify external ref of position change (for StickyNote's renderPosition)
          onPositionChange?.(newPos);
        }
      };

      const onPointerUp = () => {
        const finalPos = { ...visualPositionRef.current };
        const wasDragging = isDraggingRef.current;
        isDraggingRef.current = false;
        elementRef.current = null;

        if (wasDragging) {
          setVisualPosition(finalPos);
          onMove(id, finalPos);
        }

        onDragEnd?.(id);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [disabled, id, zoom, onMove, onMoveSelected, onDragStart, onDragEnd, onPositionChange, bounds, stickyWidth, stickyHeight, selectedIds]
  );

  return {
    visualPosition,
    handlePointerDown
  };
}
