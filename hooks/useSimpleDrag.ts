"use client";

import { useState, useCallback } from 'react';

export function useSimpleDrag() {
  const [draggedItem, setDraggedItem] = useState<{ type: 'group' | 'insight'; id: string } | null>(null);

  const startDrag = useCallback((type: 'group' | 'insight', id: string) => {
    setDraggedItem({ type, id });
  }, []);

  const endDrag = useCallback(() => {
    setDraggedItem(null);
  }, []);

  return {
    draggedItem,
    startDrag,
    endDrag,
    isDragging: !!draggedItem
  };
}