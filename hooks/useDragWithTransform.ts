"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import type { Position } from "../types/figjam";

interface DragBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface UseDragWithTransformOptions {
  id: string;
  position: Position;
  zoom: number;
  onMove: (id: string, pos: Position) => void;
  onMoveSelected?: (ids: string[], dx: number, dy: number) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string, finalPos: Position) => void;
  disabled?: boolean;
  bounds?: DragBounds;
  stickyWidth?: number;
  stickyHeight?: number;
  selectedIds?: string[];
}

interface UseDragWithTransformReturn {
  transform: { x: number; y: number };
  handlePointerDown: (e: React.PointerEvent) => void;
  resetTransform: () => void;
  isDragging: boolean;
}

export function useDragWithTransform({
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
}: UseDragWithTransformOptions): UseDragWithTransformReturn {
  const transformRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [, setTransformState] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const isDraggingRef = useRef(false);
  const startPointerRef = useRef<Position>({ x: 0, y: 0 });
  const startPositionRef = useRef<Position>({ x: 0, y: 0 });

  const resetTransform = useCallback(() => {
    transformRef.current = { x: 0, y: 0 };
    setTransformState({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      isDraggingRef.current = true;
      transformRef.current = { x: 0, y: 0 };
      setTransformState({ x: 0, y: 0 });

      const currentPos = position;
      startPointerRef.current = { x: e.clientX, y: e.clientY };
      startPositionRef.current = { ...currentPos };

      onDragStart?.(id);

      const isMultiSelect = selectedIds.length > 1 && selectedIds.includes(id);

      const MIN_MOVE_THRESHOLD = 3;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) {
          const totalDx = (moveEvent.clientX - startPointerRef.current.x) / zoom;
          const totalDy = (moveEvent.clientY - startPointerRef.current.y) / zoom;
          const moved = Math.abs(totalDx) + Math.abs(totalDy);
          if (moved < MIN_MOVE_THRESHOLD) return;
          isDraggingRef.current = true;
        }

        if (isMultiSelect && onMoveSelected) {
          const frameDx = (moveEvent.clientX - startPointerRef.current.x) / zoom;
          const frameDy = (moveEvent.clientY - startPointerRef.current.y) / zoom;
          startPointerRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
          onMoveSelected(selectedIds, frameDx, frameDy);
        } else {
          const totalDx = (moveEvent.clientX - startPointerRef.current.x) / zoom;
          const totalDy = (moveEvent.clientY - startPointerRef.current.y) / zoom;
          
          let newX = totalDx;
          let newY = totalDy;

          if (bounds) {
            newX = Math.max(bounds.minX - startPositionRef.current.x, Math.min(bounds.maxX - stickyWidth - startPositionRef.current.x, newX));
            newY = Math.max(bounds.minY - startPositionRef.current.y, Math.min(bounds.maxY - stickyHeight - startPositionRef.current.y, newY));
          }

          transformRef.current = { x: newX, y: newY };
          setTransformState({ x: newX, y: newY });
        }
      };

      const onPointerUp = () => {
        if (!isDraggingRef.current) {
          isDraggingRef.current = false;
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          return;
        }

        const finalX = startPositionRef.current.x + transformRef.current.x;
        const finalY = startPositionRef.current.y + transformRef.current.y;
        
        onMove(id, { x: finalX, y: finalY });
        
        isDraggingRef.current = false;
        transformRef.current = { x: 0, y: 0 };
        setTransformState({ x: 0, y: 0 });

        onDragEnd?.(id, { x: finalX, y: finalY });
        
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [disabled, id, zoom, onMove, onMoveSelected, onDragStart, onDragEnd, bounds, stickyWidth, stickyHeight, selectedIds, position]
  );

  useEffect(() => {
    if (!isDraggingRef.current) {
      transformRef.current = { x: 0, y: 0 };
      setTransformState({ x: 0, y: 0 });
    }
  }, [position]);

  return {
    transform: transformRef.current,
    handlePointerDown,
    resetTransform,
    isDragging: isDraggingRef.current,
  };
}
