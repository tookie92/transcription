"use client";

import React, { useCallback } from "react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import type { Position, StickyNoteData } from "@/types/figjam";

interface DndCanvasProps {
  children: React.ReactNode;
  zoom: number;
  pan: Position;
  onDragEnd?: (id: string, position: Position) => void;
  onDragStart?: (id: string) => void;
}

export function DndCanvas({ children, zoom, pan, onDragEnd, onDragStart }: DndCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    onDragStart?.(event.active.id as string);
  }, [onDragStart]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    
    if (delta.x !== 0 || delta.y !== 0) {
      // Calculate final position accounting for zoom
      // The delta is already in screen pixels, we need to convert to canvas coords
      const newX = delta.x / zoom;
      const newY = delta.y / zoom;
      
      onDragEnd?.(active.id as string, { x: newX, y: newY });
    }
  }, [zoom, onDragEnd]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}