"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SelectionBoxProps {
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  scale: number;
  position: { x: number; y: number };
}

export function SelectionBox({ rect, scale, position }: SelectionBoxProps) {
  if (!rect || rect.width === 0 || rect.height === 0) return null;

  const screenX = rect.x * scale + position.x;
  const screenY = rect.y * scale + position.y;
  const screenWidth = rect.width * scale;
  const screenHeight = rect.height * scale;

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: screenX,
        top: screenY,
        width: screenWidth,
        height: screenHeight,
      }}
    >
      <div
        className={cn(
          "absolute inset-0 border-2 border-primary bg-primary/10",
          "rounded-sm"
        )}
        style={{
          boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  );
}

interface SelectionToolbarProps {
  selectedCount: number;
  position: { x: number; y: number };
  onMove?: (direction: "up" | "down" | "left" | "right") => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onGroup?: () => void;
}

export function SelectionToolbar({
  selectedCount,
  position,
  onMove,
  onDelete,
  onDuplicate,
  onGroup,
}: SelectionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed z-[9999] bg-card border border-border rounded-lg shadow-xl p-2 flex items-center gap-1"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.max(position.y - 50, 10),
      }}
    >
      <span className="text-xs text-muted-foreground px-2">
        {selectedCount} selected
      </span>
      
      {onMove && (
        <div className="flex items-center gap-0.5 ml-2 border-l border-border pl-2">
          <button
            onClick={() => onMove("up")}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Move up"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
          <button
            onClick={() => onMove("down")}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Move down"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14m0 0l-7-7m7 7l7-7" />
            </svg>
          </button>
          <button
            onClick={() => onMove("left")}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Move left"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m0 0l7 7m-7-7l7 7" />
            </svg>
          </button>
          <button
            onClick={() => onMove("right")}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Move right"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14m0 0l-7-7m7 7l-7 7" />
            </svg>
          </button>
        </div>
      )}

      {onDuplicate && (
        <button
          onClick={onDuplicate}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          title="Duplicate"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
      )}

      {onGroup && (
        <button
          onClick={onGroup}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          title="Group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-destructive/10 rounded text-destructive"
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
