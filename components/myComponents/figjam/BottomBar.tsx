/**
 * FigJam-style Bottom Bar Component
 * - Color swatches for new stickies
 * - Zoom controls
 */

"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";

interface BottomBarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  className?: string;
}

export const BottomBar = memo(function BottomBar({
  scale,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  className,
}: BottomBarProps) {
  return (
    <div
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2",
        "bg-card rounded-2xl",
        "shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none",
        "border border-border",
        "flex items-center",
        "p-2",
        "gap-1",
        "z-20",
        className
      )}
    >
      {/* Zoom controls */}
      <div className="flex items-center">
        <button
          onClick={onZoomOut}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <svg fill="none" stroke="currentColor" width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <span className="text-xs font-medium text-foreground w-12 text-center select-none">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={onZoomIn}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <svg fill="none" stroke="currentColor" width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="w-[1px] h-6 bg-border mx-1" />

      {/* Fit to screen */}
      <button
        onClick={onFitToScreen}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        title="Fit to screen"
      >
        <svg fill="none" stroke="currentColor" width="14" height="14" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m0 8v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3m0-8V5a2 2 0 0 0-2-2h-3" />
        </svg>
      </button>
    </div>
  );
});
