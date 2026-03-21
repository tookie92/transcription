"use client";

import { useMemo } from "react";
import { AffinityGroup } from "@/types";

interface MiniMapProps {
  groups: AffinityGroup[];
  position: { x: number; y: number };
  scale: number;
  onNavigate: (x: number, y: number) => void;
  viewportSize: { width: number; height: number };
  groupWidth?: number;
  groupHeight?: number;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 110;
const DEFAULT_GROUP_WIDTH = 460;
const DEFAULT_GROUP_HEIGHT = 320;
const MINIMAP_PADDING = 20;

export function MiniMap({
  groups,
  position,
  scale,
  onNavigate,
  viewportSize,
  groupWidth = DEFAULT_GROUP_WIDTH,
  groupHeight = DEFAULT_GROUP_HEIGHT,
}: MiniMapProps) {
  const { bounds, minimapScale } = useMemo(() => {
    if (groups.length === 0) {
      return {
        bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 800 },
        minimapScale: 0.02,
      };
    }

    const minX = Math.min(...groups.map((g) => g.position.x)) - MINIMAP_PADDING;
    const minY = Math.min(...groups.map((g) => g.position.y)) - MINIMAP_PADDING;
    const maxX = Math.max(...groups.map((g) => g.position.x + groupWidth)) + MINIMAP_PADDING;
    const maxY = Math.max(...groups.map((g) => g.position.y + groupHeight)) + MINIMAP_PADDING;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const scaleX = MINIMAP_WIDTH / contentWidth;
    const scaleY = MINIMAP_HEIGHT / contentHeight;
    const calcScale = Math.min(scaleX, scaleY, 0.1);

    return {
      bounds: { minX, minY, maxX, maxY },
      minimapScale: calcScale,
    };
  }, [groups, groupWidth, groupHeight]);

  const groupsInMinimap = useMemo(() => {
    return groups.map((group) => ({
      id: group.id,
      x: (group.position.x - bounds.minX) * minimapScale,
      y: (group.position.y - bounds.minY) * minimapScale,
      width: Math.max(6, groupWidth * minimapScale),
      height: Math.max(4, groupHeight * minimapScale),
      color: group.color,
    }));
  }, [groups, bounds, minimapScale, groupWidth, groupHeight]);

  const viewportRect = useMemo(() => {
    const worldViewWidth = viewportSize.width / scale;
    const worldViewHeight = viewportSize.height / scale;
    const worldX = -position.x / scale;
    const worldY = -position.y / scale;

    return {
      x: (worldX - bounds.minX) * minimapScale,
      y: (worldY - bounds.minY) * minimapScale,
      width: worldViewWidth * minimapScale,
      height: worldViewHeight * minimapScale,
    };
  }, [position, scale, viewportSize, bounds, minimapScale]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = clickX / minimapScale + bounds.minX;
    const worldY = clickY / minimapScale + bounds.minY;

    onNavigate(worldX, worldY);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div
        className="relative bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg cursor-crosshair overflow-hidden"
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        onClick={handleMinimapClick}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: `${20 * minimapScale}px ${20 * minimapScale}px`,
          }}
        />

        {groupsInMinimap.map((group) => (
          <div
            key={group.id}
            className="absolute rounded-sm transition-opacity"
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

        <div
          className="absolute border-2 border-primary bg-primary/10 rounded transition-all"
          style={{
            left: viewportRect.x,
            top: viewportRect.y,
            width: Math.max(10, viewportRect.width),
            height: Math.max(10, viewportRect.height),
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-xs text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <span className="text-xs text-muted-foreground">
          {groups.length} cluster{groups.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
