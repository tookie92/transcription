"use client";

import { useCallback, useRef, useEffect } from "react";
import type { Position } from "../types/figjam";

interface UsePureDragOptions {
  id: string;
  position: Position;
  zoom: number;
  onMove: (id: string, pos: Position) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  disabled?: boolean;
}

export function usePureDrag({
  id,
  position,
  zoom,
  onMove,
  onDragStart,
  onDragEnd,
  disabled = false,
}: UsePureDragOptions) {
  const isDraggingRef = useRef(false);
  const startPointerRef = useRef<Position>({ x: 0, y: 0 });
  const startPosRef = useRef<Position>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);

  const setElementRef = useCallback((el: HTMLElement | null) => {
    elementRef.current = el;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.button !== 0) return;

      e.stopPropagation();
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      isDraggingRef.current = true;
      startPointerRef.current = { x: e.clientX, y: e.clientY };
      startPosRef.current = { ...position };

      onDragStart?.(id);

      const MIN_MOVE_THRESHOLD = 3;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) {
          const dx = (moveEvent.clientX - startPointerRef.current.x) / zoom;
          const dy = (moveEvent.clientY - startPointerRef.current.y) / zoom;
          if (Math.abs(dx) < MIN_MOVE_THRESHOLD && Math.abs(dy) < MIN_MOVE_THRESHOLD) return;
          isDraggingRef.current = true;
        }

        const dx = (moveEvent.clientX - startPointerRef.current.x) / zoom;
        const dy = (moveEvent.clientY - startPointerRef.current.y) / zoom;

        if (elementRef.current) {
          elementRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      };

      const onPointerUp = () => {
        if (!isDraggingRef.current) {
          isDraggingRef.current = false;
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          return;
        }

        const transformStr = elementRef.current?.style.transform || "";
        const match = transformStr.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        const dx = match ? parseFloat(match[1]) : 0;
        const dy = match ? parseFloat(match[2]) : 0;

        const finalX = startPosRef.current.x + dx;
        const finalY = startPosRef.current.y + dy;

        onMove(id, { x: finalX, y: finalY });

        if (elementRef.current) {
          elementRef.current.style.transform = "";
        }

        isDraggingRef.current = false;
        onDragEnd?.(id);

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [disabled, id, zoom, onMove, onDragStart, onDragEnd, position]
  );

  useEffect(() => {
    if (!isDraggingRef.current && elementRef.current) {
      elementRef.current.style.transform = "";
    }
  }, [position]);

  return { handlePointerDown, setElementRef, isDragging: () => isDraggingRef.current };
}
