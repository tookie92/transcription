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

interface UseLassoSelectionOptions<T> {
  onSelectionChange?: (selectedIds: string[]) => void;
}

interface UseLassoSelectionReturn {
  isSelecting: boolean;
  selectionRect: Rect | null;
  selectedIds: Set<string>;
  startSelection: (point: Point) => void;
  updateSelection: (point: Point) => void;
  endSelection: () => void;
  clearSelection: () => void;
  selectItem: (id: string, additive?: boolean) => void;
  deselectItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
}

export function useLassoSelection<T extends { id: string; position: { x: number; y: number } }>(
  items: T[],
  options: UseLassoSelectionOptions<T> = {}
): UseLassoSelectionReturn {
  const { onSelectionChange } = options;
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const startPointRef = useRef<Point | null>(null);

  const startSelection = useCallback((point: Point) => {
    setIsSelecting(true);
    startPointRef.current = point;
    setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 });
  }, []);

  const updateSelection = useCallback(
    (point: Point) => {
      if (!startPointRef.current || !isSelecting) return;

      const start = startPointRef.current;
      const x = Math.min(start.x, point.x);
      const y = Math.min(start.y, point.y);
      const width = Math.abs(point.x - start.x);
      const height = Math.abs(point.y - start.y);

      setSelectionRect({ x, y, width, height });

      const selected = new Set<string>();
      items.forEach((item) => {
        const itemX = item.position.x;
        const itemY = item.position.y;
        if (
          itemX >= x &&
          itemX <= x + width &&
          itemY >= y &&
          itemY <= y + height
        ) {
          selected.add(item.id);
        }
      });

      setSelectedIds(selected);
      onSelectionChange?.(Array.from(selected));
    },
    [items, isSelecting, onSelectionChange]
  );

  const endSelection = useCallback(() => {
    setIsSelecting(false);
    startPointRef.current = null;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionRect(null);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const selectItem = useCallback(
    (id: string, additive = false) => {
      setSelectedIds((prev) => {
        const next = additive ? new Set(prev) : new Set<string>();
        next.add(id);
        onSelectionChange?.(Array.from(next));
        return next;
      });
    },
    [onSelectionChange]
  );

  const deselectItem = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        onSelectionChange?.(Array.from(next));
        return next;
      });
    },
    [onSelectionChange]
  );

  const selectAll = useCallback(
    (ids: string[]) => {
      setSelectedIds(new Set(ids));
      onSelectionChange?.(ids);
    },
    [onSelectionChange]
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  return {
    isSelecting,
    selectionRect,
    selectedIds,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    selectItem,
    deselectItem,
    selectAll,
    isSelected,
  };
}

export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function rectIntersects(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function normalizeRect(rect: Rect): Rect {
  return {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}
