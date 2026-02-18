"use client";

import { useMemo } from "react";
import { AffinityGroup } from "@/types";

interface MiniMapProps {
  groups: AffinityGroup[];
  position: { x: number; y: number };
  scale: number;
  canvasSize?: { width: number; height: number };
  onNavigate: (x: number, y: number) => void;
  viewportSize: { width: number; height: number };
}

const CANVAS_WIDTH = 5000;
const CANVAS_HEIGHT = 5000;
const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 100;

export function MiniMap({
  groups,
  position,
  scale,
  onNavigate,
  viewportSize,
}: MiniMapProps) {
  const minimapScale = MINIMAP_WIDTH / CANVAS_WIDTH;

  const groupsInMinimap = useMemo(() => {
    if (groups.length === 0) return [];
    return groups.map((group) => ({
      id: group.id,
      x: group.position.x * minimapScale,
      y: group.position.y * minimapScale,
      width: Math.max(4, 20 * minimapScale),
      height: Math.max(3, 15 * minimapScale),
      color: group.color,
    }));
  }, [groups, minimapScale]);

  const viewportRect = useMemo(() => {
    const viewWidth = viewportSize.width / scale;
    const viewHeight = viewportSize.height / scale;
    const viewX = -position.x / scale;
    const viewY = -position.y / scale;

    return {
      x: viewX * minimapScale,
      y: viewY * minimapScale,
      width: viewWidth * minimapScale,
      height: viewHeight * minimapScale,
    };
  }, [position, scale, viewportSize, minimapScale]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const canvasX = clickX / minimapScale;
    const canvasY = clickY / minimapScale;

    onNavigate(canvasX, canvasY);
  };

  return (
    <div className="fixed bottom-20 left-4 z-50" style={{ pointerEvents: 'auto' }}>
      <div
        className="relative bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg cursor-crosshair overflow-hidden"
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        onClick={handleMinimapClick}
      >
        {/* Canvas background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: `${20 * minimapScale}px ${20 * minimapScale}px`,
          }}
        />

        {/* Groups */}
        {groupsInMinimap.map((group) => (
          <div
            key={group.id}
            className="absolute rounded-sm"
            style={{
              left: group.x,
              top: group.y,
              width: group.width,
              height: group.height,
              backgroundColor: group.color,
              opacity: 0.8,
            }}
          />
        ))}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 rounded pointer-events-none"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
          }}
        />
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 mt-1 text-center">
        Click to navigate
      </div>
    </div>
  );
}
