/**
 * FigJam-style MiniMap Component
 * 
 * Compact overview of the canvas:
 * - Shows all sections/clusters
 * - Shows viewport indicator
 * - Click to navigate
 */

"use client";

import React, { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { AffinityGroup as AffinityGroupType } from "@/types";

interface MiniMapProps {
  /** All clusters/sections */
  groups: AffinityGroupType[];
  /** Current viewport position */
  viewportPosition: { x: number; y: number };
  /** Current zoom level */
  scale: number;
  /** Viewport size */
  viewportSize: { width: number; height: number };
  /** Callback for navigation */
  onNavigate: (x: number, y: number) => void;
  /** Additional class */
  className?: string;
}

const MINIMAP_WIDTH = 120;
const MINIMAP_HEIGHT = 80;
const MINIMAP_PADDING = 20;

export const MiniMap = memo(function MiniMap({
  groups,
  viewportPosition,
  scale,
  viewportSize,
  onNavigate,
  className,
}: MiniMapProps) {
  /**
   * Calculate bounds of all content
   */
  const bounds = useMemo(() => {
    if (groups.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    }

    const minX = Math.min(...groups.map((g) => g.position.x)) - MINIMAP_PADDING;
    const minY = Math.min(...groups.map((g) => g.position.y)) - MINIMAP_PADDING;
    const maxX = Math.max(...groups.map((g) => g.position.x + 460)) + MINIMAP_PADDING;
    const maxY = Math.max(...groups.map((g) => g.position.y + 320)) + MINIMAP_PADDING;

    return { minX, minY, maxX, maxY };
  }, [groups]);

  /**
   * Calculate minimap scale
   */
  const minimapScale = useMemo(() => {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const scaleX = MINIMAP_WIDTH / contentWidth;
    const scaleY = MINIMAP_HEIGHT / contentHeight;

    return Math.min(scaleX, scaleY, 0.1);
  }, [bounds]);

  /**
   * Convert world position to minimap position
   */
  const toMinimap = (x: number, y: number) => ({
    x: (x - bounds.minX) * minimapScale,
    y: (y - bounds.minY) * minimapScale,
  });

  /**
   * Calculate viewport rectangle on minimap
   */
  const viewportRect = useMemo(() => {
    // World coordinates of viewport
    const worldX = (-viewportPosition.x) / scale;
    const worldY = (-viewportPosition.y) / scale;
    const worldWidth = viewportSize.width / scale;
    const worldHeight = viewportSize.height / scale;

    const { x, y } = toMinimap(worldX, worldY);

    return {
      x,
      y,
      width: worldWidth * minimapScale,
      height: worldHeight * minimapScale,
    };
  }, [viewportPosition, scale, viewportSize, minimapScale, bounds]);

  /**
   * Handle click on minimap
   */
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to world coordinates
    const worldX = clickX / minimapScale + bounds.minX;
    const worldY = clickY / minimapScale + bounds.minY;

    onNavigate(worldX, worldY);
  };

  return (
    <div
      className={cn(
        "absolute right-4 top-16",
        "bg-white rounded-[10px]",
        "shadow-[0_2px_12px_rgba(0,0,0,0.1)]",
        "border border-[#e8e8e8]",
        "p-2",
        "z-20",
        className
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="text-[10px] text-[#8a8a8a] font-semibold tracking-[0.5px] mb-1.5">
        MINIMAP
      </div>

      {/* Map area */}
      <div
        className="relative rounded-[6px] overflow-hidden"
        style={{
          width: MINIMAP_WIDTH,
          height: MINIMAP_HEIGHT,
          backgroundColor: "#f5f5f0",
        }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, #c8c8c0 0.5px, transparent 0.5px)",
            backgroundSize: "8px 8px",
          }}
        />

        {/* Section indicators */}
        {groups.map((group) => {
          const { x, y } = toMinimap(group.position.x, group.position.y);
          return (
            <div
              key={group.id}
              className="absolute rounded-[1px]"
              style={{
                left: x,
                top: y,
                width: Math.max(8, 46 * minimapScale),
                height: Math.max(6, 32 * minimapScale),
                backgroundColor: group.color || "#9747FF",
                opacity: 0.8,
              }}
            />
          );
        })}

        {/* Viewport indicator */}
        <div
          className="absolute border-[1.5px] border-[#9747FF] rounded-[4px] pointer-events-none"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: Math.max(10, viewportRect.width),
            height: Math.max(10, viewportRect.height),
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  );
});
