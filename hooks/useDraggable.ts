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
  const suppressSyncRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isDraggingRef.current) {
      suppressSyncRef.current = true;
      setVisualPosition({ ...position });
      requestAnimationFrame(() => {
        suppressSyncRef.current = false;
      });
    }
  }, [position]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      isDraggingRef.current = true;
      suppressSyncRef.current = true;

      const currentPos = visualPosition;
      startPointerRef.current = { x: e.clientX, y: e.clientY };
      startPositionRef.current = { ...currentPos };
      lastFramePointerRef.current = { x: e.clientX, y: e.clientY };
      lastUpdateTimeRef.current = Date.now();

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

          setVisualPosition({ x: newX, y: newY });

          const now = Date.now();
          if (now - lastUpdateTimeRef.current > 50) {
            lastUpdateTimeRef.current = now;
            onMove(id, { x: newX, y: newY });
          }
        }
      };

      const onPointerUp = () => {
        isDraggingRef.current = false;
        suppressSyncRef.current = false;

        if (isDraggingRef.current) {
          const currentPos = visualPosition;
          onMove(id, { x: currentPos.x, y: currentPos.y });
        }

        onDragEnd?.(id);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [disabled, id, zoom, onMove, onMoveSelected, onDragStart, onDragEnd, bounds, stickyWidth, stickyHeight, selectedIds, visualPosition]
  );

  return {
    visualPosition,
    handlePointerDown
  };
}
