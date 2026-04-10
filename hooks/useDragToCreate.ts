"use client";

import { useState, useCallback, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseDragToCreateOptions {
  minWidth?: number;
  minHeight?: number;
  onCreate?: (rect: Rect) => void;
}

interface UseDragToCreateReturn {
  isCreating: boolean;
  creationRect: Rect | null;
  startCreating: (point: Point) => void;
  updateCreating: (point: Point) => void;
  endCreating: () => void;
  cancelCreating: () => void;
}

export function useDragToCreate(options: UseDragToCreateOptions = {}): UseDragToCreateReturn {
  const { minWidth = 100, minHeight = 80, onCreate } = options;
  const [isCreating, setIsCreating] = useState(false);
  const [creationRect, setCreationRect] = useState<Rect | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const hasCalledCreateRef = useRef(false);

  const startCreating = useCallback((point: Point) => {
    setIsCreating(true);
    hasCalledCreateRef.current = false;
    startPointRef.current = point;
    setCreationRect({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
  }, []);

  const updateCreating = useCallback((point: Point) => {
    if (!isCreating || !startPointRef.current) return;

    const start = startPointRef.current;
    const x = Math.min(start.x, point.x);
    const y = Math.min(start.y, point.y);
    const width = Math.abs(point.x - start.x);
    const height = Math.abs(point.y - start.y);

    setCreationRect({ x, y, width, height });
  }, [isCreating]);

  const endCreating = useCallback(() => {
    if (!hasCalledCreateRef.current && creationRect && creationRect.width >= minWidth && creationRect.height >= minHeight) {
      hasCalledCreateRef.current = true;
      onCreate?.(creationRect);
    }
    setIsCreating(false);
    setCreationRect(null);
    startPointRef.current = null;
  }, [creationRect, minWidth, minHeight, onCreate]);

  const cancelCreating = useCallback(() => {
    setIsCreating(false);
    setCreationRect(null);
    startPointRef.current = null;
    hasCalledCreateRef.current = false;
  }, []);

  return {
    isCreating,
    creationRect,
    startCreating,
    updateCreating,
    endCreating,
    cancelCreating,
  };
}

export function normalizeRect(rect: Rect): Rect {
  return {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}
