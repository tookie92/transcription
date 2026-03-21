"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CreationRectProps {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  scale: number;
  position: { x: number; y: number };
  color?: string;
}

export function CreationRect({ rect, scale, position, color = "#3b82f6" }: CreationRectProps) {
  if (!rect || rect.width === 0 || rect.height === 0) return null;

  const screenX = rect.x * scale + position.x;
  const screenY = rect.y * scale + position.y;
  const screenWidth = rect.width * scale;
  const screenHeight = rect.height * scale;

  return (
    <div
      className="pointer-events-none fixed z-[9998]"
      style={{
        left: screenX,
        top: screenY,
        width: screenWidth,
        height: screenHeight,
      }}
    >
      <div
        className={cn(
          "absolute inset-0 border-2 rounded-lg animate-pulse"
        )}
        style={{
          borderColor: color,
          backgroundColor: `${color}10`,
        }}
      />
      <div
        className="absolute top-0 left-0 px-2 py-1 text-xs font-medium text-white rounded-br rounded-tl"
        style={{ backgroundColor: color }}
      >
        {Math.round(rect.width)} × {Math.round(rect.height)}
      </div>
    </div>
  );
}

interface CreationHintProps {
  message: string;
  shortcut?: string;
}

export function CreationHint({ message, shortcut }: CreationHintProps) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] bg-card border border-border rounded-lg shadow-xl px-4 py-2 flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{message}</span>
      {shortcut && (
        <kbd className="px-2 py-1 bg-muted rounded text-xs font-medium">{shortcut}</kbd>
      )}
    </div>
  );
}
