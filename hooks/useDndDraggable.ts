"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Position } from "../types/figjam";

interface UseDndDraggableOptions {
  id: string;
  position: Position;
  disabled?: boolean;
  data?: object;
}

interface UseDndDraggableReturn {
  setNodeRef: (node: HTMLElement | null) => void;
  listeners: object;
  transform: ReturnType<typeof useDraggable>["transform"];
  isDragging: boolean;
  transformString: string;
}

export function useDndDraggable({
  id,
  disabled = false,
  data,
}: UseDndDraggableOptions): UseDndDraggableReturn {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    isDragging 
  } = useDraggable({
    id,
    disabled,
    data,
  });

  const transformString = transform 
    ? CSS.Translate.toString(transform) || "translate(0px, 0px)"
    : "translate(0px, 0px)";

  return {
    setNodeRef,
    listeners: { ...listeners, ...attributes } as object,
    transform,
    isDragging,
    transformString,
  };
}